#!/usr/bin/env python3
"""Harvest a forward-looking citation path: a seed work and the works that cite it.

Forward (`cited_by`) counterpart to expand_backward.py. Adds the seed at
generation 0 and its direct citers at generation -1 (negative generations denote
the forward/descendant direction; positive = backward/ancestry — see schema).

Why this is a distinct route: tracing citers of a foundational *synthesis* such
as Osserman's *A Survey of Minimal Surfaces* maps **pedagogical provenance** (how
other fields learned/entered the theory), complementary to the backward pilot's
**mathematical provenance** (where results originated).

Because a citer's own `referenced_works` list may be missing entirely (publisher
reference-deposition gaps — see reports/pilot_methodology_notes.md), the citing
edge (citer → seed) is recorded EXPLICITLY here rather than relying on it. This
guarantees every descendant edge exists in work_references and is available for
citation-function annotation.

By default excludes the seed's own primary field (Mathematics, for Osserman) to
build the cross-disciplinary descendant path; --include-all keeps everything.

Idempotent: re-running re-fetches and replaces rows in place.

Usage:
    uv run scripts/harvest_forward.py --work W2139502098 \
        --seed-set osserman_forward_v1 \
        --description "Forward (cited_by) path from Osserman's Survey; non-math descendants"
"""

import argparse

from msl import db, openalex
from msl.ingest import ingest_work

from harvest_seeds import record_membership, register_seed_set


def excluded_field_id(client, work_id):
    groups = client._get(
        "/works", {"filter": f"cites:{work_id}", "group_by": "primary_topic.field.id"}
    )["group_by"]
    return groups[0]["key"].rsplit("/", 1)[-1] if groups else None


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--work", required=True, help="seed work to expand forward (W...)")
    p.add_argument("--seed-set", required=True, help="seed set id, e.g. osserman_forward_v1")
    p.add_argument("--description", default=None)
    p.add_argument("--include-all", action="store_true",
                   help="do not exclude the seed's own primary field")
    p.add_argument("--limit", type=int, default=None, help="cap number of citers (for testing)")
    p.add_argument("--db", default=db.DEFAULT_DB_PATH)
    args = p.parse_args()

    conn = db.connect(args.db)
    client = openalex.OpenAlexClient(conn, script="harvest_forward")

    register_seed_set(conn, {"id": args.seed_set,
                             "description": args.description or f"forward path from {args.work}"})

    # Seed (generation 0)
    print(f"Harvesting seed {args.work} ...")
    seed = client.get_work(args.work)
    seed_id = ingest_work(conn, seed, db.now_utc())
    record_membership(conn, args.seed_set, seed_id, 0, "harvest_forward")
    conn.commit()

    filt = f"cites:{seed_id}"
    scope = "all fields"
    if not args.include_all:
        excl = excluded_field_id(client, seed_id)
        if excl:
            filt += f",primary_topic.field.id:!{excl}"
            scope = f"excluding field {excl}"
    print(f"Fetching citers ({scope}) ...")

    fetched, cursor = 0, "*"
    while cursor:
        data = client._get("/works", {"filter": filt, "sort": "cited_by_count:desc",
                                       "per_page": 200, "cursor": cursor})
        for w in data["results"]:
            wid = ingest_work(conn, w, db.now_utc())
            record_membership(conn, args.seed_set, wid, -1, "harvest_forward")
            # Explicit forward edge, independent of the citer's referenced_works.
            conn.execute(
                "INSERT OR IGNORE INTO work_references (citing_work_id, cited_work_id) VALUES (?, ?)",
                (wid, seed_id),
            )
            fetched += 1
            if args.limit and fetched >= args.limit:
                break
        conn.commit()
        cursor = data["meta"].get("next_cursor")
        if not data["results"] or (args.limit and fetched >= args.limit):
            break
    conn.commit()

    edges = conn.execute(
        "SELECT COUNT(*) FROM work_references WHERE cited_work_id = ?", (seed_id,)
    ).fetchone()[0]
    print(f"\nDone. Seed + {fetched} direct citers (generation -1) ingested.")
    print(f"Explicit citing edges into {seed_id}: {edges}")
    counts = dict(conn.execute("SELECT is_stub, COUNT(*) FROM works GROUP BY is_stub").fetchall())
    print(f"works now: {counts.get(0, 0)} full, {counts.get(1, 0)} stubs")


if __name__ == "__main__":
    main()
