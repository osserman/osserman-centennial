#!/usr/bin/env python3
"""Semantic Scholar trial: enrich a shortlist of citers with tldr, abstract,
open-access PDF link, and Semantic Scholar's own field classification.

Read-only prototype — nothing is written to the database. Input is a CSV in
the shape produced by rank_forward_by_field.py (must have doi, title,
openalex_id, field columns); default is the FWCI top-6-per-field shortlist
for osserman_forward_v1 (~90 rows). Rows with no DOI are skipped (Semantic
Scholar's batch lookup keys on external IDs, not OpenAlex IDs).

Purpose, per the trial framing: less about citation *context* (why this paper
cites Osserman — that's the citation_function.py workflow) and more about
(a) what each citer paper is actually about, via S2's tldr, as a fast read on
its relationship to minimal-surface theory without reading the full text, and
(b) an open-access PDF link where OpenAlex doesn't have full-text access.

Usage:
    uv run scripts/explore_semantic_scholar.py \
        --input reports/top_by_field_osserman_forward_v1.csv \
        --label osserman_forward_shortlist
"""

import argparse
import csv
import pathlib

from msl import db, semantic_scholar

PROJECT_ROOT = pathlib.Path(__file__).resolve().parents[1]
REPORTS = PROJECT_ROOT / "reports"


def load_shortlist(path: pathlib.Path) -> list[dict]:
    with path.open() as f:
        return list(csv.DictReader(f))


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--input", default=str(REPORTS / "top_by_field_osserman_forward_v1.csv"))
    p.add_argument("--label", default="osserman_forward_shortlist")
    p.add_argument("--api-key", default=None, help="optional Semantic Scholar API key")
    p.add_argument("--db", default=db.DEFAULT_DB_PATH)
    args = p.parse_args()

    rows = load_shortlist(pathlib.Path(args.input))
    with_doi = [r for r in rows if r.get("doi")]
    without_doi = [r for r in rows if not r.get("doi")]
    print(f"{len(rows)} shortlist rows: {len(with_doi)} with DOI, {len(without_doi)} without (skipped)")

    conn = db.connect(args.db)
    client = semantic_scholar.SemanticScholarClient(conn, script="explore_semantic_scholar", api_key=args.api_key)

    dois = [r["doi"] for r in with_doi]
    by_doi = client.batch_papers_by_doi(dois)

    matched = sum(1 for v in by_doi.values() if v is not None)
    with_tldr = sum(1 for v in by_doi.values() if v and v.get("tldr"))
    # openAccessPdf is present (non-None) even for closed-access papers, with an
    # empty url and status: "CLOSED" — only a non-empty url means an actual PDF link.
    with_oa_pdf = sum(1 for v in by_doi.values() if v and (v.get("openAccessPdf") or {}).get("url"))
    print(f"Semantic Scholar matched {matched}/{len(dois)}; {with_tldr} have a tldr; {with_oa_pdf} have an OA PDF link")

    lines = [
        f"# Semantic Scholar trial — {args.label}",
        "",
        f"Enrichment of the {len(with_doi)} DOI-bearing rows from `{args.input}` "
        f"via the Semantic Scholar Graph API `/paper/batch` endpoint. Read-only; "
        f"not written to the database. {len(without_doi)} rows had no DOI and were skipped.",
        "",
        f"Matched: **{matched}/{len(dois)}**. Have a `tldr`: **{with_tldr}**. "
        f"Have an open-access PDF link: **{with_oa_pdf}**.",
        "",
        "`tldr` is Semantic Scholar's own one-sentence auto-summary of the citer paper "
        "— a fast read on how it relates to minimal-surface theory without pulling the "
        "full text. `S2 fields` is Semantic Scholar's independent field classification, "
        "useful as a cross-check against OpenAlex's (both are automated and imperfect).",
        "",
        "| Field (OpenAlex) | Title | S2 fields | TLDR | OA PDF | Identifier |",
        "|-------------------|-------|-----------|------|--------|------------|",
    ]
    for r in with_doi:
        rec = by_doi.get(r["doi"])
        if rec is None:
            lines.append(
                f"| {r['field']} | {r['title'][:50]} | *(no S2 record)* | | | "
                f"[{r['doi']}](https://doi.org/{r['doi']}) |"
            )
            continue
        tldr = (rec.get("tldr") or {}).get("text", "") if rec.get("tldr") else ""
        s2_fields = ", ".join(rec.get("fieldsOfStudy") or [])
        oa_pdf = (rec.get("openAccessPdf") or {}).get("url", "") if rec.get("openAccessPdf") else ""
        oa_link = f"[PDF]({oa_pdf})" if oa_pdf else ""
        lines.append(
            f"| {r['field']} | {r['title'][:50]} | {s2_fields} | {tldr[:220]} | {oa_link} | "
            f"[{r['doi']}](https://doi.org/{r['doi']}) |"
        )
    for r in without_doi:
        lines.append(f"| {r['field']} | {r['title'][:50]} | *(no DOI, not looked up)* | | | {r.get('openalex_id', '')} |")

    md_path = REPORTS / f"semantic_scholar_trial_{args.label}.md"
    md_path.write_text("\n".join(lines) + "\n")

    csv_path = REPORTS / f"semantic_scholar_trial_{args.label}.csv"
    with csv_path.open("w", newline="") as f:
        wr = csv.writer(f)
        wr.writerow(["field", "title", "doi", "openalex_id", "s2_matched", "s2_fields", "tldr", "oa_pdf_url"])
        for r in with_doi:
            rec = by_doi.get(r["doi"])
            if rec is None:
                wr.writerow([r["field"], r["title"], r["doi"], r.get("openalex_id"), False, "", "", ""])
                continue
            tldr = (rec.get("tldr") or {}).get("text", "") if rec.get("tldr") else ""
            s2_fields = ", ".join(rec.get("fieldsOfStudy") or [])
            oa_pdf = (rec.get("openAccessPdf") or {}).get("url", "") if rec.get("openAccessPdf") else ""
            wr.writerow([r["field"], r["title"], r["doi"], r.get("openalex_id"), True, s2_fields, tldr, oa_pdf])
        for r in without_doi:
            wr.writerow([r["field"], r["title"], "", r.get("openalex_id"), None, "", "", ""])

    print(f"Wrote {md_path}\nWrote {csv_path}")


if __name__ == "__main__":
    main()
