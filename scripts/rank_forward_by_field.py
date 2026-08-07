#!/usr/bin/env python3
"""Rank the citers of a forward seed set by field: top-N most-cited works in each
OpenAlex primary field.

Derived analysis over the database (no API calls) — a systematic version of the
"top papers from a variety of fields" survey. For a forward seed set (citers at
generation -1), it groups the citers by their OpenAlex primary-topic field,
orders fields by how many citers they contribute, and lists the top N works
within each field, ranked by FWCI (field-weighted citation impact) by default
— a field/year-normalized measure, since raw citation counts favor large
fields (Engineering) over small ones (Geodesy) regardless of actual influence.
Pass --rank-by cited_by_count for the old raw-count ordering. Regenerable;
writes reports/top_by_field_<seed_set>.md and .csv.

Field labels are OpenAlex's automated `primary_topic` and are noisy for older or
borderline works (a pure-math textbook can land under "Computer Science") — treat
the field grouping as a hint, verify before curating.

Usage:
    uv run scripts/rank_forward_by_field.py --seed-set osserman_forward_v1 --per-field 6
"""

import argparse
import csv
import pathlib

from msl import db

PROJECT_ROOT = pathlib.Path(__file__).resolve().parents[1]
REPORTS = PROJECT_ROOT / "reports"


def identifier_link(doi, openalex_id):
    """Prefer a clickable DOI (best for searching); fall back to the OpenAlex ID.
    Link text is the bare identifier so it is also easy to copy."""
    if doi:
        return f"[{doi}](https://doi.org/{doi})"
    if openalex_id:
        return f"[{openalex_id}](https://openalex.org/{openalex_id})"
    return ""


def citers_with_field(conn, seed_set_id, rank_by):
    order_col = "w.fwci" if rank_by == "fwci" else "w.cited_by_count"
    return conn.execute(
        f"""
        SELECT w.openalex_id, w.title, w.publication_year, w.type, w.cited_by_count, w.doi,
               w.fwci, w.top_10_percent,
               COALESCE(pf.field_name, '(no field)') AS field,
               COALESCE(pf.subfield_name, '') AS subfield,
               (SELECT group_concat(dn, ', ') FROM (
                    SELECT a.display_name AS dn
                    FROM work_authorships wa JOIN authors a ON a.openalex_id = wa.author_id
                    WHERE wa.work_id = w.openalex_id
                    ORDER BY CASE wa.author_position WHEN 'first' THEN 0
                             WHEN 'middle' THEN 1 ELSE 2 END
                    LIMIT 3)) AS authors
        FROM seed_set_works s
        JOIN works w ON w.openalex_id = s.work_id
        LEFT JOIN (
            SELECT wt.work_id, t.field_name, t.subfield_name
            FROM work_topics wt JOIN topics t ON t.openalex_id = wt.topic_id
            WHERE wt.is_primary = 1
        ) pf ON pf.work_id = w.openalex_id
        WHERE s.seed_set_id = ? AND s.generation = -1
        ORDER BY {order_col} IS NULL, {order_col} DESC, w.cited_by_count DESC
        """,
        (seed_set_id,),
    ).fetchall()


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--seed-set", default="osserman_forward_v1")
    p.add_argument("--per-field", type=int, default=6, help="top works to show per field")
    p.add_argument(
        "--rank-by", choices=["fwci", "cited_by_count"], default="fwci",
        help="fwci (field-weighted citation impact, normalized within field/year/type; "
             "default) or raw cited_by_count, which favors large fields like Engineering",
    )
    p.add_argument("--db", default=db.DEFAULT_DB_PATH)
    args = p.parse_args()

    conn = db.connect(args.db)
    rows = citers_with_field(conn, args.seed_set, args.rank_by)

    by_field = {}
    for r in rows:
        by_field.setdefault(r["field"], []).append(r)
    # Order fields by number of citers (largest first).
    fields_sorted = sorted(by_field.items(), key=lambda kv: len(kv[1]), reverse=True)

    rank_label = "FWCI" if args.rank_by == "fwci" else "Cited by"

    def fwci_str(r):
        if r["fwci"] is None:
            return "—"
        star = "*" if r["top_10_percent"] else ""
        return f"{r['fwci']:.2f}{star}"

    lines = [
        f"# Top citers by field — {args.seed_set}",
        "",
        f"The {len(rows)} citers of the seed work, grouped by OpenAlex primary field; "
        f"top {args.per_field} per field ranked by {rank_label}.",
        "",
        "Field labels are automated and noisy for older/borderline works (e.g. a math",
        "textbook may appear under Computer Science) — verify before curating.",
        "",
        "Ranked by **FWCI** (field-weighted citation impact: 1.0 = average for the same",
        "field/year/work-type; `*` = in the top 10% for its field/year), not raw citation",
        "count — raw counts favor large fields (Engineering) over small ones (Geodesy)",
        "regardless of actual influence. `—` = fwci not available (usually a stub work);",
        "those rows fall back to citation-count order.",
        "",
        "| Field (citers) | FWCI | Cited by | Year | Subfield | Authors | Title | Identifier |",
        "|----------------|-----:|---------:|------|----------|---------|-------|------------|",
    ]
    for field, items in fields_sorted:
        head = f"**{field}** ({len(items)})"
        for i, r in enumerate(items[: args.per_field]):
            lines.append(
                f"| {head if i == 0 else ''} | {fwci_str(r)} | {r['cited_by_count']} | {r['publication_year']} "
                f"| {(r['subfield'] or '')[:22]} | {(r['authors'] or '')[:34]} | {(r['title'] or '')[:58]} "
                f"| {identifier_link(r['doi'], r['openalex_id'])} |"
            )
    md = REPORTS / f"top_by_field_{args.seed_set}.md"
    md.write_text("\n".join(lines) + "\n")

    csv_path = REPORTS / f"top_by_field_{args.seed_set}.csv"
    with csv_path.open("w", newline="") as f:
        wr = csv.writer(f)
        wr.writerow(["field", "field_rank_in_field", "openalex_id", "title", "year",
                     "type", "fwci", "top_10_percent", "cited_by_count", "subfield", "authors", "doi"])
        for field, items in fields_sorted:
            for i, r in enumerate(items[: args.per_field]):
                wr.writerow([field, i + 1, r["openalex_id"], r["title"], r["publication_year"],
                             r["type"], r["fwci"], r["top_10_percent"], r["cited_by_count"],
                             r["subfield"], r["authors"], r["doi"]])

    print(f"Wrote {md}\nWrote {csv_path}")
    print(f"\n{len(rows)} citers across {len(by_field)} fields:")
    for field, items in fields_sorted:
        print(f"  {len(items):4}  {field}")


if __name__ == "__main__":
    main()
