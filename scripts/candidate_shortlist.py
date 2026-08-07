#!/usr/bin/env python3
"""Build a manual-review candidate shortlist: one browsable table combining
several independent signals side by side, rather than a single ranked
verdict. Intended output is a small set of papers worth a human (or another
LLM) actually reading, not a systematically "correct" ranking.

Signals shown per candidate (all derived, no new API calls):
- FWCI / citation percentile: significance within the paper's own field.
- Field rarity: how many total generation -1 citers that field has across
  the full 1,032-work corpus — a low count means landing there at all is an
  unusual destination for a minimal-surfaces citation, independent of how
  significant the paper is within it.
- Same-field generation -2 solidification %: whether other work in the same
  field kept building on it (see rank_field_solidification.py) — one data
  point among several here, not the primary sort key.
- Abstract (OpenAlex) and tldr (Semantic Scholar, where the trial matched
  it): for a quick read on whether minimal-surface theory is actually
  central to the paper or just an incidental citation.

Filters out works with fewer than --min-citations (default 5) citations —
this also clears most of the indexing junk (bibliography/copyright-page
entries, Faculty Opinions blurbs) identified earlier.

Default sort is field rarity ascending (rarest destination fields first, to
surface unexpected jumps), tie-broken by FWCI descending — a scanning order,
not a significance verdict.

Writes:
- reports/candidate_shortlist_<seed_set>.md — browsable, abstract truncated.
- reports/candidate_shortlist_<seed_set>.csv — full untruncated abstract +
  tldr, for feeding to another LLM for field/centrality review.

Usage:
    uv run scripts/candidate_shortlist.py --seed-set osserman_forward_v1 --min-citations 5
"""

import argparse
import csv
import pathlib

from msl import db

PROJECT_ROOT = pathlib.Path(__file__).resolve().parents[1]
REPORTS = PROJECT_ROOT / "reports"


def load_shortlist_ids(path: pathlib.Path) -> list[str]:
    with path.open() as f:
        return [r["openalex_id"] for r in csv.DictReader(f) if r.get("openalex_id")]


def load_tldr_by_doi(path: pathlib.Path) -> dict[str, str]:
    if not path.exists():
        return {}
    with path.open() as f:
        return {r["doi"]: r["tldr"] for r in csv.DictReader(f) if r.get("doi") and r.get("tldr")}


def field_rarity(conn, seed_set_id: str) -> dict[str, int]:
    rows = conn.execute(
        """
        SELECT COALESCE(t.field_name, '(no field)') AS field, COUNT(*) AS n
        FROM seed_set_works s
        JOIN works w ON w.openalex_id = s.work_id
        LEFT JOIN work_topics wt ON wt.work_id = w.openalex_id AND wt.is_primary = 1
        LEFT JOIN topics t ON t.openalex_id = wt.topic_id
        WHERE s.seed_set_id = ? AND s.generation = -1
        GROUP BY field
        """,
        (seed_set_id,),
    ).fetchall()
    return {r["field"]: r["n"] for r in rows}


def gen2_same_field_stats(conn, seed_set_id: str, parent_id: str, own_field: str) -> tuple[int, int, float]:
    rows = conn.execute(
        """
        SELECT COALESCE(t.field_name, '(no field)') AS field, COUNT(*) AS n
        FROM work_references wr
        JOIN seed_set_works ssw ON ssw.work_id = wr.citing_work_id
            AND ssw.seed_set_id = ? AND ssw.generation = -2
        LEFT JOIN work_topics wt ON wt.work_id = wr.citing_work_id AND wt.is_primary = 1
        LEFT JOIN topics t ON t.openalex_id = wt.topic_id
        WHERE wr.cited_work_id = ?
        GROUP BY field
        """,
        (seed_set_id, parent_id),
    ).fetchall()
    by_field = {r["field"]: r["n"] for r in rows}
    total = sum(by_field.values())
    same = by_field.get(own_field, 0)
    return total, same, (same / total if total else 0.0)


def authors_of(conn, work_id: str) -> str:
    row = conn.execute(
        """
        SELECT group_concat(dn, ', ') FROM (
            SELECT a.display_name AS dn
            FROM work_authorships wa JOIN authors a ON a.openalex_id = wa.author_id
            WHERE wa.work_id = ?
            ORDER BY CASE wa.author_position WHEN 'first' THEN 0 WHEN 'middle' THEN 1 ELSE 2 END
            LIMIT 4
        )
        """,
        (work_id,),
    ).fetchone()
    return row[0] or ""


