# Pilot methodology notes — pilot_v1

*Generated after the first end-to-end run (seeds → one backward generation →
ranking). Purpose, per `projectDescription.md`, is to interrogate the
**methodology**, not to produce a finished graph.*

## What was run

Seed set `pilot_v1`: six curated works, all resolved in OpenAlex with high
confidence (see [seed_resolution.md](seed_resolution.md)), one generation
expanded backward. Result: **63 fully-harvested works**, 692 further stub works
at the frontier, 1,233 citation edges. Total OpenAlex requests: ~38.

Two seed-metadata corrections surfaced during resolution and are worth recording:
Hyde et al. is **1988**, not 1990 (the DOI `10.1021/cr00083a011` is Chem. Rev.
88; the "1990" in the brief was slightly off), and the Gompper & Schick volume
*Self-Assembling Amphiphilic Systems* is **1995**. The OpenAlex/DOI records are
authoritative here.

## The headline finding: OpenAlex reference coverage is wildly uneven

Outgoing references (`referenced_works`) present per seed:

| Seed | Year | Publisher / venue | Refs in OpenAlex |
|------|------|-------------------|-----------------:|
| Ryu & Takayanagi | 2006 | APS — Phys. Rev. Lett. | 42 |
| Pinkall & Polthier | 1993 | Taylor & Francis — Experimental Mathematics | 17 |
| Hyde et al. | 1988 | ACS — Chemical Reviews | **0** |
| Hajduk et al. | 1994 | ACS — Macromolecules | **0** |
| Gompper & Schick | 1995 | Physics Today | **0** |
| Schoen (NASA TN) | 1970 | NASA TRS (no DOI) | **0** |

Four of six seeds have **no** outgoing references in OpenAlex. This is the single
most important methodological result of the pilot: **backward citation tracing
works only where the publisher deposited a reference list to Crossref**, which is
where OpenAlex sources most citation edges.

The cause is *publisher deposition, not age.* The distinguishing variable is who
published the paper, verified by querying Crossref directly:

- Both ACS papers (Hyde, Hajduk) return `reference-count = 0` from Crossref — ACS
  historically did not deposit reference lists. APS (Ryu & Takayanagi) deposits
  them (Crossref has 29; OpenAlex shows 42 because it supplements with arXiv and
  the retired Microsoft Academic Graph).
- Age is ruled out directly: Pinkall & Polthier (1993) is *older* than Hajduk
  (1994) and Gompper & Schick (1995) yet carries 17 references, purely because its
  publisher deposited them.
- Schoen's NASA Technical Note is a separate mechanism: no DOI, `indexed_in = []`,
  present in OpenAlex only via MAG. There is no machine-readable reference list
  for it anywhere — its ancestry will always need manual reconstruction.
- **Resolution caveat (Gompper & Schick):** the record we matched is a *Physics
  Today* item (0 references), almost certainly a short book notice rather than the
  actual review, which is a chapter in *Phase Transitions and Critical Phenomena*
  vol. 16 (Academic Press). Re-resolve this seed before relying on it.

Consequence for the project: a purely backward, citation-only strategy will
silently miss the ancestry of exactly the historically important older works we
most care about, and the gap correlates with *publisher*, not year. Those
lineages will require either (a) the *forward* direction — who cites the seed —
which OpenAlex populates far better regardless of the seed's own publisher, or
(b) manual historical reconstruction (see below).

## Does the citation graph preserve the mathematical lineage?

**Where references exist, yes — and impressively fast.** Pinkall & Polthier
(computer graphics, 1993) reaches classical minimal-surface mathematics in a
**single** generation. Its generation-1 ancestry includes:

- Douglas / Radó era Plateau problem: *Solution of the problem of Plateau* (1931),
  *The problem of the least area and the problem of Plateau* (1930)
- Courant, *Dirichlet's Principle, Conformal Mapping, and Minimal Surfaces* (1977)
- *The triply periodic minimal surfaces of Alan Schoen and their constant mean
  curvature companions* (1989) — the geometric literature built directly on our
  Schoen seed
