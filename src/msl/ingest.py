"""Normalize OpenAlex work JSON into the raw-evidence tables.

Ingest is idempotent: re-ingesting a work replaces its row and all of its child
rows (authorships, concepts, topics, outgoing reference edges) with the fresh
data. Referenced works that are not yet in the database are created as stubs
(is_stub = 1) so the citation graph stays closed under foreign keys.
"""

from __future__ import annotations

import json
import sqlite3


def strip_prefix(openalex_url: str | None) -> str | None:
    """'https://openalex.org/W123' -> 'W123'."""
    if not openalex_url:
        return None
    return openalex_url.rsplit("/", 1)[-1]


def strip_doi(doi_url: str | None) -> str | None:
    """'https://doi.org/10.X/Y' -> '10.x/y'."""
    if not doi_url:
        return None
    return doi_url.removeprefix("https://doi.org/").lower()


def reconstruct_abstract(inverted_index: dict | None) -> str | None:
    """OpenAlex ships abstracts as {word: [positions]}; rebuild the text."""
    if not inverted_index:
        return None
    positions: list[tuple[int, str]] = []
    for word, idxs in inverted_index.items():
        for idx in idxs:
            positions.append((idx, word))
    positions.sort()
    return " ".join(word for _, word in positions)


def ensure_stub_work(conn: sqlite3.Connection, work_id: str) -> None:
    conn.execute(
        "INSERT OR IGNORE INTO works (openalex_id, is_stub) VALUES (?, 1)", (work_id,)
    )


def ingest_work(conn: sqlite3.Connection, work: dict, harvested_at: str) -> str:
    """Ingest one full OpenAlex work JSON. Returns the bare work ID."""
    work_id = strip_prefix(work["id"])

    source = (work.get("primary_location") or {}).get("source") or {}
    source_id = strip_prefix(source.get("id"))
    if source_id:
        _upsert_source(conn, source, harvested_at)

    conn.execute(
        """
        INSERT INTO works (openalex_id, doi, title, publication_year, publication_date,
                           source_id, type, language, abstract, cited_by_count,
                           is_open_access, is_stub, source_json, harvested_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
        ON CONFLICT(openalex_id) DO UPDATE SET
            doi = excluded.doi,
            title = excluded.title,
            publication_year = excluded.publication_year,
            publication_date = excluded.publication_date,
            source_id = excluded.source_id,
            type = excluded.type,
            language = excluded.language,
            abstract = excluded.abstract,
            cited_by_count = excluded.cited_by_count,
            is_open_access = excluded.is_open_access,
            is_stub = 0,
            source_json = excluded.source_json,
            harvested_at = excluded.harvested_at
        """,
        (
            work_id,
            strip_doi(work.get("doi")),
            work.get("title") or work.get("display_name"),
            work.get("publication_year"),
            work.get("publication_date"),
            source_id,
            work.get("type"),
            work.get("language"),
            reconstruct_abstract(work.get("abstract_inverted_index")),
            work.get("cited_by_count"),
            int(bool((work.get("open_access") or {}).get("is_oa"))),
            json.dumps(work, ensure_ascii=False),
            harvested_at,
        ),
    )

    _ingest_authorships(conn, work_id, work.get("authorships") or [], harvested_at)
    _ingest_concepts(conn, work_id, work.get("concepts") or [])
    _ingest_topics(conn, work_id, work)
    _ingest_references(conn, work_id, work.get("referenced_works") or [])
    return work_id


# --------------------------------------------------------------------- helpers


def _upsert_source(conn: sqlite3.Connection, source: dict, harvested_at: str) -> None:
    """Upsert a dehydrated venue record embedded in a work JSON."""
    conn.execute(
        """
        INSERT INTO sources (openalex_id, display_name, publisher, issn,
                             is_open_access, source_json, harvested_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(openalex_id) DO UPDATE SET
            display_name = excluded.display_name,
            publisher = excluded.publisher,
            issn = excluded.issn,
            is_open_access = excluded.is_open_access,
            source_json = excluded.source_json,
            harvested_at = excluded.harvested_at
        """,
        (
            strip_prefix(source["id"]),
            source.get("display_name"),
            source.get("host_organization_name"),
            json.dumps(source.get("issn")) if source.get("issn") else None,
            int(bool(source.get("is_oa"))),
            json.dumps(source, ensure_ascii=False),
            harvested_at,
        ),
    )


