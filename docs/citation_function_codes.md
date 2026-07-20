# Citation-function codes

A controlled vocabulary for **why** a work cites another — stored in
`edge_annotations.citation_function`. This is a *separate axis* from
`edge_annotations.relation_type` (which records the nature of the intellectual
link). Citation function answers: what role does the cited work play for the
citing author?

Motivation: for a foundational *synthesis* like Osserman's *A Survey of Minimal
Surfaces*, the distribution of citation functions is itself the finding. If most
non-mathematics citers use it as a **gateway** ("for an introduction, see
Osserman…"), that is strong evidence the Survey functioned as a teaching conduit
by which minimal-surface theory entered other fields — a different story from its
being cited for a **specific theorem**.

## Codes

| Code | ChatGPT category | Meaning |
|------|------------------|---------|
| `gateway_pedagogical` | Introductory background | Cited as an entry point / tutorial / "for an introduction, see…". Signals teaching and field-entry. |
| `classical_foundation` | Classical theory | Cited as the established body of theory the work builds on, as background foundation (not one specific result). |
| `specific_theorem` | Specific theorem | A specific result, definition, formula, or construction from the cited work is used in the research. |
| `historical_context` | Historical reference | Attribution or historical framing ("first studied by…", origin of a term/idea). |
| `weak_misc` | Miscellaneous | Incidental, boilerplate, list-citation, or too weak/ambiguous to classify as evidence. |

`NULL` / blank = **not yet classified**.

## How classification is done

OpenAlex does **not** expose citation context (the sentence around the
reference), so these codes are assigned by **human review** of the citing paper.
The worksheet exported by `scripts/citation_function.py worksheet` lists each
edge with context columns (title, field, type, influence) ordered by influence,
so the most consequential citers are classified first.

Future semi-automation: **Semantic Scholar** exposes citation `contexts` and
`intents` per citation edge (listed as a candidate source in the project brief).
That is the natural way to pre-populate these codes at scale, leaving humans to
verify rather than read every paper from scratch.

## Workflow

```bash
# 1. Export a worksheet of un-annotated edges into the cited work.
uv run scripts/citation_function.py worksheet --seed-set osserman_forward_v1

# 2. Fill the citation_function (and optional rationale) columns in the CSV.

# 3. Import the filled worksheet back into edge_annotations.
uv run scripts/citation_function.py import --file reports/citation_function_worksheet_osserman_forward_v1.csv

# 4. Report the distribution (the "what fraction are pedagogical?" analysis).
uv run scripts/citation_function.py report --seed-set osserman_forward_v1
```
