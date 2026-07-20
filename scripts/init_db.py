#!/usr/bin/env python3
"""Create (or migrate-forward) the SQLite database from db/schema.sql.

Idempotent: all DDL uses IF NOT EXISTS, so re-running never destroys data.

Usage: uv run scripts/init_db.py [--db PATH]
"""

import argparse

from msl import db


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", default=db.DEFAULT_DB_PATH, help="database path")
    args = parser.parse_args()

    conn = db.connect(args.db)
    db.init_schema(conn)
    tables = [
        r[0]
        for r in conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
        )
    ]
    print(f"Initialized {args.db} with {len(tables)} tables:")
    print("  " + ", ".join(tables))


if __name__ == "__main__":
    main()
