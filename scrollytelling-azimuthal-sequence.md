# Azimuthal → Poincaré sequence

Where the projection sequence in the *Non-Euclidean Geometry* stanza has landed.

Component: `viz/src/lib/components/AzimuthalProjectionScene.svelte`
Scrub harness: `/projection-lab` (unlisted) — stage buttons, play/pause, arrow-key stepping
Live page: `/non-euclidean-geometry`

One scripted `progress` value from **0 to 6.5** drives everything. Scroll pacing is
derived from the caption text at runtime (see *Pacing* below), so editing the
narrative re-paces the page automatically.

---

## The sixteen beats

| # | Progress | On screen (caption) | What happens |
|---|---|---|---|
| 1 | 0 – 0.20 | There are many different ways to view the surface of a sphere in 2 dimensions. | Shaded Earth, side-on, rotating. |
| 2 | 0.20 – 0.36 | One starts by making twelve cuts, pole to pole — like scoring an orange before peeling it. | Rotation stops; twelve orange meridians draw on, pole to pole. |
| 3 | 0.36 – 0.52 | We can also add some equally sized circles on the surface that we'll track as we look at different versions of our map. | Tissot circles appear down the middle of one gore — the distortion gauge for everything that follows. |
| 4 | 0.52 – 0.62 | Now we'll peel each segment up towards the north pole, and press them flat. | Globe tilts to a north-pole view and shrinks to a small reference map; the flat panel opens beside it. |
| 5 | 0.62 – 1.00 | With the North Pole in the center we can make a circular map of the world… | The twelve gores splay out flat around the pole — the orange-peel projection. Gaps between the petals are the sphere's curvature, made visible. |
| 6 | 1.00 – 1.30 | by stretching out each segment to meet each other. Look how increasingly distorted our reference circles are now. | Gores widen until the gaps close: azimuthal equidistant. Tissot circles smear tangentially, worse the further out. |
| 7 | 1.30 – 1.45 | The whole rim is the south pole. The equator (the blue circle) is spaced halfway from the center of our circular map to the edge. | Orange rim circle and blue equator draw on. A single point stretched into the entire boundary. |
| 8 | 1.45 – 1.70 | The "parallel lines" from before - now in orange - appear as straight lines, intersecting at the north pole, and both reaching the edge as they "intersect" again at the South Pole. | Full great circles drawn as straight radial lines; right-angle marks at the equator. Two "parallels" that meet twice. |
| 9 | 1.70 – 2.60 | But these lines - both the equator and "parallel lines" shift as we rotate the center of the map to some places Osserman spent time. | Both panels rotate through Osserman's places. Straight lines bend, the equator goes oval — the projection's centre is the only honest point. |
| 10 | 2.60 – 3.00 | Now drag either view to put yourself at the center. | **Interactive.** Free quaternion drag on either panel. |
| 11 | 3.00 – 3.80 | Now that we've explored this view of the world, let's look at a related one. | Rotates home to the pole, drifts to centre, the reference globe fades out. |
| 12 | 3.80 – 4.35 | If we want to make our reference circles circular once again we can achieve that by stretching the map out in all directions. But in doing so our map is no longer finite, as the South Pole moves off the map to infinity. | Morph to stereographic. Circles round out (conformal), the map floods past the frame. Framed on the inhabited north, not Antarctica. |
| 13 | 4.35 – 4.85 | This last view is a finite world that needs infinite paper. … Our map of it however fits in a finite circle. | Zoom out and out; the edge keeps receding. Finite world, infinite paper — then the hinge to a new surface. |
| 14 | 4.85 – 5.35 | Here, instead of reference circles … growing as they extend from the center, here they shrink. The outer rim of the circle … represents all points that are infinitely far away in the space. | The Poincaré disc. Same-sized circles now *shrink* outward, crowding a rim that is infinitely far away. `tan` became `tanh` — one character. |
| 15 | 5.35 – 5.85 | Infinitely long lines in our space appear as arcs, only looking straight when they pass through the center. | Geodesics draw in, meeting the rim at right angles. The centre shifts by a Möbius translation: straight lines bow, bowed ones straighten. |
| 16 | 5.85 – 6.50 | This disk - the Poincaré disk - … became the inspiration for the endless tessellations of MC Escher in his "Circle Limit" works. | The alternated octagonal tiling h{8,3} builds out — the scaffold under *Circle Limit III*. Tiles shrink forever, never reaching the rim. |

Callouts and continent labels ride along; the Tissot circles fade before beat 15 so
the geodesics read cleanly, and the geodesics fade before the tiling.

---

## Two ideas the sequence is built to land

1. **Beats 5–8 — a flat map of a curved surface must lie.** Gaps, or stretch. The
   Tissot circles are the ledger, and the rim is one point smeared into a whole
   boundary.
2. **Beats 12–16 — the hinge.** Stereographic keeps angles honest but needs infinite
   paper for a finite world. The Poincaré disc is the exact inversion: infinite world,
   finite paper. Both are radial profiles, `r = 2·tan(ρ/2)` against `r = tanh(d/2)`.

## Pacing

Uniform pacing gave beats between 52 and 480vh per 100 characters — stage boundaries
were tuned for choreography, captions weren't. Scroll now maps piecewise-linearly
through a table built from `CAPTIONS`: text length for reading time plus animation
span so a long dissolve isn't rushed for being briefly captioned, normalised to
2900vh (spacer 3020vh, the extra a hold on the finished tiling). Spread: **3.9×**.
Beat 10 has a floor — it must be noticed and acted on, and 51 characters under-price
that. Constants live in `viz/src/routes/non-euclidean-geometry/+page.svelte`.

## Open

- **The Escher motif.** *Circle Limit III* is in copyright (M.C. Escher Company); the
  Wikipedia file is non-free. The tiling scaffold is drawn and correct; no motif sits
  in it. Licence, link-out, or an original motif — an unmade decision, not an
  oversight.
- **Tiling reach** stops at 0.975 of the radius (density vs. reach tradeoff).
- **Tile editor** (`/projection-lab` §5) has two control points per side.
