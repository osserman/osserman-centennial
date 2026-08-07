#!/usr/bin/env python3
"""For each generation -1 branch paper (a citer of the root seed), summarize
what fields its own citers (generation -2) land in — the "which branches spin
off into which fields" view that harvest_forward_gen2.py's data was collected
for.

Derived analysis over the database (no API calls). A branch paper whose
generation -2 citers land heavily outside the branch paper's own field is
evidence that paper is itself a gateway into a *new* offshoot field, distinct
from just propagating within its own discipline.

CAVEAT baked into the report: "own field" is OpenAlex's noisy primary_topic
label, so a mislabeled branch paper (e.g. a math textbook tagged Computer
Science) will show ordinary same-field citations as a false cross-field
spin-off — verify a branch's own field before trusting its rank.

Usage:
    uv run scripts/rank_spinoff_fields.py --seed-set osserman_forward_v1
"""

import argparse
import csv
import pathlib

from msl import db

PROJECT_ROOT = pathlib.Path(__file__).resolve().parents[1]
REPORTS = PROJECT_ROOT / "reports"


def parent_field(conn, work_id):
    row = conn.execute(
        """
        SELECT t.field_name FROM work_topics wt
        JOIN topics t ON t.openalex_id = wt.topic_id
        WHERE wt.work_id = ? AND wt.is_primary = 1
        """,
        (work_id,),
    ).fetchone()
    return row[0] if row else None


def gen1_parents(conn, seed_set_id, shortlist_ids):
    # Restricted to the shortlist actually expanded by harvest_forward_gen2.py.
    # For gen-1 works outside that shortlist, work_references may still contain
    # incidental edges into them (spillover from a harvested gen-2 work's own
    # reference list happening to cite them) — that's a biased partial sample,
    # not a systematic citer count, so those parents are excluded here rather
    # than shown with a misleadingly small "gen-2 citers" number.
    placeholders = ",".join("?" * len(shortlist_ids))
    return conn.execute(
        f"""
        SELECT w.openalex_id, w.title, w.publication_year, w.cited_by_count, w.fwci, w.doi
        FROM seed_set_works s JOIN works w ON w.openalex_id = s.work_id
        WHERE s.seed_set_id = ? AND s.generation = -1 AND w.openalex_id IN ({placeholders})
        """,
        (seed_set_id, *shortlist_ids),
    ).fetchall()


def gen2_fields_for_parent(conn, seed_set_id, parent_id):
    # Restrict citing_work_id to works whose *nearest* generation in this seed
    # set is -2 (true gen-2 harvested by harvest_forward_gen2.py). Without this,
    # work_references also contains edges from the gen-1 works' own reference
    # lists (ingested when they were originally fully harvested) cross-citing
    # each other — those are gen-1<->gen-1 edges, not new gen-2 works, and would
    # otherwise inflate every branch's count.
    return conn.execute(
        """
        SELECT COALESCE(t.field_name, '(no field)') AS field, COUNT(*) AS n
        FROM work_references wr
        JOIN seed_set_works ssw ON ssw.work_id = wr.citing_work_id
            AND ssw.seed_set_id = ? AND ssw.generation = -2
        JOIN works w ON w.openalex_id = wr.citing_work_id
        LEFT JOIN work_topics wt ON wt.work_id = w.openalex_id AND wt.is_primary = 1
        LEFT JOIN topics t ON t.openalex_id = wt.topic_id
        WHERE wr.cited_work_id = ?
        GROUP BY field ORDER BY n DESC
        """,
        (seed_set_id, parent_id),
    ).fetchall()