def identifier_link(doi, openalex_id):
    if doi:
        return f"[{doi}](https://doi.org/{doi})"
    if openalex_id:
        return f"[{openalex_id}](https://openalex.org/{openalex_id})"
    return ""


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--seed-set", default="osserman_forward_v1")
    p.add_argument("--shortlist", default=str(REPORTS / "top_by_field_osserman_forward_v1.csv"))
    p.add_argument("--tldr-csv", default=str(REPORTS / "semantic_scholar_trial_osserman_forward_shortlist.csv"))
    p.add_argument("--min-citations", type=int, default=5)
    p.add_argument("--db", default=db.DEFAULT_DB_PATH)
    args = p.parse_args()

    conn = db.connect(args.db)
    shortlist_ids = load_shortlist_ids(pathlib.Path(args.shortlist))
    tldr_by_doi = load_tldr_by_doi(pathlib.Path(args.tldr_csv))
    rarity = field_rarity(conn, args.seed_set)

    candidates = []
    for wid in shortlist_ids:
        w = conn.execute(
            "SELECT openalex_id, title, publication_year, doi, cited_by_count, fwci, "
            "citation_pctile, top_10_percent, abstract FROM works WHERE openalex_id = ?",
            (wid,),
        ).fetchone()
        if w is None or (w["cited_by_count"] or 0) < args.min_citations:
            continue
        field_row = conn.execute(
            """
            SELECT t.field_name FROM work_topics wt JOIN topics t ON t.openalex_id = wt.topic_id
            WHERE wt.work_id = ? AND wt.is_primary = 1
            """,
            (wid,),
        ).fetchone()
        own_field = field_row[0] if field_row else "(no field)"
        gen2_total, gen2_same, same_frac = gen2_same_field_stats(conn, args.seed_set, wid, own_field)
        candidates.append({
            "id": wid, "title": w["title"], "year": w["publication_year"], "doi": w["doi"],
            "authors": authors_of(conn, wid), "own_field": own_field,
            "field_rarity": rarity.get(own_field, 0),
            "cited_by_count": w["cited_by_count"], "fwci": w["fwci"],
            "citation_pctile": w["citation_pctile"], "top_10_percent": w["top_10_percent"],
            "gen2_total": gen2_total, "gen2_same_field": gen2_same, "same_field_fraction": same_frac,
            "abstract": w["abstract"] or "", "tldr": tldr_by_doi.get(w["doi"] or "", ""),
        })

    # Scanning order, not a verdict: rarest destination field first (surfaces
    # unexpected jumps), FWCI descending as tiebreak.
    candidates.sort(key=lambda c: (c["field_rarity"], -(c["fwci"] or 0)))

    lines = [
        f"# Candidate shortlist for manual review — {args.seed_set}",
        "",
        f"{len(candidates)} candidates (of {len(shortlist_ids)} in the FWCI top-6-per-field "
        f"shortlist) with >= {args.min_citations} citations. This is a scanning table, not a "
        "ranked verdict — several independent signals shown side by side (significance, field "
        "rarity, solidification) so you can pick candidates on your own judgment, including "
        "unexpected field jumps that wouldn't top any single metric.",
        "",
        "Default order: field rarity ascending (rarest destination field first, i.e. the most "
        "unusual jumps), FWCI descending as tiebreak.",
        "",
        "| Field (# in corpus) | Title | Year | Authors | FWCI | Top10%ile | Cites | Gen-2 same-field | Abstract/TLDR snippet | Identifier |",
        "|---|---|---|---|---:|:---:|---:|---:|---|---|",
    ]
    for c in candidates:
        fwci_str = f"{c['fwci']:.2f}" if c["fwci"] is not None else "—"
        top10 = "*" if c["top_10_percent"] else ""
        snippet = (c["abstract"] or c["tldr"] or "")[:180]
        gen2_str = f"{c['gen2_same_field']}/{c['gen2_total']} ({c['same_field_fraction']:.0%})" if c["gen2_total"] else "—"
        lines.append(
            f"| {c['own_field']} ({c['field_rarity']}) | {(c['title'] or '')[:50]} | {c['year']} "
            f"| {c['authors'][:30]} | {fwci_str} | {top10} | {c['cited_by_count']} | {gen2_str} "
            f"| {snippet} | {identifier_link(c['doi'], c['id'])} |"
        )

    md_path = REPORTS / f"candidate_shortlist_{args.seed_set}.md"
    md_path.write_text("\n".join(lines) + "\n")

    csv_path = REPORTS / f"candidate_shortlist_{args.seed_set}_full.csv"
    with csv_path.open("w", newline="") as f:
        wr = csv.writer(f)
        wr.writerow(["openalex_id", "title", "year", "authors", "doi", "own_field", "field_rarity",
                     "cited_by_count", "fwci", "citation_pctile", "top_10_percent",
                     "gen2_total", "gen2_same_field", "same_field_fraction", "abstract", "tldr"])
        for c in candidates:
            wr.writerow([c["id"], c["title"], c["year"], c["authors"], c["doi"], c["own_field"],
                         c["field_rarity"], c["cited_by_count"], c["fwci"], c["citation_pctile"],
                         c["top_10_percent"], c["gen2_total"], c["gen2_same_field"],
                         round(c["same_field_fraction"], 3), c["abstract"], c["tldr"]])

    print(f"Wrote {md_path}\nWrote {csv_path}")
    print(f"{len(candidates)}/{len(shortlist_ids)} pass the >= {args.min_citations}-citation floor")
    with_abstract = sum(1 for c in candidates if c["abstract"])
    with_tldr = sum(1 for c in candidates if c["tldr"])
    print(f"{with_abstract} have an OpenAlex abstract, {with_tldr} have an S2 tldr "
          f"(overlap not deduped in this count)")


if __name__ == "__main__":
    main()
