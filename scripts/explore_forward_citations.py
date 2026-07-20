#!/usr/bin/env python3
"""Explore the forward citations of a single work: who cites it, in which fields,
and which of those citing works are themselves influential.

This is the *forward* (cited_by) direction, complementary to expand_backward.py.
It is an exploration tool: it reads from OpenAlex and writes a report + CSV to
reports/, but does NOT modify the database. Useful for probing the reach of a
foundational work whose own reference list is thin or missing (e.g. a monograph).

By default it excludes the work's own primary field (usually Mathematics here)
to surface cross-disciplinary descendants; pass --include-all to keep everything.

NOTE: OpenAlex's primary_topic field labels are automated and noisy for older or
borderline works — treat the field column as a hint, not ground truth (a pure
math PDE textbook can be mislabeled "Computer Science"). Verify before curating.

Usage:
    uv run scripts/explore_forward_citations.py --work W2139502098 --label osserman_survey
    uv run scripts/explore_forward_citations.py --work W2139502098 --include-all
"""

import argparse
import csv
import pathlib

from msl import db, openalex
from msl.ingest import strip_doi, strip_prefix

PROJECT_ROOT = pathlib.Path(__file__).resolve().parents[1]
REPORTS = PROJECT_ROOT / "reports"

SELECT = "id,title,publication_year,cited_by_count,type,doi,primary_topic,authorships"


def field_distribution(client, work_id):
    data = client._get(
        "/works", {"filter": f"cites:{work_id}", "group_by": "primary_topic.field.id"}
    )
    return data["meta"]["count"], data["group_by"]


def fetch_citing(client, work_id, exclude_field_id=None):
    filt = f"cites:{work_id}"
    if exclude_field_id:
        filt += f",primary_topic.field.id:!{exclude_field_id}"
    rows, cursor = [], "*"
    while cursor:
        d = client._get(
            "/works",
            {"filter": filt, "sort": "cited_by_count:desc", "per_page": 200,
             "cursor": cursor, "select": SELECT},
        )
        rows += d["results"]
        cursor = d["meta"].get("next_cursor")
        if not d["results"]:
            break
    return rows


def row_dict(w):
    pt = w.get("primary_topic") or {}
    return {
        "openalex_id": strip_prefix(w["id"]),
        "title": w.get("title") or "",
        "year": w.get("publication_year"),
        "cited_by_count": w.get("cited_by_count"),
        "type": w.get("type"),
        "field": (pt.get("field") or {}).get("display_name", ""),
        "subfield": (pt.get("subfield") or {}).get("display_name", ""),
        "authors": ", ".join(
            (a.get("author") or {}).get("display_name", "?")
            for a in (w.get("authorships") or [])[:3]
        ),
        "doi": strip_doi(w.get("doi")),
    }


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--work", required=True, help="OpenAlex work ID to probe (W...)")
    p.add_argument("--label", default=None, help="slug for output filenames")
    p.add_argument("--include-all", action="store_true",
                   help="do not exclude the work's own primary field")
    p.add_argument("--top", type=int, default=40, help="rows to show in the markdown table")
    p.add_argument("--db", default=db.DEFAULT_DB_PATH)
    args = p.parse_args()

    conn = db.connect(args.db)
    client = openalex.OpenAlexClient(conn, script="explore_forward_citations")

    target = client._get(f"/works/{args.work}", {"select": "id,title,publication_year,cited_by_count"})
    title = target.get("title") or args.work
    label = args.label or args.work.lower()

    total, groups = field_distribution(client, args.work)
    own_field = groups[0] if groups else None
    exclude_id = None if args.include_all else (own_field["key"].rsplit("/", 1)[-1] if own_field else None)

    citing = fetch_citing(client, args.work, exclude_id)
    rows = [row_dict(w) for w in citing]

    scope = "all fields" if args.include_all else f"excluding {own_field['key_display_name']}"
    md = REPORTS / f"forward_citations_{label}.md"
    csv_path = REPORTS / f"forward_citations_{label}.csv"

    lines = [
        f"# Forward citations — {title}",
        "",
        f"OpenAlex work `{args.work}` · {target.get('publication_year')} · "
        f"{target.get('cited_by_count')} total citations.",
        "",
        "Derived exploration (regenerable via `scripts/explore_forward_citations.py`).",
        "Field labels are OpenAlex's automated `primary_topic` and are noisy for old",
        "or borderline works — treat as hints, verify before curating.",
        "",
        "## Citing works by field",
        "",
        "| Field | Citing works |",
        "|-------|-------------:|",
    ]
    for g in groups:
        lines.append(f"| {g['key_display_name']} | {g['count']} |")
    lines += [
        "",
        f"## Most-cited citing works ({scope}), top {args.top}",
        "",
        "Ranked by the citing work's own citation count.",
        "",
        "| Cited by | Year | Field / subfield | Authors | Title |",
        "|---------:|------|------------------|---------|-------|",
    ]
    for r in rows[: args.top]:
        lines.append(
            f"| {r['cited_by_count']} | {r['year']} | {r['field']} / {r['subfield']} "
            f"| {r['authors'][:32]} | {r['title'][:60]} |"
        )
    md.write_text("\n".join(lines) + "\n")

    with csv_path.open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()) if rows else
                                ["openalex_id", "title", "year", "cited_by_count",
                                 "type", "field", "subfield", "authors", "doi"])
        writer.writeheader()
        writer.writerows(rows)

    print(f"'{title}' — {total} total citations; {len(rows)} in scope ({scope}).")
    print(f"Wrote {md}\nWrote {csv_path}")


if __name__ == "__main__":
    main()
