#!/usr/bin/env python3
"""For each generation -1 branch paper (a citer of the root seed, already
outside mathematics), how much of its own further citation (generation -2)
stays *within* its own field — evidence that the migration from math into
that field solidified into an ongoing line of work there, rather than being
a one-off citation.

This is deliberately the opposite question from "which new fields does this
spin off into": once a branch paper has already left math for field X, the
question here is whether field X kept building on it, not whether it kept
migrating further afield. Ranked by same-field generation -2 citer count.

Derived analysis over the database (no API calls); reuses the generation -2
harvest from harvest_forward_gen2.py.

CAVEATS baked into the report:
- "own field" is OpenAlex's noisy automated primary_topic label. A branch
  paper mislabeled out of Mathematics (e.g. a math textbook tagged Computer
  Science) will show heavy "back to Mathematics" citation that looks like
  weak solidification but is really just ordinary math citation of a math
  work — the "% back to Mathematics" column exists to catch this.
- Some generation -2 works are stubs (referenced but not fully harvested
  elsewhere) and have no field; those are counted in gen2_total but not
  attributable to any field.

Usage:
    uv run scripts/rank_field_solidification.py --seed-set osserman_forward_v1
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
    skipped_math = 0
    for parent in parents:
        pid, title, year, cited, fwci, doi = parent
        own_field = parent_field(conn, pid) or "(no field)"
        # These are papers that never left mathematics (own_field literally
        # Mathematics) — out of scope for a "did the migration out of math
        # solidify" question, since there was no migration. They're in the
        # shortlist only because it spans the top-6-per-field including Math.
        if own_field == "Mathematics":
            skipped_math += 1
            continue
        field_counts = gen2_fields_for_parent(conn, args.seed_set, pid)
        by_field = dict(field_counts)
        total = sum(by_field.values())
        same_field = by_field.get(own_field, 0)
        math_field = by_field.get("Mathematics", 0) if own_field != "Mathematics" else 0
        results.append({
            "id": pid, "title": title, "year": year, "own_field": own_field,
            "fwci": fwci, "cited_by_count": cited, "doi": doi,
            "gen2_total": total, "gen2_same_field": same_field,
            "same_field_fraction": (same_field / total) if total else 0.0,
            "gen2_back_to_math": math_field,
            "back_to_math_fraction": (math_field / total) if total else 0.0,
            "field_counts": field_counts,
        })

    # Rank by absolute same-field generation -2 citer count — the clearest
    # signal that a real, ongoing literature within the destination field grew
    # up around this branch paper, not just a single crossover citation.
    results.sort(key=lambda r: r["gen2_same_field"], reverse=True)

    lines = [
        f"# Field solidification by branch — {args.seed_set}",
        "",
        "For each generation -1 branch paper (a direct citer of the root seed, already "
        "outside mathematics), how much of *its own* further citation (generation -2) stays "
        "within its own field — evidence the migration into that field solidified into an "
        "ongoing line of work there, rather than a one-off crossover citation. Ranked by "
        "same-field generation -2 citer count. Branches labeled Mathematics (never actually "
        "left math, so there's no migration to solidify) and branches with zero generation -2 "
        "citers (nothing cites them yet) are omitted.",
        "",
        "**Caveat:** 'own field' is OpenAlex's noisy automated `primary_topic` label. A "
        "branch mislabeled out of Mathematics will show heavy '% back to Math' that looks "
        "like weak solidification but is really just ordinary math citation of what is, in "
        "truth, a math work — e.g. Gilbarg & Trudinger's *Elliptic PDEs* textbook, labeled "
        "'Computer Science', shows 0 same-field but 834/1,362 (61%) back to Mathematics; "
        "that's not failed solidification, it's a mislabeled math book. Check '% back to "
        "Math' before reading a low same-field count as a real finding.",
        "",
        "| Branch paper | Own field | FWCI | Gen-2 citers | Same field | % back to Math | Identifier |",
        "|---|---|---:|---:|---:|---:|---|",
    ]
    for r in results:
        if r["gen2_total"] == 0:
            continue
        fwci_str = f"{r['fwci']:.2f}" if r["fwci"] is not None else "—"
        lines.append(
            f"| {(r['title'] or '')[:55]} | {r['own_field']} | {fwci_str} | {r['gen2_total']} "
            f"| {r['gen2_same_field']} ({r['same_field_fraction']:.0%}) "
            f"| {r['back_to_math_fraction']:.0%} | {identifier_link(r['doi'], r['id'])} |"
        )

    md_path = REPORTS / f"field_solidification_{args.seed_set}.md"
    md_path.write_text("\n".join(lines) + "\n")

    csv_path = REPORTS / f"field_solidification_{args.seed_set}.csv"
    with csv_path.open("w", newline="") as f:
        wr = csv.writer(f)
        wr.writerow(["openalex_id", "title", "year", "own_field", "fwci", "cited_by_count",
                     "gen2_total", "gen2_same_field", "same_field_fraction",
                     "gen2_back_to_math", "back_to_math_fraction", "field_breakdown", "doi"])
        for r in results:
            breakdown = "; ".join(f"{f}:{n}" for f, n in r["field_counts"])
            wr.writerow([r["id"], r["title"], r["year"], r["own_field"], r["fwci"],
                         r["cited_by_count"], r["gen2_total"], r["gen2_same_field"],
                         round(r["same_field_fraction"], 3), r["gen2_back_to_math"],
                         round(r["back_to_math_fraction"], 3), breakdown, r["doi"]])

    print(f"Wrote {md_path}\nWrote {csv_path}")
    nonzero = [r for r in results if r["gen2_total"] > 0]
    print(f"{len(nonzero)}/{len(results)} non-math branch papers have generation -2 citers "
          f"({skipped_math} Mathematics-labeled branches excluded as out of scope)")


if __name__ == "__main__":
    main()
