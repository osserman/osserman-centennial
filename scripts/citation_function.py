#!/usr/bin/env python3
"""Classify and analyze *why* descendants cite a foundational work.

Manages the `edge_annotations.citation_function` axis for the citing edges into a
seed set's generation-0 work(s). Controlled vocabulary: see
docs/citation_function_codes.md.

Three subcommands:

  worksheet  Export un-annotated (or all) citing edges to a CSV worksheet, with
             context columns and ordered by the citer's influence, for a human to
             fill in the citation_function column.

  import     Read a filled worksheet back into edge_annotations. Idempotent per
             edge: re-importing replaces that edge's citation-function annotation.
             Only rows with a non-empty citation_function are imported.

  report     Compute the distribution of citation functions (counts and % of the
             classified edges), plus how many remain unclassified — the
             "what fraction are pedagogical?" analysis. Writes a report to reports/.

This tool never touches raw evidence; it writes only to edge_annotations (human
interpretation). OpenAlex has no citation context, so classification is manual.

Usage:
    uv run scripts/citation_function.py worksheet --seed-set osserman_forward_v1
    uv run scripts/citation_function.py import --file <worksheet.csv>
    uv run scripts/citation_function.py report --seed-set osserman_forward_v1
"""

import argparse
import csv
import pathlib

from msl import db

PROJECT_ROOT = pathlib.Path(__file__).resolve().parents[1]
REPORTS = PROJECT_ROOT / "reports"

VALID_CODES = {
    "gateway_pedagogical", "classical_foundation", "specific_theorem",
    "historical_context", "weak_misc",
}

# CSV columns: the first two identify the edge and are read on import; the
# annotation columns are read on import; the rest are context to aid the human
# and are ignored on import.
ANNOTATION_COLS = ["citing_work_id", "cited_work_id", "citation_function", "rationale"]
CONTEXT_COLS = ["citer_title", "citer_year", "citer_field", "citer_subfield",
                "citer_type", "citer_cited_by_count"]


def gen0_works(conn, seed_set_id):
    return [r[0] for r in conn.execute(
        "SELECT work_id FROM seed_set_works WHERE seed_set_id=? AND generation=0",
        (seed_set_id,))]


def citing_edges(conn, seed_set_id):
    """Edges (citer -> gen0 work) where the citer belongs to the seed set at a
    forward (negative) generation. Existing annotations are looked up separately
    via _existing_annotation()."""
    return conn.execute(
        """
        SELECT r.citing_work_id, r.cited_work_id,
               w.title, w.publication_year, w.type, w.cited_by_count,
               (SELECT t.field_name FROM work_topics wt JOIN topics t ON t.openalex_id=wt.topic_id
                 WHERE wt.work_id=r.citing_work_id AND wt.is_primary=1 LIMIT 1) AS field,
               (SELECT t.subfield_name FROM work_topics wt JOIN topics t ON t.openalex_id=wt.topic_id
                 WHERE wt.work_id=r.citing_work_id AND wt.is_primary=1 LIMIT 1) AS subfield
        FROM work_references r
        JOIN works w ON w.openalex_id = r.citing_work_id
        JOIN seed_set_works s ON s.work_id = r.citing_work_id AND s.seed_set_id = ?
        WHERE r.cited_work_id IN (SELECT work_id FROM seed_set_works
                                  WHERE seed_set_id=? AND generation=0)
          AND s.generation < 0
        ORDER BY w.cited_by_count DESC
        """,
        (seed_set_id, seed_set_id),
    ).fetchall()


def _existing_annotation(conn, citing, cited):
    return conn.execute(
        "SELECT citation_function, rationale FROM edge_annotations "
        "WHERE citing_work_id=? AND cited_work_id=? AND citation_function IS NOT NULL "
        "ORDER BY id DESC LIMIT 1",
        (citing, cited),
    ).fetchone()


