#!/usr/bin/env python3
"""Export the osserman_forward_v1 generation 0 + generation -1 subgraph (the
seed work and its 1,032 direct citers) to static JSON for the Svelte
scrollytelling prototype in viz/.

Deliberately excludes generation -2 (the second-gen forward harvest) — the
visualization's MVP scope is just the direct citers, matching the narrative's
"1,000+ citations" framing; see scrollytelling-project-context.md.

Writes two files into viz/static/data/:
- graph_raw.json: nodes (attributes only, no layout coordinates — those are
  computed separately by viz/scripts/compute-layout.mjs) and edges (citer ->
  seed).
- curated_papers.json: the papers named in scrollytelling-draft-texts.md,
  hardcoded by openalex_id (already cross-referenced against
  reports/top_by_field_osserman_forward_v1.csv), each tagged with its
  narrative section and reinterpretation pathway. These field/pathway
  groupings are editorial choices from the draft text, not derived from
  OpenAlex data, so they're authored here rather than computed.

Usage:
    uv run scripts/export_viz_data.py --seed-set osserman_forward_v1
"""

import argparse
import json
import pathlib

from msl import db

PROJECT_ROOT = pathlib.Path(__file__).resolve().parents[1]
VIZ_DATA = PROJECT_ROOT / "viz" / "static" / "data"

# Curated papers named in scrollytelling-draft-texts.md, resolved against
# reports/top_by_field_osserman_forward_v1.csv (see the approved plan for the
# cross-reference). "section" = the by-field narrative section; "pathway" =
# the reinterpretation grouping ("hidden_structure" / "design_language" /
# "computational_tool" / "physical_theory").
CURATED_PAPERS = [
    {"id": "W2120559167", "section": "engineering", "pathway": "design_language"},
    {"id": "W2943941736", "section": "engineering", "pathway": "design_language"},
    {"id": "W2044735577", "section": "materials_science", "pathway": "hidden_structure"},
    {"id": "W2002021482", "section": "materials_science", "pathway": "design_language"},
    {"id": "W2169776346", "section": "biology", "pathway": "hidden_structure"},
    {"id": "W2612605708", "section": "biology", "pathway": "hidden_structure"},
    {"id": "W2999050204", "section": "biology", "pathway": "hidden_structure"},
    {"id": "W2112838653", "section": "biology", "pathway": "hidden_structure"},
    {"id": "W2151783599", "section": "computer_science", "pathway": "computational_tool"},
    {"id": "W3026088860", "section": "computer_science", "pathway": "computational_tool"},
    {"id": "W2034409564", "section": "physics", "pathway": "physical_theory"},
    {"id": "W2002168123", "section": "physics", "pathway": "physical_theory"},
]


