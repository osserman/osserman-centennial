#!/usr/bin/env python3
"""Rank candidate bridge / ancestor papers for a seed set (derived analysis).

Pure function of the raw graph — writes only to reports/, never to the database,
and is fully regenerable. Produces two rankings:

  A. Generation-1 works (fully harvested): the seeds' direct intellectual
     ancestry. Scored by how many distinct seeds cite them (cross-tree
     convergence, the primary bridge signal), their mathematics/geometry topic
     weight, recency, and citation count.

  B. Convergent frontier (generation-2 stubs, not yet harvested): works cited by
     multiple already-harvested papers, ranked by in-degree. These are the
     strongest candidates to harvest in the next generation — likely common
     mathematical ancestors.

Outputs reports/candidate_bridges_<seed_set>.md and .csv.

Usage: uv run scripts/rank_candidates.py [--seed-set pilot_v1] [--db PATH]
"""

import argparse
import csv
import pathlib

from msl import db

PROJECT_ROOT = pathlib.Path(__file__).resolve().parents[1]
REPORTS = PROJECT_ROOT / "reports"

# Concept/topic signals that indicate proximity to the mathematical source.
MATH_FIELDS = {"Mathematics"}
MATH_CONCEPT_KEYWORDS = (
    "minimal surface", "geometry", "differential geometry", "topology",
    "curvature", "mathematical analysis", "manifold", "calculus of variations",
)


def math_score(conn, work_id: str) -> float:
    """0..~1: fraction of the work's topic weight sitting in Mathematics,
    boosted by geometry-flavored legacy concepts."""
    topics = conn.execute(
        "SELECT t.field_name, wt.score FROM work_topics wt "
        "JOIN topics t ON t.openalex_id = wt.topic_id WHERE wt.work_id = ?",
        (work_id,),
    ).fetchall()
    total = sum((s or 0) for _, s in topics) or 1.0
    math = sum((s or 0) for f, s in topics if f in MATH_FIELDS)
    field_frac = math / total

    concepts = conn.execute(
        "SELECT c.display_name, wc.score FROM work_concepts wc "
        "JOIN concepts c ON c.openalex_id = wc.concept_id WHERE wc.work_id = ?",
        (work_id,),
    ).fetchall()
    concept_boost = max(
        [s or 0 for name, s in concepts if name and
         any(k in name.lower() for k in MATH_CONCEPT_KEYWORDS)],
        default=0.0,
    )
    return round(min(1.0, field_frac + 0.5 * concept_boost), 3)


def seeds_citing(conn, seed_set_id: str, work_id: str) -> list[str]:
    """Titles of generation-0 seeds that cite work_id."""
    rows = conn.execute(
        """
        SELECT w.title FROM work_references r
        JOIN seed_set_works s ON s.work_id = r.citing_work_id
                              AND s.seed_set_id = ? AND s.generation = 0
        JOIN works w ON w.openalex_id = r.citing_work_id
        WHERE r.cited_work_id = ?
        """,
        (seed_set_id, work_id),
    ).fetchall()
    return [r[0] for r in rows]


def rank_generation1(conn, seed_set_id: str) -> list[dict]:
    ids = [
        r[0]
        for r in conn.execute(
            "SELECT work_id FROM seed_set_works WHERE seed_set_id = ? AND generation = 1",
            (seed_set_id,),
        )
    ]
    rows = []
    for wid in ids:
        w = conn.execute(
            "SELECT title, publication_year, cited_by_count FROM works WHERE openalex_id = ?",
            (wid,),
        ).fetchone()
        citing = seeds_citing(conn, seed_set_id, wid)
        rows.append(
            {
                "openalex_id": wid,
                "title": w["title"] or "",
                "year": w["publication_year"],
                "cited_by_count": w["cited_by_count"],
                "n_seeds_citing": len(citing),
                "math_score": math_score(conn, wid),
                "seeds_citing": " | ".join(t[:40] for t in citing if t),
            }
        )
    # Sort: cross-seed convergence first, then math proximity, then citations.
    rows.sort(
        key=lambda r: (r["n_seeds_citing"], r["math_score"], r["cited_by_count"] or 0),
        reverse=True,
    )
    return rows


