# Minimal Surface Lineages

Tracing how the mathematical theory of **minimal surfaces** migrated into applied
disciplines (materials science, biology, architecture, computer graphics,
physics, …), by harvesting curated backward-citation lineages from a small set of
influential "terminal papers" via the [OpenAlex](https://openalex.org) API.

Goals and full methodology: [`projectDescription.md`](projectDescription.md).
The aim is a **small, curated, reproducible** research dataset (≈100 well-chosen
papers), not a comprehensive citation graph.

## Design: three separated layers

The SQLite database (`data/lineages.db`, committed to git) keeps three layers
strictly separate, per the project philosophy:

1. **Raw evidence** — harvested from OpenAlex, never hand-edited, never
   overwritten by analysis. Every row carries `source_json` + `harvested_at`.
2. **Experiment bookkeeping** — which works belong to which `seed_set`, at what
   `generation`, and why.
3. **Human interpretation** — `work_roles`, `paper_tags`, `edge_annotations`,
   `research_notes`; written only by humans, always with rationale + reviewer.

**Derived analyses** (rankings, centralities, …) are never stored in the DB; they
are regenerated from the raw data into `reports/`. Every output is reproducible
from the committed database.

## Setup

Requires [uv](https://docs.astral.sh/uv/).

```bash
uv sync                    # create the venv and install msl + deps
uv run scripts/init_db.py  # create data/lineages.db from db/schema.sql
```

## Pipeline (small composable, idempotent scripts)

```bash
# 1. Resolve each seed in seeds/pilot_v1.yaml to an OpenAlex ID.
#    Review reports/seed_resolution.md, then --write to record confirmed IDs.
uv run scripts/resolve_seeds.py
uv run scripts/resolve_seeds.py --write

# 2. Harvest full metadata for the confirmed seeds (generation 0).
uv run scripts/harvest_seeds.py

# 3. Expand ONE generation backward (seeds' references). No blind recursion.
uv run scripts/expand_backward.py --seed-set pilot_v1

# 4. Rank candidate bridge / ancestor papers (derived analysis → reports/).
uv run scripts/rank_candidates.py --seed-set pilot_v1

# Check API budget usage at any time.
uv run scripts/api_usage.py
```

All scripts are idempotent and safe to re-run: ingest replaces rows in place,
and a partial run can always be resumed.

## OpenAlex API safety

`src/msl/openalex.py` uses the polite pool (identifies via `mailto`), throttles
to ~5 req/s, logs every request to `harvest_log`, and guards the daily budget:
it warns at 50% and **hard-stops at 80%** of OpenAlex's 100k requests/day so an
iterating session cannot get locked out. On 429/5xx it backs off (honoring
`Retry-After`) and aborts cleanly rather than hammering the API.

## Layout

```
db/schema.sql            authoritative, commented DDL
src/msl/                 openalex client · db helpers · ingest/normalization
scripts/                 init_db · resolve_seeds · harvest_seeds · expand_backward · rank_candidates · api_usage
seeds/pilot_v1.yaml      human-curated seed set with resolved OpenAlex IDs
data/lineages.db         the committed database (raw evidence)
reports/                 regenerable derived outputs + pilot methodology notes
```

## Pilot status

The v1 pilot (6 seeds, one generation back) has been run. Key finding: OpenAlex
reference coverage is very uneven — 4 of 6 seeds return zero references — so
backward-only tracing misses older works, while the graphics lineage reaches
classical minimal-surface geometry in a single generation. Details, numbers, and
recommended next steps: [`reports/pilot_methodology_notes.md`](reports/pilot_methodology_notes.md).