- classical differential geometry: minimal surfaces in S³, Scherk's surfaces,
  complete minimal surfaces of finite total curvature

So for the graphics branch, "how many generations back before classical geometry
appears?" is answered: **one**.

The Ryu & Takayanagi (holography, 2006) generation-1 set is coherent but stays
inside theoretical physics one generation back (Maldacena's large-N limit, GKP,
Bousso's covariant entropy bound, conformal-anomaly and entanglement-entropy
papers). The minimal-*surface* content there is the Ryu–Takayanagi prescription
itself; the *mathematical* ancestry (minimal hypersurfaces / area functionals)
is conceptual and does not appear as a citation edge at depth 1. This branch will
need more generations, or a manual bridge, to reach the geometry.

## Do bridge papers emerge on their own?

**Within a discipline, yes; across disciplines, not yet.** The convergent-frontier
analysis (works cited by ≥2 harvested papers) returns 244 candidates, but every
high-in-degree node sits *inside* one subtree — the top of the list is pure
AdS/CFT (Maldacena in-degree 12, GKP 11, "Entropy and area", "Anti-de Sitter
space and holography"). **No work is yet cited by both the graphics subtree and
the physics subtree.** At depth 1 the two lineages are entirely disjoint: minimal
surfaces entered discrete-geometry/graphics and entered holography through
completely separate literatures. Testing whether they share a common
*mathematical* ancestor (they plausibly do, deeper down — e.g. the calculus of
variations / area-minimization) requires expanding another generation from the
retained geometry papers.

## How fast do the trees grow?

Manageably, so far. One generation from 2 reference-bearing seeds → 57 new
works. Those 57 in turn reference 692 distinct further works (the current
frontier). Growth is dominated entirely by the two well-referenced seeds; the
four zero-reference seeds contribute nothing backward. Blind recursion from all
692 frontier works would balloon quickly, which is why the plan's rule — expand
only from *manually retained* bridge papers — matters. The convergent-frontier
ranking exists precisely to pick those few.

## Which influences will citation data miss (needing manual reconstruction)?

- **The four zero-reference seeds' entire ancestry** (Hyde, Hajduk, Gompper &
  Schick, Schoen) — invisible to backward tracing; reconstruct via forward
  citations or by hand.
- **Frei Otto / architectural soap-film form-finding** — anticipated in the
  brief as a historical influence unlikely to appear as an OpenAlex edge;
  confirmed out of scope for automated tracing.
- **Cross-disciplinary conceptual inspiration** generally — e.g. the physical
  intuition that soap films minimize area informing physics/biology without a
  formal citation. These are exactly what the `edge_annotations` table
  (relation_type = conceptual_inspiration / historical_attribution) is for.

## Recommended refinements before scaling up

1. **Add a forward-citation harvester** (`cited_by` direction). It is the only
   automated way to build lineage around the older zero-reference seeds, and
   OpenAlex populates it well. This is the biggest single improvement.
2. **Expand generation 2 selectively** from the retained geometry papers
   (Courant 1977, the Schoen-companions 1989 paper, the Plateau-problem classics)
   to test whether the graphics and physics branches meet at a common
   mathematical ancestor.
3. **Begin manual curation** now that real candidates exist: assign `work_roles`
   (Schoen 1970 and Courant 1977 as `mathematical_root`/`bridge_paper`; the six
   seeds as `terminal_paper`) with rationale, so interpretation accretes from the
   first curated papers rather than later.
4. Keep the zero-reference seeds flagged (`paper_tags` = `needs_manual_review`)
   so their missing ancestry is never mistaken for genuine absence of influence.

## Addendum: forward-citation probe — Osserman, *A Survey of Minimal Surfaces*

To test the forward (`cited_by`) direction and the idea of a mathematical work
radiating *outward*, we probed Osserman's *A Survey of Minimal Surfaces*
(OpenAlex `W2139502098`, 1969). Full ranked data:
[forward_citations_osserman_survey.md](forward_citations_osserman_survey.md) /
`.csv`, regenerable via `scripts/explore_forward_citations.py`.

