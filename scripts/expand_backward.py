#!/usr/bin/env python3
"""Expand one citation generation backward from a seed set's generation-0 works.

Collects every work referenced by a generation-0 seed (the stubs created during
harvest), batch-fetches their full metadata (50 IDs per request), ingests them
identically to seeds, and records them as generation 1 in the seed set.

This deliberately does NOT recurse further: per the project plan, expansion
beyond generation 1 happens only from manually retained bridge papers, never by
unrestricted crawling. Authors of generation-1 works are left as the dehydrated
records captured from authorships (no per-author enrichment) to conserve the API
budget.

Idempotent: re-running re-fetches and replaces rows in place.

Usage: uv run scripts/expand_backward.py [--seed-set pilot_v1] [--db PATH]
"""

import argparse

from msl import db, openalex
from msl.ingest import ingest_work

from harvest_seeds import record_membership  # reuse membership upsert


def generation0_ids(conn, seed_set_id: str) -> list[str]:
    return [
        r[0]
        for r in conn.execute(
            "SELECT work_id FROM seed_set_works WHERE seed_set_id = ? AND generation = 0",
            (seed_set_id,),
        )
    ]


def referenced_stub_ids(conn, seed_ids: list[str]) -> list[str]:
    """Referenced works of the seeds that are still stubs (not yet fully harvested)."""
    placeholders = ",".join("?" * len(seed_ids))
    rows = conn.execute(
        f"""
        SELECT DISTINCT r.cited_work_id
        FROM work_references r
        JOIN works w ON w.openalex_id = r.cited_work_id
        WHERE r.citing_work_id IN ({placeholders}) AND w.is_stub = 1
        ORDER BY r.cited_work_id
        """,
        seed_ids,
    ).fetchall()
    return [r[0] for r in rows]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--seed-set", default="pilot_v1")
    parser.add_argument("--db", default=db.DEFAULT_DB_PATH)
    args = parser.parse_args()

    conn = db.connect(args.db)
    client = openalex.OpenAlexClient(conn, script="expand_backward")

    seed_ids = generation0_ids(conn, args.seed_set)
    if not seed_ids:
        raise SystemExit(f"No generation-0 works for seed set '{args.seed_set}'. Run harvest_seeds first.")
    targets = referenced_stub_ids(conn, seed_ids)
    print(
        f"Seed set '{args.seed_set}': {len(seed_ids)} seeds reference "
        f"{len(targets)} distinct un-harvested works. Fetching (50/request) ..."
    )

    fetched = 0
    for work in client.batch_works(targets):
        harvested_at = db.now_utc()
        work_id = ingest_work(conn, work, harvested_at)
        record_membership(conn, args.seed_set, work_id, 1, "expand_backward")
        fetched += 1
        if fetched % 100 == 0:
            conn.commit()
            print(f"  ... {fetched}/{len(targets)}")
    conn.commit()

    missing = len(targets) - fetched
    print(f"\nDone. Fetched {fetched} generation-1 works" + (f" ({missing} not returned by OpenAlex)" if missing else "."))
    counts = dict(conn.execute("SELECT is_stub, COUNT(*) FROM works GROUP BY is_stub").fetchall())
    print(
        f"works now: {counts.get(0, 0)} full, {counts.get(1, 0)} stubs (deeper frontier); "
        f"edges: {conn.execute('SELECT COUNT(*) FROM work_references').fetchone()[0]}"
    )


if __name__ == "__main__":
    main()