def rank_frontier(conn, seed_set_id: str, min_indegree: int = 2) -> list[dict]:
    """Un-harvested (stub) works cited by >= min_indegree already-harvested works
    in this seed set. In-degree = number of distinct harvested citers."""
    rows = conn.execute(
        """
        SELECT r.cited_work_id AS wid,
               COUNT(DISTINCT r.citing_work_id) AS indeg,
               w.title, w.is_stub
        FROM work_references r
        JOIN seed_set_works s ON s.work_id = r.citing_work_id AND s.seed_set_id = ?
        JOIN works w ON w.openalex_id = r.cited_work_id
        GROUP BY r.cited_work_id
        HAVING indeg >= ?
        ORDER BY indeg DESC, wid
        """,
        (seed_set_id, min_indegree),
    ).fetchall()
    return [
        {
            "openalex_id": r["wid"],
            "in_degree": r["indeg"],
            "harvested": "no (stub)" if r["is_stub"] else "yes",
            "title": r["title"] or "(stub — title not yet harvested)",
        }
        for r in rows
    ]


def write_outputs(seed_set_id: str, gen1: list[dict], frontier: list[dict]) -> None:
    md = REPORTS / f"candidate_bridges_{seed_set_id}.md"
    csv_path = REPORTS / f"candidate_bridges_{seed_set_id}.csv"

    lines = [
        f"# Candidate bridges & ancestors — {seed_set_id}",
        "",
        "Derived analysis, regenerable via `scripts/rank_candidates.py`. Not a",
        "human judgment: these are ranked leads for manual review. Record decisions",
        "in the `work_roles` / `paper_tags` tables, never by editing this file.",
        "",
        "## A. Generation-1 ancestry (fully harvested seed references)",
        "",
        "Ranked by number of seeds citing (cross-tree convergence), then Mathematics",
        "topic weight, then citation count.",
        "",
        "| OpenAlex | Title | Year | Cited by | # seeds | Math score | Seeds citing |",
        "|----------|-------|------|----------|---------|------------|--------------|",
    ]
    for r in gen1:
        lines.append(
            f"| `{r['openalex_id']}` | {r['title'][:60]} | {r['year']} | "
            f"{r['cited_by_count']} | {r['n_seeds_citing']} | {r['math_score']} | {r['seeds_citing']} |"
        )
    lines += [
        "",
        "## B. Convergent frontier (candidates to harvest next)",
        "",
        "Un-harvested works cited by ≥ 2 already-harvested papers — likely common",
        "ancestors. Harvest the strongest of these next (not by blind recursion).",
        "",
        "| OpenAlex | In-degree | Harvested | Title |",
        "|----------|-----------|-----------|-------|",
    ]
    for r in frontier:
        lines.append(
            f"| `{r['openalex_id']}` | {r['in_degree']} | {r['harvested']} | {r['title'][:70]} |"
        )
    if not frontier:
        lines.append("| — | — | — | (no work is cited by 2+ harvested papers yet) |")
    md.write_text("\n".join(lines) + "\n")

    with csv_path.open("w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["section", "openalex_id", "title", "year", "cited_by_count",
                         "n_seeds_citing", "math_score", "in_degree", "harvested"])
        for r in gen1:
            writer.writerow(["generation1", r["openalex_id"], r["title"], r["year"],
                             r["cited_by_count"], r["n_seeds_citing"], r["math_score"], "", ""])
        for r in frontier:
            writer.writerow(["frontier", r["openalex_id"], r["title"], "", "", "", "",
                             r["in_degree"], r["harvested"]])
    print(f"Wrote {md}\nWrote {csv_path}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--seed-set", default="pilot_v1")
    parser.add_argument("--db", default=db.DEFAULT_DB_PATH)
    args = parser.parse_args()

    conn = db.connect(args.db)
    gen1 = rank_generation1(conn, args.seed_set)
    frontier = rank_frontier(conn, args.seed_set)
    write_outputs(args.seed_set, gen1, frontier)
    print(f"\nGeneration-1 works ranked: {len(gen1)}")
    print(f"Convergent frontier candidates (in-degree ≥ 2): {len(frontier)}")


if __name__ == "__main__":
    main()
