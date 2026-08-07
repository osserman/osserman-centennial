"""Semantic Scholar Graph API client (read-only trial).

Design mirrors msl.openalex: conservative client-side throttle, every request
logged to harvest_log for provenance, exponential backoff with jitter on
429/5xx. No API key required for this trial — the unauthenticated pool is
rate-limited more tightly than OpenAlex's, so the throttle here is more
conservative (1 req/s) and requests are batched wherever possible.

Unlike OpenAlex, Semantic Scholar's batch lookup keys on external IDs
(DOI:..., ARXIV:..., PMID:..., ...), not on its own S2 ID — so works with no
DOI on file can't be looked up this way.
"""

from __future__ import annotations

import random
import sqlite3
import time

import requests

from .db import now_utc

BASE_URL = "https://api.semanticscholar.org/graph/v1"

MIN_REQUEST_INTERVAL = 1.0   # seconds -> 1 req/s, conservative for the unauthenticated pool
MAX_RETRIES = 5

# Semantic Scholar's /paper/batch accepts up to 500 IDs per request.
BATCH_SIZE = 500

DEFAULT_FIELDS = "title,abstract,tldr,openAccessPdf,fieldsOfStudy,s2FieldsOfStudy,externalIds"


class SemanticScholarClient:
    def __init__(self, conn: sqlite3.Connection, script: str, api_key: str | None = None):
        self.conn = conn
        self.script = script
        self.session = requests.Session()
        self.session.headers["User-Agent"] = "MinimalSurfaceLineages (mailto:stephen.osserman@gmail.com)"
        if api_key:
            self.session.headers["x-api-key"] = api_key
        self._last_request_time = 0.0

    def _throttle(self) -> None:
        wait = self._last_request_time + MIN_REQUEST_INTERVAL - time.monotonic()
        if wait > 0:
            time.sleep(wait)

    def _post(self, path: str, params: dict, json_body: dict) -> requests.Response:
        url = f"{BASE_URL}{path}"
        last_status = None
        for attempt in range(MAX_RETRIES):
            self._throttle()
            self._last_request_time = time.monotonic()
            try:
                resp = self.session.post(url, params=params, json=json_body, timeout=60)
                last_status = resp.status_code
            except requests.RequestException as exc:
                self._log(url, params, None, note=f"network error: {exc}")
                self._backoff(attempt, None)
                continue

            if resp.status_code == 200:
                self._log(url, params, resp.status_code, result_count=len(json_body.get("ids", [])))
                return resp

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
        full_url = url + ("?" + "&".join(f"{k}={v}" for k, v in params.items()) if params else "")
        self.conn.execute(
            "INSERT INTO harvest_log (requested_at, url, status_code, result_count, script, note) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (now_utc(), full_url, status_code, result_count, self.script, note),
        )
        self.conn.commit()

    def batch_papers_by_doi(self, dois: list[str], fields: str = DEFAULT_FIELDS) -> dict[str, dict | None]:
        """Look up papers by DOI. Returns {doi: paper_dict_or_None}.

        None means Semantic Scholar has no record for that DOI (not an error).
        """
        results: dict[str, dict | None] = {}
        for i in range(0, len(dois), BATCH_SIZE):
            chunk = dois[i : i + BATCH_SIZE]
            ids = [f"DOI:{d}" for d in chunk]
            resp = self._post("/paper/batch", {"fields": fields}, {"ids": ids})
            data = resp.json()
            for doi, record in zip(chunk, data):
                results[doi] = record
        return results