def identifier_link(doi, openalex_id):
    if doi:
        return f"[{doi}](https://doi.org/{doi})"
    if openalex_id:
        return f"[{openalex_id}](https://openalex.org/{openalex_id})"
    return ""


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--seed-set", default="osserman_forward_v1")
    p.add_argument("--shortlist", default=str(REPORTS / "top_by_field_osserman_forward_v1.csv"),
                   help="CSV of the gen-1 branches actually expanded by harvest_forward_gen2.py")
    p.add_argument("--db", default=db.DEFAULT_DB_PATH)
    args = p.parse_args()

    with open(args.shortlist) as f:
        shortlist_ids = [r["openalex_id"] for r in csv.DictReader(f) if r.get("openalex_id")]

    conn = db.connect(args.db)
    parents = gen1_parents(conn, args.seed_set, shortlist_ids)

    results = []
    for parent in parents:
        pid, title, year, cited, fwci, doi = parent
        own_field = parent_field(conn, pid)
        field_counts = gen2_fields_for_parent(conn, args.seed_set, pid)
        total = sum(n for _, n in field_counts)
        outside = sum(n for f, n in field_counts if f != own_field)
        distinct_fields = len(field_counts)
        results.append({
            "id": pid, "title": title, "year": year, "own_field": own_field or "(no field)",
            "fwci": fwci, "cited_by_count": cited, "doi": doi,
            "gen2_total": total, "gen2_outside_own_field": outside,
            "outside_fraction": (outside / total) if total else 0.0,
            "distinct_fields": distinct_fields, "field_counts": field_counts,
        })

    # Rank by absolute count of gen-2 citers landing outside the paper's own field —
    # favors branches with real spin-off volume, not just a high fraction on a tiny base.
    results.sort(key=lambda r: r["gen2_outside_own_field"], reverse=True)

    lines = [
        f"# Spin-off fields by branch — {args.seed_set}",
        "",
        "For each generation -1 branch paper (direct citer of the root seed), how many of "
        "*its own* citers (generation -2) fall outside the branch paper's own field, and "
        "into which fields. Ranked by that outside-field count — evidence of a paper acting "
        "as a gateway into a genuinely new offshoot field, not just propagating within its "
        "own discipline. Branches with zero generation -2 citers (nothing cites them yet) "
        "are omitted.",
        "",
        "**Caveat:** 'own field' is OpenAlex's noisy automated `primary_topic` label. "
        "The clearest case here — Gilbarg & Trudinger's *Elliptic PDEs* textbook, labeled "
        "'Computer Science' by OpenAlex — tops the ranking below with 1,119 'outside own "
        "field' citers, nearly all Mathematics: it's a math book mislabeled as CS, so "
        "ordinary math citations register as a false cross-field spin-off. Verify a "
        "branch's own field before trusting its rank.",
        "",
        "| Branch paper | Own field | FWCI | Gen-2 citers | Outside own field | Distinct fields | Top spin-off fields | Identifier |",
        "|---|---|---:|---:|---:|---:|---|---|",
    ]
    for r in results:
        if r["gen2_total"] == 0:
            continue
        top_spinoff = ", ".join(
            f"{f} ({n})" for f, n in r["field_counts"] if f != r["own_field"]
        )[:80]
        fwci_str = f"{r['fwci']:.2f}" if r["fwci"] is not None else "—"
        lines.append(
            f"| {(r['title'] or '')[:55]} | {r['own_field']} | {fwci_str} | {r['gen2_total']} "
            f"| {r['gen2_outside_own_field']} ({r['outside_fraction']:.0%}) | {r['distinct_fields']} "
            f"| {top_spinoff} | {identifier_link(r['doi'], r['id'])} |"
        )

    md_path = REPORTS / f"spinoff_fields_{args.seed_set}.md"
    md_path.write_text("\n".join(lines) + "\n")

    csv_path = REPORTS / f"spinoff_fields_{args.seed_set}.csv"
    with csv_path.open("w", newline="") as f:
        wr = csv.writer(f)
        wr.writerow(["openalex_id", "title", "year", "own_field", "fwci", "cited_by_count",
                     "gen2_total", "gen2_outside_own_field", "outside_fraction",
                     "distinct_fields", "top_field_breakdown", "doi"])
        for r in results:
            breakdown = "; ".join(f"{f}:{n}" for f, n in r["field_counts"])
            wr.writerow([r["id"], r["title"], r["year"], r["own_field"], r["fwci"],
                         r["cited_by_count"], r["gen2_total"], r["gen2_outside_own_field"],
                         round(r["outside_fraction"], 3), r["distinct_fields"], breakdown, r["doi"]])

    print(f"Wrote {md_path}\nWrote {csv_path}")
    nonzero = [r for r in results if r["gen2_total"] > 0]
    print(f"{len(nonzero)}/{len(results)} branch papers have generation -2 citers")


if __name__ == "__main__":
    main()