def cmd_worksheet(conn, args):
    seed = args.seed_set
    edges = citing_edges(conn, seed)
    out = REPORTS / f"citation_function_worksheet_{seed}.csv"
    n = 0
    with out.open("w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(ANNOTATION_COLS + CONTEXT_COLS)
        for e in edges:
            ann = _existing_annotation(conn, e["citing_work_id"], e["cited_work_id"])
            cf = ann[0] if ann else ""
            rat = ann[1] if ann else ""
            if args.only_unclassified and cf:
                continue
            writer.writerow([
                e["citing_work_id"], e["cited_work_id"], cf, rat,
                (e["title"] or "")[:120], e["publication_year"], e["field"],
                e["subfield"], e["type"], e["cited_by_count"],
            ])
            n += 1
    print(f"Wrote {out} with {n} edges to classify.")
    print("Valid citation_function codes:", ", ".join(sorted(VALID_CODES)))
    print("See docs/citation_function_codes.md.")


def cmd_import(conn, args):
    path = pathlib.Path(args.file)
    imported, skipped, bad = 0, 0, []
    with path.open(newline="") as f:
        for row in csv.DictReader(f):
            cf = (row.get("citation_function") or "").strip()
            if not cf:
                skipped += 1
                continue
            if cf not in VALID_CODES:
                bad.append(cf)
                continue
            citing, cited = row["citing_work_id"].strip(), row["cited_work_id"].strip()
            # Idempotent: drop any prior citation-function annotation for this edge.
            conn.execute(
                "DELETE FROM edge_annotations WHERE citing_work_id=? AND cited_work_id=? "
                "AND citation_function IS NOT NULL",
                (citing, cited),
            )
            conn.execute(
                "INSERT INTO edge_annotations (citing_work_id, cited_work_id, "
                "citation_function, rationale, reviewer, review_date) VALUES (?, ?, ?, ?, ?, ?)",
                (citing, cited, cf, (row.get("rationale") or "").strip() or None,
                 args.reviewer, db.now_utc()),
            )
            imported += 1
    conn.commit()
    print(f"Imported {imported} annotations; skipped {skipped} blank rows.")
    if bad:
        print(f"WARNING: {len(bad)} rows had invalid codes (not imported): {sorted(set(bad))}")


def _distribution(conn, seed_set_id, field_group=None):
    """Citation-function counts for forward edges into the seed's gen-0 work(s).
    field_group: None = all; 'math' = citer primary field is Mathematics;
    'nonmath' = anything else (including citers with no primary field)."""
    where_group = ""
    if field_group == "math":
        where_group = "AND pf.field_name = 'Mathematics'"
    elif field_group == "nonmath":
        where_group = "AND (pf.field_name IS NULL OR pf.field_name <> 'Mathematics')"
    return conn.execute(
        f"""
        SELECT COALESCE(ea.citation_function, '(unclassified)') AS cf, COUNT(*) AS n
        FROM work_references r
        JOIN seed_set_works s ON s.work_id=r.citing_work_id AND s.seed_set_id=? AND s.generation<0
        LEFT JOIN edge_annotations ea
               ON ea.citing_work_id=r.citing_work_id AND ea.cited_work_id=r.cited_work_id
              AND ea.citation_function IS NOT NULL
        LEFT JOIN (
            SELECT wt.work_id, t.field_name FROM work_topics wt
            JOIN topics t ON t.openalex_id=wt.topic_id WHERE wt.is_primary=1
        ) pf ON pf.work_id = r.citing_work_id
        WHERE r.cited_work_id IN (SELECT work_id FROM seed_set_works
                                  WHERE seed_set_id=? AND generation=0)
        {where_group}
        GROUP BY cf ORDER BY n DESC
        """,
        (seed_set_id, seed_set_id),
    ).fetchall()


def _section(dist, title):
    total = sum(r["n"] for r in dist)
    classified = sum(r["n"] for r in dist if r["cf"] != "(unclassified)")
    lines = [
        f"## {title}",
        "",
        f"Edges: **{total}** · classified: **{classified}** · unclassified: **{total - classified}**. "
        "Percentages are of classified edges.",
        "",
        "| Citation function | Count | % of classified |",
        "|-------------------|------:|----------------:|",
    ]
    for r in dist:
        if r["cf"] == "(unclassified)":
            continue
        pct = f"{100 * r['n'] / classified:.1f}%" if classified else "—"
        lines.append(f"| {r['cf']} | {r['n']} | {pct} |")
    if classified == 0:
        lines.append("| _(none classified yet)_ | 0 | — |")
    lines.append("")
    return lines, total, classified


def cmd_report(conn, args):
    seed = args.seed_set
    all_dist = _distribution(conn, seed, None)
    math_dist = _distribution(conn, seed, "math")
    nonmath_dist = _distribution(conn, seed, "nonmath")

    lines = [
        f"# Citation-function distribution — {seed}",
        "",
        "Why do descendants cite the seed work? Codes: see docs/citation_function_codes.md.",
        "Field split uses each citer's OpenAlex primary-topic field (noisy for older",
        "works — some pure-math works are mislabeled non-math; treat as approximate).",
        "",
    ]
    for dist, title in [(all_dist, "All citers"),
                        (nonmath_dist, "Non-mathematics citers (cross-disciplinary)"),
                        (math_dist, "Mathematics citers")]:
        sec, _, _ = _section(dist, title)
        lines += sec
    out = REPORTS / f"citation_function_{seed}.md"
    out.write_text("\n".join(lines) + "\n")

    a_total = sum(r["n"] for r in all_dist)
    a_class = sum(r["n"] for r in all_dist if r["cf"] != "(unclassified)")
    print(f"Wrote {out}")
    print(f"Classified {a_class}/{a_total} citing edges (all).")
    for r in all_dist:
        print(f"  {r['cf']:20} {r['n']}")


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--db", default=db.DEFAULT_DB_PATH)
    sub = p.add_subparsers(dest="cmd", required=True)

    w = sub.add_parser("worksheet", help="export edges to classify")
    w.add_argument("--seed-set", required=True)
    w.add_argument("--only-unclassified", action="store_true",
                   help="omit edges that already have a citation_function")

    i = sub.add_parser("import", help="import a filled worksheet")
    i.add_argument("--file", required=True)
    i.add_argument("--reviewer", default=None)

    r = sub.add_parser("report", help="report the citation-function distribution")
    r.add_argument("--seed-set", required=True)

    args = p.parse_args()
    conn = db.connect(args.db)
    {"worksheet": cmd_worksheet, "import": cmd_import, "report": cmd_report}[args.cmd](conn, args)


if __name__ == "__main__":
    main()
