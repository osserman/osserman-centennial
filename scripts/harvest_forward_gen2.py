#!/usr/bin/env python3
"""Second forward generation: for each work in a shortlist, harvest who cites
*it* (generation -2 relative to the original forward seed), to answer "which
fields does each branch spin off into."

Complements harvest_forward.py, which only goes one hop (generation -1,
Osserman's direct citers). This script takes a curated shortlist of those
generation -1 works — by default the FWCI top-6-per-field list, not the full
1,032, since blind recursion from everything would balloon fast (see
pilot_methodology_notes.md) — and expands each one generation further.

Ingests into the same seed set as the generation -1 harvest (default
osserman_forward_v1); record_membership keeps the generation closest to the
original seed if a work is reachable at multiple depths. Explicit citing
edges (gen-2 work -> gen-1 parent) are recorded independent of the citer's
own referenced_works, same rationale as harvest_forward.py: publisher
reference-deposition gaps must not silently drop edges.

Idempotent: re-running re-fetches and replaces rows in place.

Usage:
    uv run scripts/harvest_forward_gen2.py \
        --input reports/top_by_field_osserman_forward_v1.csv \
        --seed-set osserman_forward_v1
"""

import argparse
import csv
import pathlib

from msl import db, openalex
from msl.ingest import ingest_work

from harvest_seeds import record_membership

PROJECT_ROOT = pathlib.Path(__file__).resolve().parents[1]


def load_parent_ids(path: pathlib.Path) -> list[str]:
    with path.open() as f:
        rows = list(csv.DictReader(f))
    seen, ids = set(), []
    for r in rows:
        wid = r.get("openalex_id")
        if wid and wid not in seen:
            seen.add(wid)
            ids.append(wid)
    return ids


def harvest_citers_of(client, conn, seed_set_id, parent_id):
    fetched = 0
    cursor = "*"
    while cursor:
        data = client._get(
            "/works",
            {"filter": f"cites:{parent_id}", "sort": "cited_by_count:desc",
             "per_page": 200, "cursor": cursor},
        )
        for w in data["results"]:
            wid = ingest_work(conn, w, db.now_utc())
            record_membership(conn, seed_set_id, wid, -2, "harvest_forward_gen2")
            conn.execute(
                "INSERT OR IGNORE INTO work_references (citing_work_id, cited_work_id) VALUES (?, ?)",
                (wid, parent_id),
            )
            fetched += 1
        conn.commit()
        cursor = data["meta"].get("next_cursor")
        if not data["results"]:
            break
    return fetched


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--input", default=str(PROJECT_ROOT / "reports" / "top_by_field_osserman_forward_v1.csv"))
    p.add_argument("--seed-set", default="osserman_forward_v1")
    p.add_argument("--db", default=db.DEFAULT_DB_PATH)
    args = p.parse_args()

    parent_ids = load_parent_ids(pathlib.Path(args.input))
    print(f"{len(parent_ids)} generation -1 parents to expand one hop further")

    conn = db.connect(args.db)
    client = openalex.OpenAlexClient(conn, script="harvest_forward_gen2")

    per_parent = {}
    for i, parent_id in enumerate(parent_ids, 1):
        n = harvest_citers_of(client, conn, args.seed_set, parent_id)
        per_parent[parent_id] = n
        print(f"  [{i}/{len(parent_ids)}] {parent_id}: {n} citers")

    total_gen2_edges = sum(per_parent.values())
    distinct_gen2 = conn.execute(
        "SELECT COUNT(*) FROM seed_set_works WHERE seed_set_id = ? AND generation = -2",
        (args.seed_set,),
    ).fetchone()[0]
    print(f"\nDone. {total_gen2_edges} gen-2 citing edges across {len(parent_ids)} parents "
          f"({distinct_gen2} distinct generation -2 works after dedup).")


if __name__ == "__main__":
    main()