**This is a slightly different kind of exploration from the backward-tracing
pilot, and the distinction matters for interpretation.** The *Survey* is a
textbook — an authoritative synthesis and pedagogical entry point — not the
source of the original mathematical discoveries it describes. So its forward
citations map **pedagogical provenance** (how practitioners in other fields
*learned* and *entered* minimal-surface theory) rather than **mathematical
provenance** (where a result was first proven). A materials scientist or
computer-vision researcher citing Osserman is typically signaling "this is where
I picked up the machinery," not attributing a theorem to him. Both lineages are
in scope for the project — the brief explicitly values the teaching/synthesis
channel alongside original discovery — but a node like the *Survey* should be
read as a **conduit / gateway**, and eventually annotated as such (e.g.
`work_roles.role = review` or a dedicated bridge/gateway tag), distinct from the
`mathematical_root` papers where the ideas originated.

Note also (provenance): OpenAlex holds a single edition-consolidated record for
the *Survey* (1969, DOI-less, from MAG); citations to the 1986 Dover expanded
edition are folded into this same node rather than counted separately.

For a monograph, the reach is substantial: **1,032 citations, of which ~317 sit
outside mathematics.** OpenAlex's field split of the citing works:

| Field | Citing works |
|-------|-------------:|
| Mathematics | 715 |
| Engineering | 104 |
| Physics & Astronomy | 82 |
| Computer Science | 74 |
| Materials Science | 16 |
| (Social Sci, Earth, Bio, Chem, …) | ~40 |

Genuinely cross-disciplinary, influential descendants (ranked by their own
citation counts) — several open migration routes not in the current seed list:

- **String theory / high-energy physics.** Gibbons, *Born–Infeld particles and
  Dirichlet p-branes* (1998, ~530 cites) and Yang, *Classical solutions in the
  Born–Infeld theory* (2000, ~89). A striking, unexpected route into brane
  physics — distinct from the Ryu–Takayanagi holography branch.
- **Computer vision.** The geodesic-active-contours lineage: Caselles–Kimmel–
  Sapiro, *Minimal surfaces based object segmentation* (1997, ~198) and its
  companions (Malladi–Kimmel ~87, Caselles ~83). Minimal-surface variational
  methods became a foundation of image segmentation — a CS route separate from
  the discrete-geometry/graphics branch (Pinkall–Polthier).
- **Biomedical / tissue engineering.** Zadpoor, *Bone tissue regeneration: the
  role of scaffold geometry* (2014, ~519) and *Additively manufactured porous
  metallic biomaterials* (2019, ~202). Corroborates the tissue-engineering branch
  in the brief.
- **Biophysics / biology.** Zandi & Dragnea, *On virus growth and form* (2020,
  ~157); Savadjiev et al., *Heart-wall myofibers arranged in minimal surfaces*
  (2012, ~62).
- **Soft matter / materials.** Rey, *Capillary models for liquid-crystal fibers
  and membranes* (2007, ~105); Benedicto & Bates, *Bicontinuous cubic morphologies
  in block copolymers* (1997, ~60); Terrones & Mackay, TPMS-decorated carbon
  (1993, ~59); Goldstein et al., *Soap-film Möbius strip changes topology* (2010,
  ~52, PNAS).

**Caveat — automated field labels are noisy.** OpenAlex's `primary_topic` field
misclassifies several pure-mathematics works as non-math: the single most-cited
"non-math" hit is Gilbarg & Trudinger's *Elliptic PDEs of Second Order* (~1,376,
labeled Computer Science), which is a mathematics textbook; likewise Costa's
minimal-immersion paper, Colding–Minicozzi, and several Meeks papers are math
despite non-math labels. Field counts are hints for triage, not ground truth —
verify each candidate before curating.

**What this establishes for the methodology.** The forward direction works well
even for a foundational work whose *own* reference list would be thin, and it
surfaces real cross-disciplinary descendants (string theory, computer vision,
tissue engineering) that backward tracing from the current seeds does not reach.

