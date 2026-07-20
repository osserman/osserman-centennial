"""OpenAlex API client.

Design constraints:
- polite pool (mailto identifies us; OpenAlex gives polite-pool users better service)
- conservative client-side throttle: 5 req/s, half of OpenAlex's stated 10 req/s cap
- daily budget guard: OpenAlex allows 100k requests/day; we warn at 50% and hard-stop
  at 80% so an iterating session never gets locked out
- every request is recorded in harvest_log (provenance + the budget counter)
- exponential backoff with jitter on 429/5xx, honoring Retry-After; repeated 429s
  abort the run cleanly rather than hammering the API (scripts are idempotent, so a
  partial run is safe to resume)
"""

from __future__ import annotations

import datetime
import random
import sqlite3
import time

import requests

from .db import now_utc

BASE_URL = "https://api.openalex.org"
MAILTO = "stephen.osserman@gmail.com"

MIN_REQUEST_INTERVAL = 0.2   # seconds -> 5 req/s
DAILY_LIMIT = 100_000        # OpenAlex's documented daily cap
WARN_FRACTION = 0.5
STOP_FRACTION = 0.8
MAX_RETRIES = 5

# OpenAlex allows at most 50 values in one OR-filter.
BATCH_SIZE = 50


class DailyBudgetExceeded(RuntimeError):
    pass


class OpenAlexClient:
    def __init__(self, conn: sqlite3.Connection, script: str):
        self.conn = conn
        self.script = script
        self.session = requests.Session()
        self.session.headers["User-Agent"] = f"MinimalSurfaceLineages (mailto:{MAILTO})"
        self._last_request_time = 0.0
        self._budget_warned = False

    # ------------------------------------------------------------------ budget

    def requests_last_24h(self) -> int:
        cutoff = (
            datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=24)
        ).strftime("%Y-%m-%dT%H:%M:%SZ")
        row = self.conn.execute(
            "SELECT COUNT(*) FROM harvest_log WHERE requested_at > ?", (cutoff,)
        ).fetchone()
        return row[0]

    def _check_budget(self) -> None:
        used = self.requests_last_24h()
        if used >= DAILY_LIMIT * STOP_FRACTION:
            raise DailyBudgetExceeded(
                f"{used} OpenAlex requests in the last 24h "
                f"(hard stop at {int(DAILY_LIMIT * STOP_FRACTION)} = "
                f"{int(STOP_FRACTION * 100)}% of the {DAILY_LIMIT}/day limit). "
                "Wait for the window to roll over before harvesting more."
            )
        if not self._budget_warned and used >= DAILY_LIMIT * WARN_FRACTION:
            self._budget_warned = True
            print(
                f"WARNING: {used} OpenAlex requests in the last 24h "
                f"(>{int(WARN_FRACTION * 100)}% of the daily limit)."
            )

    # ----------------------------------------------------------------- request

    def _get(self, path: str, params: dict | None = None) -> dict:
        self._check_budget()
        params = dict(params or {})
        params["mailto"] = MAILTO

        wait = self._last_request_time + MIN_REQUEST_INTERVAL - time.monotonic()
        if wait > 0:
            time.sleep(wait)

        url = f"{BASE_URL}{path}"
        last_status = None
        for attempt in range(MAX_RETRIES):
            self._last_request_time = time.monotonic()
            try:
                resp = self.session.get(url, params=params, timeout=60)
                last_status = resp.status_code
            except requests.RequestException as exc:
                last_status = None
                self._log(url, params, None, note=f"network error: {exc}")
                self._backoff(attempt, None)
                continue

            if resp.status_code == 200:
                data = resp.json()
                count = len(data["results"]) if "results" in data else 1
                self._log(url, params, resp.status_code, result_count=count)
                return data
            if resp.status_code == 404:
                self._log(url, params, resp.status_code, result_count=0)
                raise LookupError(f"OpenAlex 404 for {path}")

            self._log(url, params, resp.status_code, note=f"retry {attempt + 1}")
            if resp.status_code == 429 or resp.status_code >= 500:
                self._backoff(attempt, resp.headers.get("Retry-After"))
                continue
            resp.raise_for_status()

        raise RuntimeError(
            f"Giving up on {path} after {MAX_RETRIES} attempts "
            f"(last status: {last_status}). Aborting cleanly; re-run to resume."
        )

    @staticmethod
    def _backoff(attempt: int, retry_after: str | None) -> None:
        delay = 2**attempt + random.uniform(0, 1)
        if retry_after:
            try:
                delay = max(delay, float(retry_after))
            except ValueError:
                pass
        time.sleep(delay)

    def _log(
        self,
        url: str,
        params: dict,
        status_code: int | None,
        result_count: int | None = None,
        note: str | None = None,
    ) -> None:
        shown = {k: v for k, v in params.items() if k != "mailto"}
        full_url = url + ("?" + "&".join(f"{k}={v}" for k, v in shown.items()) if shown else "")
        self.conn.execute(
            "INSERT INTO harvest_log (requested_at, url, status_code, result_count, script, note) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (now_utc(), full_url, status_code, result_count, self.script, note),
        )
        self.conn.commit()

    # --------------------------------------------------------------- endpoints

    def get_work(self, work_id: str) -> dict:
        """Fetch one work by bare OpenAlex ID (W...) or 'doi:10.xxxx/...'."""
        return self._get(f"/works/{work_id}")

    def get_work_by_doi(self, doi: str) -> dict:
        return self._get(f"/works/doi:{doi}")

    def get_author(self, author_id: str) -> dict:
        return self._get(f"/authors/{author_id}")

    def search_works(self, query: str, per_page: int = 10) -> list[dict]:
        data = self._get("/works", {"search": query, "per_page": per_page})
        return data["results"]

    def batch_works(self, work_ids: list[str]) -> list[dict]:
        """Fetch full metadata for up to thousands of works, 50 IDs per request."""
        results: list[dict] = []
        for i in range(0, len(work_ids), BATCH_SIZE):
            chunk = work_ids[i : i + BATCH_SIZE]
            data = self._get(
                "/works",
                {"filter": "openalex_id:" + "|".join(chunk), "per_page": BATCH_SIZE},
            )
            results.extend(data["results"])
        return results
