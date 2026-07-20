#!/usr/bin/env python3
"""Harvest full metadata for the resolved seeds of a seed set (generation 0).

For each seed with a resolved_openalex_id: register the seed set, fetch the full
work JSON, ingest it (work + venue + authorships + concepts + topics + outgoing
reference edges, with referenced works stored as stubs), and record seed-set
membership at generation 0. Seed authors are enriched with full /authors records
(counts + raw JSON), since the seed set is small and authors matter for the
collaboration-network analyses.

Idempotent: re-running re-fetches and replaces rows in place.

Usage: uv run scripts/harvest_seeds.py [--seeds seeds/pilot_v1.yaml] [--db PATH]
                                       [--no-enrich-authors]
"""

import argparse
import pathlib

import yaml

from msl import db, openalex
from msl.ingest import enrich_author, ingest_work, strip_prefix

PROJECT_ROOT = pathlib.Path(__file__).resolve().parents[1]
DEFAULT_SEEDS = PROJECT_ROOT / "seeds" / "pilot_v1.yaml"


def register_seed_set(conn, seed_set: dict) -> None:
    conn.execute(
        "INSERT INTO seed_sets (id, description, created_at) VALUES (?, ?, ?) "
        "ON CONFLICT(id) DO UPDATE SET description = excluded.description",
        (seed_set["id"], seed_set.get("description"), db.now_utc()),
    )
    conn.commit()


def record_membership(conn, seed_set_id: str, work_id: str, generation: int, via: str) -> None:
    conn.execute(
        """
        INSERT INTO seed_set_works (seed_set_id, work_id, generation, added_via, added_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(seed_set_id, work_id) DO UPDATE SET
            generation = MIN(seed_set_works.generation, excluded.generation)
        """,
        (seed_set_id, work_id, generation, via, db.now_utc()),
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--seeds", default=DEFAULT_SEEDS)
    parser.add_argument("--db", default=db.DEFAULT_DB_PATH)
    parser.add_argument("--no-enrich-authors", action="store_true")
    args = parser.parse_args()

    seed_doc = yaml.safe_load(pathlib.Path(args.seeds).read_text())
    seed_set = seed_doc["seed_set"]
    conn = db.connect(args.db)
    client = openalex.OpenAlexClient(conn, script="harvest_seeds")

    register_seed_set(conn, seed_set)

    for seed in seed_doc["seeds"]:
        wid = seed.get("resolved_openalex_id")
        if not wid:
            print(f"SKIP {seed['key']}: no resolved_openalex_id")
            continue
        print(f"Harvesting {seed['key']} ({wid}) ...")
        work = client.get_work(wid)
        harvested_at = db.now_utc()
        work_id = ingest_work(conn, work, harvested_at)
        record_membership(conn, seed_set["id"], work_id, 0, "harvest_seeds")
        n_refs = len(work.get("referenced_works") or [])
        print(f"  ingested; {n_refs} referenced works (stubs created)")

        if not args.no_enrich_authors:
            for auth in work.get("authorships") or []:
                aid = strip_prefix((auth.get("author") or {}).get("id"))
                if aid:
                    enrich_author(conn, client.get_author(aid), db.now_utc())
        conn.commit()

    conn.commit()
    counts = dict(
        conn.execute(
            "SELECT is_stub, COUNT(*) FROM works GROUP BY is_stub"
        ).fetchall()
    )
    print(
        f"\nDone. works: {counts.get(0, 0)} full, {counts.get(1, 0)} stubs; "
        f"edges: {conn.execute('SELECT COUNT(*) FROM work_references').fetchone()[0]}"
    )


if __name__ == "__main__":
    main()
