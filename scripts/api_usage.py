#!/usr/bin/env python3
"""Show OpenAlex API usage over the last 24h against the daily budget.

Usage: uv run scripts/api_usage.py [--db PATH]
"""

import argparse

from msl import db, openalex


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", default=db.DEFAULT_DB_PATH, help="database path")
    args = parser.parse_args()

    conn = db.connect(args.db)
    client = openalex.OpenAlexClient(conn, script="api_usage")
    used = client.requests_last_24h()
    hard_stop = int(openalex.DAILY_LIMIT * openalex.STOP_FRACTION)
    print(f"OpenAlex requests in the last 24h: {used}")
    print(f"Daily limit: {openalex.DAILY_LIMIT}  |  our hard stop: {hard_stop}")
    print(f"Remaining before hard stop: {hard_stop - used}")


if __name__ == "__main__":
    main()
