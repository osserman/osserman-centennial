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

| Seed | Year | References in OpenAlex |
|------|------|------------------------|
| Ryu & Takayanagi | 2006 | 42 |
| Pinkall & Polthier | 1993 | 17 |
| Hyde et al. | 1988 | **0** |
| Hajduk et al. | 1994 | **0** |
| Gompper & Schick | 1995 | **0** |
| Schoen (NASA TN) | 1970 | **0** |

Four of six seeds have **no** outgoing references in OpenAlex. This is the single
most important methodological result of the pilot: **backward citation tracing
works only where OpenAlex has reference data, and coverage collapses for older
papers, books/book-chapters, and grey literature.** The two seeds that do carry
references are the born-digital / physics-preprint-era works.

Consequence for the project: a purely backward, citation-only strategy will
silently miss the ancestry of exactly the historically important older works we
most care about. Those lineages will require either (a) the *forward* direction —
who cites the seed — which OpenAlex populates far better, or (b) manual
historical reconstruction (see below).

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