**Now persisted in the database.** The forward path is harvested by
`scripts/harvest_forward.py` into seed set **`osserman_forward_v1`**: Osserman's
*Survey* at generation 0 and **all 1,032 direct citers at generation -1**
(negative generations = forward/descendant direction). The citing edge
(citer → Survey) is recorded explicitly, independent of each citer's own
`referenced_works`, so every descendant edge is present regardless of publisher
deposition. Each citer keeps its OpenAlex primary field, so analyses can slice
the 715 mathematics vs. ~317 non-mathematics citers.

**Citation-function classification (the crucial next question).** *Why* each
descendant cites the Survey is now a first-class, curatable axis:
`edge_annotations.citation_function`, controlled vocabulary in
[docs/citation_function_codes.md](../docs/citation_function_codes.md)
(gateway_pedagogical / classical_foundation / specific_theorem /
historical_context / weak_misc). Workflow via `scripts/citation_function.py`:
`worksheet` exports edges to classify (ordered by citer influence, with context
columns), `import` loads the filled sheet, `report` computes the distribution
split by all / non-math / math. The hypothesis worth testing — that a large
fraction of *non-math* citers use the Survey as a **gateway** ("for an
introduction, see Osserman…") — would be strong evidence of the Survey as a
teaching conduit into other fields.

Because OpenAlex exposes no citation context, classification is currently manual
(the report starts at 0/1,032 classified). The highest-leverage automation here
is **Semantic Scholar**, which provides per-citation `contexts` and `intents`;
using it to pre-populate `citation_function` (humans verifying rather than
reading every paper) is the recommended next capability.

**Caveat reminder for the field split:** the 715/317 math/non-math split relies
on OpenAlex's noisy `primary_topic` labels — the citation-function report notes
this, and the math/non-math slices should be read as approximate.

## Addendum: systematic per-field ranking, and a better impact metric than raw citations

The hand-picked examples above were superseded by
[scripts/rank_forward_by_field.py](../scripts/rank_forward_by_field.py), which
groups all 1,032 `osserman_forward_v1` citers by OpenAlex primary field and
ranks the top N within each field — no eyeballing, systematic and
regenerable. Output: [top_by_field_osserman_forward_v1.md](top_by_field_osserman_forward_v1.md)
/ `.csv`. Each row also carries a clickable identifier (DOI, or OpenAlex ID
where no DOI exists) for easier lookup.

**Raw `cited_by_count` is a poor cross-field ranking metric**, because it's
dominated by field size — Engineering will always out-cite Geodesy regardless
of relative influence. OpenAlex's harvested JSON already carries a
field-normalized alternative that we weren't extracting: `fwci` (field-weighted
citation impact — 1.0 = average for the same field/year/work-type) and
`citation_normalized_percentile` (with top-1%/top-10% flags). These required no
new API calls; they were sitting in `source_json` from the original harvest and
are now backfilled into `works.fwci` / `works.citation_pctile` /
`works.top_1_percent` / `works.top_10_percent`, and populated automatically by
`ingest.py` on future harvests. `rank_forward_by_field.py` now ranks by FWCI by
default (`--rank-by cited_by_count` restores the old ordering).

Re-ranking surfaced work the raw-count list missed. The clearest case: Jin-Tzu
Chen's 1980 capillary-surfaces paper (*On the existence of capillary free
surfaces in the absence of gravity*) has only 24 citations — it would never
have appeared in a raw top-6 — but an FWCI of **183.7**, by far the highest of
any citer in the dataset, because it's being compared against a very small
same-field/year cohort. Whether that reflects genuine outsized influence or is
an artifact of a thin comparison cohort (small field, old paper) needs a
manual look; it's exactly the kind of candidate FWCI is meant to surface and
raw citation count would hide.

One coverage gap: 232 of 1,032 works (mostly stubs referenced but never
fully harvested) have no `fwci`; those rows sort by citation count as a
fallback rather than dropping out of the ranking.
