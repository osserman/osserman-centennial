#!/usr/bin/env python3
"""Resolve each seed in a seed YAML to an OpenAlex work ID.

For each seed: look up by DOI when one is given, otherwise search by title.
Candidates (with a transparent match score) are written to
reports/seed_resolution.md for human review. This script does NOT commit
anything to the database and does NOT overwrite the YAML; confirmed IDs are
written back into the YAML by a human (or with --write after review).

Usage:
    uv run scripts/resolve_seeds.py [--seeds seeds/pilot_v1.yaml] [--db PATH]
    uv run scripts/resolve_seeds.py --write   # write top match into the YAML's
                                              # resolved_openalex_id fields
"""

import argparse
import difflib
import pathlib

import yaml

from msl import db, openalex
from msl.ingest import strip_doi, strip_prefix

PROJECT_ROOT = pathlib.Path(__file__).resolve().parents[1]
DEFAULT_SEEDS = PROJECT_ROOT / "seeds" / "pilot_v1.yaml"
REPORT_PATH = PROJECT_ROOT / "reports" / "seed_resolution.md"


def title_similarity(a: str, b: str) -> float:
    return difflib.SequenceMatcher(None, a.lower(), b.lower()).ratio()


def candidate_row(work: dict, seed: dict) -> dict:
    title = work.get("title") or work.get("display_name") or ""
    authors = ", ".join(
        (a.get("author") or {}).get("display_name", "?")
        for a in (work.get("authorships") or [])[:4]
    )
    return {
        "openalex_id": strip_prefix(work["id"]),
        "title": title,
        "year": work.get("publication_year"),
        "authors": authors,
        "doi": strip_doi(work.get("doi")),
        "cited_by_count": work.get("cited_by_count"),
        "type": work.get("type"),
        "title_sim": round(title_similarity(title, seed["title"]), 3),
    }


def resolve_seed(client: openalex.OpenAlexClient, seed: dict) -> list[dict]:
    if seed.get("doi"):
        try:
            work = client.get_work_by_doi(seed["doi"])
            return [candidate_row(work, seed)]
        except LookupError:
            pass  # fall through to title search
    results = client.search_works(seed["title"], per_page=8)
    cands = [candidate_row(w, seed) for w in results]
    cands.sort(key=lambda c: c["title_sim"], reverse=True)
    return cands


def write_report(resolutions: list[tuple[dict, list[dict]]]) -> None:
    lines = [
        "# Seed resolution — pilot_v1",
        "",
        "Candidate OpenAlex matches for each seed. Top candidate per seed is the",
        "default; confirm or correct before harvesting. DOI lookups return a single",
        "exact match; title searches are ranked by title similarity.",
        "",
    ]
    for seed, cands in resolutions:
        lines.append(f"## {seed['key']} — {seed['title']}")
        lines.append("")
        lines.append(f"- Expected: {seed.get('authors', '?')} ({seed.get('year', '?')})")
        if seed.get("doi"):
            lines.append(f"- DOI query: `{seed['doi']}`")
        if seed.get("note"):
            lines.append(f"- Note: {seed['note']}")
        lines.append("")
        if not cands:
            lines.append("- **No candidates returned.**")
            lines.append("")
            continue
        lines.append("| # | OpenAlex | Title | Year | Authors | Cited by | Type | Title sim |")
        lines.append("|---|----------|-------|------|---------|----------|------|-----------|")
        for i, c in enumerate(cands):
            marker = "**→**" if i == 0 else str(i)
            lines.append(
                f"| {marker} | `{c['openalex_id']}` | {c['title'][:70]} | {c['year']} "
                f"| {c['authors'][:45]} | {c['cited_by_count']} | {c['type']} | {c['title_sim']} |"
            )
        lines.append("")
    REPORT_PATH.write_text("\n".join(lines))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--seeds", default=DEFAULT_SEEDS, help="seed YAML path")
    parser.add_argument("--db", default=db.DEFAULT_DB_PATH, help="database path")
    parser.add_argument(
        "--write",
        action="store_true",
        help="write the top candidate into resolved_openalex_id in the YAML",
    )
    args = parser.parse_args()

    seed_doc = yaml.safe_load(pathlib.Path(args.seeds).read_text())
    conn = db.connect(args.db)
    client = openalex.OpenAlexClient(conn, script="resolve_seeds")

    resolutions = []
    for seed in seed_doc["seeds"]:
        print(f"Resolving {seed['key']} ...")
        cands = resolve_seed(client, seed)
        resolutions.append((seed, cands))
        if cands:
            top = cands[0]
            print(f"  -> {top['openalex_id']}  {top['title'][:60]}  ({top['year']})")
            if args.write:
                seed["resolved_openalex_id"] = top["openalex_id"]
        else:
            print("  -> no candidates")

    write_report(resolutions)
    print(f"\nWrote {REPORT_PATH}")

    if args.write:
        pathlib.Path(args.seeds).write_text(
            yaml.safe_dump(seed_doc, sort_keys=False, allow_unicode=True)
        )
        print(f"Wrote resolved IDs back into {args.seeds}")


if __name__ == "__main__":
    main()
