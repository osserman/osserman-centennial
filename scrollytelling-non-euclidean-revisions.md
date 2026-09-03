# Non-Euclidean stanza — revision log

What was removed or reframed, and how to get it back. Everything here is in
git history; nothing was lost. Baseline before this round of edits: **`585413f`**.

```bash
git show <sha>              # the change itself
git show <sha> --stat       # just the files touched
git show <sha>^:<path>      # a file exactly as it was BEFORE that commit
git revert <sha>            # undo it as a new commit (safe on pushed history)
```

---

## Removed outright

### Gauss' Survey of a Curved Planet — the whole slide · `e045889`

A full-viewport cover slide that sat between the sphere scene and the
azimuthal sequence. Title, four body paragraphs (Gauss surveying the Kingdom
of Hannover in 1818, triangles as surveying tools, curvature deduced from
measurements taken on the surface), a `visualLabel` for a visual never built,
and the `[NOTE: ...]` placeholder. It had no scene-panel visual and was
special-cased out of `scrollySlides`.

```bash
git show e045889^:viz/src/lib/content/nonEuclideanGeometry.js   # slide text
git show e045889 -- viz/src/routes/non-euclidean-geometry/+page.svelte  # its markup
```

Nothing referenced it by index — the page keys every slide by id — so
restoring means re-adding the slide object plus its `<section class="cover-section">`.

### The "will intersect ←/→" verdict · `6b5156a`

A live readout under the parallel-postulate figure naming which side the two
lines would meet on. Dropped because the beat no longer tests a threshold:
the lines are parallel throughout, so it read the same on every frame.
Removed entirely — the derived value, the arrow markup, and the `.verdict` /
`.verdict-arrow` styles.

### The duplicate bottom wedge · `7b4170c`

`wedgeB1` / `labelB1` in `ParallelPostulateScene`. Verified byte-identical to
`wedgeB1Base` at every angle of the sweep, so it was deleted rather than
cross-faded — `.wedge` is `0.88` opacity and two stacked copies read darker
than one.

---

## Reframed (old version still in history)

### Parallel postulate opening · `00c73e6`

**Was:** Euclid's original statement — two lines at an angle, the *top line*
rotating through parallel, angle sum sweeping `< 180` → `= 180` → `> 180`,
with the meet-side flipping. Constants `TOP_ANGLE_START` / `TOP_ANGLE_OVERSHOOT`.

**Now:** two lines parallel and fixed from the first frame; the *transversal*
sweeps (70° → 108° → 70°, through perpendicular) while the same-side interior
angles trade size and their sum never leaves 180.

The old subtitle and its two captions are in `git show 00c73e6`.

### Trailing spacers · `c367fff`

Hardcoded CSS heights (`380` / `720` / `3020vh`) replaced by
`spacerVh(span) = span + hold + panel`. The old numbers left under one screen
of pinned time after each animation finished, because a sticky 100vh panel
starts scrolling away a full panel-height before its `<main>` ends.

---

## Still present but unused

**`euclid` slide** (`Euclid's Geometry`) is in `nonEuclideanGeometry.js` but
rendered nowhere — not in `scrollySlides`, not `slides[0]`, not the last
slide. Predates this round of edits. Either wire it in or delete it; the
parallel-postulate slide may now cover its ground, since it opens on Euclid
and the flat infinite plane.

**`gauss-survey` and `imaginary-curvature` placeholder notes.** The
`imaginary-curvature` `[NOTE: ...]` marker is still live and renders publicly
(intended — see `585413f`). The `gauss-survey` one went with its slide.