def fetch_nodes(conn, seed_set_id):
    rows = conn.execute(
        """
        SELECT w.openalex_id, w.title, w.publication_year, w.publication_date, w.doi, w.cited_by_count,
               w.fwci, w.citation_pctile, w.top_10_percent, w.abstract, w.type AS work_type,
               w.cited_by_pctile_year_min, w.cited_by_pctile_year_max,
               s.generation,
               COALESCE(t.field_name, '(no field)') AS field,
               COALESCE(t.subfield_name, '') AS subfield,
               COALESCE(t.topic_name, '') AS topic,
               src.display_name AS venue,
               (SELECT group_concat(dn, ', ') FROM (
                    SELECT a.display_name AS dn
                    FROM work_authorships wa JOIN authors a ON a.openalex_id = wa.author_id
                    WHERE wa.work_id = w.openalex_id
                    ORDER BY CASE wa.author_position WHEN 'first' THEN 0
                             WHEN 'middle' THEN 1 ELSE 2 END
                    LIMIT 3)) AS authors,
               (SELECT group_concat(DISTINCT i.display_name)
                    FROM work_authorships wa JOIN institutions i ON i.openalex_id = wa.institution_id
                    WHERE wa.work_id = w.openalex_id) AS institutions,
               (SELECT group_concat(DISTINCT i.country_code)
                    FROM work_authorships wa JOIN institutions i ON i.openalex_id = wa.institution_id
                    WHERE wa.work_id = w.openalex_id) AS countries
        FROM seed_set_works s
        JOIN works w ON w.openalex_id = s.work_id
        LEFT JOIN (
            SELECT wt.work_id, t.field_name, t.subfield_name, t.display_name AS topic_name
            FROM work_topics wt JOIN topics t ON t.openalex_id = wt.topic_id
            WHERE wt.is_primary = 1
        ) t ON t.work_id = w.openalex_id
        LEFT JOIN sources src ON src.openalex_id = w.source_id
        WHERE s.seed_set_id = ? AND s.generation IN (0, -1)
        """,
        (seed_set_id,),
    ).fetchall()

    nodes = []
    for r in rows:
        ymin, ymax = r["cited_by_pctile_year_min"], r["cited_by_pctile_year_max"]
        year_pctile = (ymin + ymax) / 2 if ymin is not None and ymax is not None else None
        nodes.append({
            "id": r["openalex_id"],
            "title": r["title"],
            "year": r["publication_year"],
            "publicationDate": r["publication_date"],
            "doi": r["doi"],
            "authors": r["authors"] or "",
            "citedByCount": r["cited_by_count"],
            "fwci": r["fwci"],
            "citationPctile": r["citation_pctile"],
            "citedByPctileYear": year_pctile,
            "top10Percent": bool(r["top_10_percent"]),
            "abstract": r["abstract"] or "",
            "workType": r["work_type"] or "",
            "field": r["field"],
            "subfield": r["subfield"],
            "topic": r["topic"],
            "venue": r["venue"] or "",
            "institutions": (r["institutions"] or "").split(",") if r["institutions"] else [],
            "countries": (r["countries"] or "").split(",") if r["countries"] else [],
            "isSeed": r["generation"] == 0,
        })
    return nodes


def fetch_edges(conn, seed_set_id, seed_id):
    rows = conn.execute(
        """
        SELECT DISTINCT wr.citing_work_id, wr.cited_work_id
        FROM work_references wr
        JOIN seed_set_works s ON s.work_id = wr.citing_work_id
            AND s.seed_set_id = ? AND s.generation = -1
        WHERE wr.cited_work_id = ?
        """,
        (seed_set_id, seed_id),
    ).fetchall()
    return [{"source": r["citing_work_id"], "target": r["cited_work_id"]} for r in rows]


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--seed-set", default="osserman_forward_v1")
    p.add_argument("--db", default=db.DEFAULT_DB_PATH)
    args = p.parse_args()

    conn = db.connect(args.db)
    seed_row = conn.execute(
        "SELECT work_id FROM seed_set_works WHERE seed_set_id = ? AND generation = 0",
        (args.seed_set,),
    ).fetchone()
    if seed_row is None:
        raise SystemExit(f"No generation-0 seed found for seed set {args.seed_set!r}")
    seed_id = seed_row["work_id"]

    nodes = fetch_nodes(conn, args.seed_set)
    edges = fetch_edges(conn, args.seed_set, seed_id)

    node_ids = {n["id"] for n in nodes}
    missing_curated = [c["id"] for c in CURATED_PAPERS if c["id"] not in node_ids]
    if missing_curated:
        raise SystemExit(f"Curated paper IDs not found in the exported node set: {missing_curated}")

    VIZ_DATA.mkdir(parents=True, exist_ok=True)
    (VIZ_DATA / "graph_raw.json").write_text(
        json.dumps({"seedId": seed_id, "nodes": nodes, "edges": edges}, ensure_ascii=False, indent=1)
    )
    (VIZ_DATA / "curated_papers.json").write_text(
        json.dumps(CURATED_PAPERS, ensure_ascii=False, indent=1)
    )

    print(f"Wrote {VIZ_DATA / 'graph_raw.json'}: {len(nodes)} nodes, {len(edges)} edges")
    print(f"Wrote {VIZ_DATA / 'curated_papers.json'}: {len(CURATED_PAPERS)} curated papers, all resolved")


if __name__ == "__main__":
    main()
