"""SQLite helpers shared by all scripts."""

from __future__ import annotations

import datetime
import pathlib
import sqlite3

PROJECT_ROOT = pathlib.Path(__file__).resolve().parents[2]
DEFAULT_DB_PATH = PROJECT_ROOT / "data" / "lineages.db"
SCHEMA_PATH = PROJECT_ROOT / "db" / "schema.sql"


def connect(db_path: pathlib.Path | str = DEFAULT_DB_PATH) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_schema(conn: sqlite3.Connection) -> None:
    conn.executescript(SCHEMA_PATH.read_text())
    conn.commit()


def now_utc() -> str:
    """ISO-8601 UTC timestamp, second precision."""
    return datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