def _ingest_authorships(
    conn: sqlite3.Connection, work_id: str, authorships: list[dict], harvested_at: str
) -> None:
    conn.execute("DELETE FROM work_authorships WHERE work_id = ?", (work_id,))
    for auth in authorships:
        author = auth.get("author") or {}
        author_id = strip_prefix(author.get("id"))
        if not author_id:
            continue
        # Dehydrated author record; enrich_author() can fill counts later.
        conn.execute(
            """
            INSERT INTO authors (openalex_id, display_name, orcid)
            VALUES (?, ?, ?)
            ON CONFLICT(openalex_id) DO UPDATE SET
                display_name = excluded.display_name,
                orcid = COALESCE(excluded.orcid, authors.orcid)
            """,
            (author_id, author.get("display_name"), strip_prefix(author.get("orcid"))),
        )
        institutions = auth.get("institutions") or [None]
        raw_aff = "; ".join(auth.get("raw_affiliation_strings") or []) or None
        for inst in institutions:
            inst_id = None
            if inst:
                inst_id = strip_prefix(inst.get("id"))
                if inst_id:
                    conn.execute(
                        """
                        INSERT INTO institutions (openalex_id, display_name, country_code,
                                                  institution_type, ror, harvested_at)
                        VALUES (?, ?, ?, ?, ?, ?)
                        ON CONFLICT(openalex_id) DO UPDATE SET
                            display_name = excluded.display_name,
                            country_code = excluded.country_code,
                            institution_type = excluded.institution_type,
                            ror = excluded.ror
                        """,
                        (
                            inst_id,
                            inst.get("display_name"),
                            inst.get("country_code"),
                            inst.get("type"),
                            inst.get("ror"),
                            harvested_at,
                        ),
                    )
            conn.execute(
                """
                INSERT OR IGNORE INTO work_authorships
                    (work_id, author_id, institution_id, author_position,
                     is_corresponding, raw_affiliation_string)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    work_id,
                    author_id,
                    inst_id,
                    auth.get("author_position"),
                    int(bool(auth.get("is_corresponding"))),
                    raw_aff,
                ),
            )


def _ingest_concepts(conn: sqlite3.Connection, work_id: str, concepts: list[dict]) -> None:
    conn.execute("DELETE FROM work_concepts WHERE work_id = ?", (work_id,))
    for c in concepts:
        concept_id = strip_prefix(c.get("id"))
        if not concept_id:
            continue
        conn.execute(
            """
            INSERT INTO concepts (openalex_id, display_name, level, wikidata)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(openalex_id) DO UPDATE SET
                display_name = excluded.display_name,
                level = excluded.level,
                wikidata = excluded.wikidata
            """,
            (concept_id, c.get("display_name"), c.get("level"), c.get("wikidata")),
        )
        conn.execute(
            "INSERT OR REPLACE INTO work_concepts (work_id, concept_id, score) VALUES (?, ?, ?)",
            (work_id, concept_id, c.get("score")),
        )


def _ingest_topics(conn: sqlite3.Connection, work_id: str, work: dict) -> None:
    conn.execute("DELETE FROM work_topics WHERE work_id = ?", (work_id,))
    primary_id = strip_prefix((work.get("primary_topic") or {}).get("id"))
    for t in work.get("topics") or []:
        topic_id = strip_prefix(t.get("id"))
        if not topic_id:
            continue
        subfield = t.get("subfield") or {}
        field = t.get("field") or {}
        domain = t.get("domain") or {}
        conn.execute(
            """
            INSERT INTO topics (openalex_id, display_name, subfield_id, subfield_name,
                                field_id, field_name, domain_id, domain_name)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(openalex_id) DO UPDATE SET
                display_name = excluded.display_name,
                subfield_id = excluded.subfield_id,
                subfield_name = excluded.subfield_name,
                field_id = excluded.field_id,
                field_name = excluded.field_name,
                domain_id = excluded.domain_id,
                domain_name = excluded.domain_name
            """,
            (
                topic_id,
                t.get("display_name"),
                strip_prefix(subfield.get("id")),
                subfield.get("display_name"),
                strip_prefix(field.get("id")),
                field.get("display_name"),
                strip_prefix(domain.get("id")),
                domain.get("display_name"),
            ),
        )
        conn.execute(
            "INSERT OR REPLACE INTO work_topics (work_id, topic_id, score, is_primary) "
            "VALUES (?, ?, ?, ?)",
            (work_id, topic_id, t.get("score"), int(topic_id == primary_id)),
        )


def _ingest_references(
    conn: sqlite3.Connection, work_id: str, referenced_works: list[str]
) -> None:
    conn.execute("DELETE FROM work_references WHERE citing_work_id = ?", (work_id,))
    for ref_url in referenced_works:
        ref_id = strip_prefix(ref_url)
        if not ref_id:
            continue
        ensure_stub_work(conn, ref_id)
        conn.execute(
            "INSERT OR IGNORE INTO work_references (citing_work_id, cited_work_id) VALUES (?, ?)",
            (work_id, ref_id),
        )


def enrich_author(conn: sqlite3.Connection, author: dict, harvested_at: str) -> None:
    """Store a full /authors record (counts + raw JSON) over the dehydrated row."""
    conn.execute(
        """
        INSERT INTO authors (openalex_id, display_name, orcid, works_count,
                             cited_by_count, source_json, harvested_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(openalex_id) DO UPDATE SET
            display_name = excluded.display_name,
            orcid = COALESCE(excluded.orcid, authors.orcid),
            works_count = excluded.works_count,
            cited_by_count = excluded.cited_by_count,
            source_json = excluded.source_json,
            harvested_at = excluded.harvested_at
        """,
        (
            strip_prefix(author["id"]),
            author.get("display_name"),
            strip_prefix(author.get("orcid")),
            author.get("works_count"),
            author.get("cited_by_count"),
            json.dumps(author, ensure_ascii=False),
            harvested_at,
        ),
    )
