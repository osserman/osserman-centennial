# The piece as it currently stands

Three stanzas, two asides, one dev harness. Narrative text is quoted as written;
scenes are described in broad strokes only — for beat-by-beat detail see
`scrollytelling-azimuthal-sequence.md`, and for what changed and why see
`scrollytelling-non-euclidean-revisions.md`.

| | Route | Shape |
|---|---|---|
| **Front door** | `/` | static essay + stanza cards |
| **Stanza I** | `/non-euclidean-geometry` | scrollytelling, 4 scenes |
| **Stanza II** | `/minimal-surfaces` | scrollytelling, 4 scenes + placeholders |
| **Stanza III** | `/beyond-mathematics` | scroll-driven citation graph |
| aside | `/pseudosphere` | interactive, linked from I |
| aside | `/circle-limit` | interactive, linked from I |
| dev only | `/projection-lab` | unlisted scrubber |

---

# Front door — "A Mathematical Ode to My Father"

`/` · *Written for the centennial of Robert Osserman*

The personal frame the whole piece hangs on: why this subject, by someone who
says outright he cannot follow the mathematics.

> My father was a mathematician and a teacher. His most visible legacy is the
> book *Poetry of the Universe*, a Mathematical Exploration of the Cosmos. On the
> surface, it helps readers build an intuition for the curvature of space.[^1]
>
> Beneath the surface, it illuminates the interplay between imagination,
> creativity, observation, and measurement in the centuries-long evolution of
> scientific knowledge. **Theoretical math connects** here **not just to
> applications** it eventually enables, **but also to poetry** — to the ability to
> theorize about what lies beyond what we can touch and observe.
>
> He teaches these themes in the book alongside the geometry of curved surfaces.
> This geometry's relevance extends far beyond the possible shape of the universe.
> It is also foundational to the field of math he dedicated his career to:
> **minimal surfaces**. **He chose this field not because it was seen as useful or
> applicable**, or even fashionable within Math, but **because he found it
> beautiful and elegant**, and because it required creativity and allowed for
> playfulness.[^2]
>
> I do not have the depth of mathematical knowledge to understand the field and
> his research. But as I've tried to understand a little more about the problems
> he pondered, I felt more connected to him and the delight he took in
> intellectual and creative pursuits. It has also led me to a story that echoes
> those I loved reading in *Poetry of the Universe*. The story of how his own
> field, developed by a community of researchers across a centuries-long dialogue
> of theory and observation, has now made a leap to a fascinating and growing
> range of fields in science and engineering that never could have been
> anticipated.
>
> **Here is that story.**

[^1]: While evidence has since mounted against the curvature of space, the book
paints a concrete picture of what scientists mean by that when they try to
determine the shape of the universe.

[^2]: A search for "minimal surfaces" will quickly bring up soap bubbles, which I
fondly remember my dad playing with for us, as he brought his work home.

Then four cards into the stanzas:

| | |
|---|---|
| Stanza I | Imagination, Reality, and Hyperbolic Geometry |
| Stanza II | Minimal Surfaces, the Elegant Math of Soap Bubbles |
| Stanza III | Beyond Mathematics: The Expansion of Minimal Surfaces |
| Coda | *no page yet — renders disabled, "coming soon"* |

**No scene.** Static prose, the only page in the piece without a visual.

**Where the text lives.** Hand-written markup in `viz/src/routes/+page.svelte`,
not a `body` array in a content file like every stanza — two paragraphs need an
inline `<InfoTooltip>` footnote marker, which the string-based `{@html}` renderer
cannot compose. `intro-text.md` at the repo root is the original draft it was
built from and is **not read at build time**; editing it alone changes nothing.

---

# Stanza I — Non-Euclidean Geometry

The arc: Euclid's flat plane → the sphere breaks it → flatten the sphere and
something must give → a map where the failure runs the other way → what
"negative curvature" actually means.

### Non-Euclidean Geometry *(cover)*

> Alexandria, founded by the Greeks on the coast of Egypt, was one of the ancient
> world's great centers of learning. There, drawing on centuries of mathematical
> developments from around the region, Euclid produced *The Elements*.
>
> "Starting from a very few explicitly laid out assumptions, Euclid produced a
> dazzling series of consequences." — Robert Osserman, *Poetry of the Universe*
>
> The assumptions Euclid offered take the form of five axioms and five postulates.
> Of them, the parallel postulate was the least self-evident, and is the one
> mathematicians wrestled with most over the next two thousand years.

*Full-screen text. The body array still holds an alternate draft of these
paragraphs below the live ones — see Known gaps.*

### The Parallel Postulate and Its Implications

> **What does it mean for two lines to be parallel?** Euclid started by imagining
> a perfectly flat, infinite plane — a world no one could ever actually draw.

**Scene** (`ParallelPostulateScene`, SVG). Two parallel lines draw on and run off
both edges of the frame; a third line crosses them and sweeps through
perpendicular while the two angles it makes trade size and their sum sits on 180°.
Then alternate angles, then the two crossing lines slide together into a triangle
and the classic straight-line proof that its angles total 180°. Ends interactive:
drag the triangle's corners and the sum holds.

### Life on the Surface of a Sphere

> While geometry on a flat plane could largely be derived from Euclid, developing
> an similarly robust geometry of curved surfaces took decidedly longer. On
> surfaces that aren't flat, Euclidian geometry doesn't quite work out.

**Scene** (`SphereGeometryScene`, three.js). A triangle walked out on a globe
geodesic by geodesic, each turn a right angle, summing to 270° rather than 180°.
Then a flat-geometry callback, then two meridians grown from the equator to show
that lines which "should" stay parallel meet anyway — twice.

*Crossfades into the previous scene as its heading arrives; they share one panel.*

### Mapping a Curved World

> These geometric properties become particularly interesting when we attempt the
> impossible task pressing a curved surface onto a flat map.

**Scene** (`AzimuthalProjectionScene`, canvas + d3-geo — the long one). Twelve
cuts pole to pole; the gores peel flat with gaps where the curvature was; the
gaps close into an azimuthal equidistant map with the whole rim as one point.
Great circles, right angles, then a tour of places Osserman worked, then free
drag. The shifted mach to pole and transition to stereographic, noting round tissot circles and South pole off to infinith. Runs ~0–4.35 of a single progress value. 

### A Different Kind of Map

> We are looking at a view of a finite world that requires infinite paper to show
> in its entirety. Next, we turn to an inverse of this map — one that shows an
> infinite surface within a simple circle. Like Euclid's plane, this disk requires
> thinking abstractly, not using geometry to represent or measure real world
> objects, but developing a geometry of an imaginary world.
>
> *→ Aside: the grid under Escher's Circle Limit*

**Scene** — the *same* visual, continuing. Two text sections over one uninterrupted
panel, so the map never resets. Then hand over to the Poincaré disc, where equal Tissot circles
shrink instead of growing. One line bows like any geodesic and then flattens into
a diameter. Then the postulate returns (as Playfair stated): a point off that line, many lines through
it that never reach it, and finally the map's centre slides onto the point and
every one of them straightens. Runs 4.35–7.2.

### What Negative Curvature Means

> The Poincaré disk maps a world of **constant negative curvature**. But what does
> "negative curvature" actually mean? To find out, look again at our sphere.
>
> *→ Aside: the surface that saddle sits on*

**Scene** (`CurvatureExplorerScene`, three.js). Two coloured curves through one
marked point on a sphere — the only two directions that matter. The sphere's
radius sweeps while the curves hold their size on screen, so it visibly passes
through them. It hands over to a local patch, flattens to a plane, a circle marks
off a neighbourhood and everything outside it fades, and the patch bends into a
saddle: one curve up, one down.

### Hyperbolic Geometry *(cover)*

> In *Poetry of the Universe* Osserman goes further into these surfaces, showing
> their connections to Escher's Heaven and Earth, for example. But here we move in
> a different direction; towards the field of mathematics Osserman researched and
> contributed to most significantly.

---

# Stanza II — Minimal Surfaces

The arc: one concrete question from 1740 → the answer is a specific surface →
what makes it special → nature gets there too → the field explodes → a survey,
and a handoff.

### Minimal Surfaces *(cover)*

> Around the same time mathematicians were imagining entirely new kinds of
> geometry, they were also discovering a remarkable new class of surfaces: minimal
> surfaces.
>
> This became the field Robert Osserman devoted much of his career to. And like
> the stories in *The Poetry of the Universe*, this field's history unfolded
> through a dialogue between physical observation and mathematical imagination.

### Connecting two rings

> In the 1740's, Leonhard Euler worked on a deceptively simple question:
>
> > What surface connects two rings using the least possible area?
>
> A natural starting point would be rotating a straight line around the rings to
> make a cylinder.

**Scene** (`CatenoidScene` + `ProfileEditor` + `SurfaceAreaBars`). Two rings and
the surface spanning them, with the profile curve directly editable and a live
area readout — so the reader can try to beat the answer before seeing it.

### The Catenoid

> Euler proved the optimal surface comes from rotating a familiar curve.
>
> The curve is called the **catenary**, from the Latin *catena* ("chain"), because
> it is the shape naturally formed by a freely hanging chain.

**Scene** (`CatenaryUnrollScene`). The catenoid unrolls to expose the catenary
profile it is made of — the hanging-chain curve, revolved.

### The special curvature of the Catenoid

*No body text — the scene carries it.*

**Scene** (`MeanCurvatureScene`). The two principal curvatures at a point on the
catenoid, shown to be equal and opposite. Deliberately the same two-curve device
Stanza I ends on, under a different condition: there the product mattered, here
it is the average.

### Nature mimics math mimics nature

> It was known in the 1700's that soap films, following the laws of surface
> tension, created minimal surfaces. But it wasn't until the 1840's, a hundred
> years after Euler's proof, that physicist Joseph Plateau developed a stable
> enough soap film mixture to systematically reseaarch how they form around wire
> frames.
>
> By pulling apart two rings dipped in soap, he made the first known stable
> catenoid Euler described a century before. Observation had caught up with theory.

*Placeholder visual.*

### An explosion of surfaces

> In the 1760's Joseph-Louis de Lagrange provided the exact equation that any 2
> dimensional minimal surface must… Unfortunately the equations were essentially
> unsolvable.
>
> It wasn't until 1860's that Weierstrass, Enneper and Riemann derived a
> simplification that changed that. Using complex numbers they developed a way to
> define an infinite family of minimal surfaces.

*Placeholder visual. This slide appears **twice** — see Known gaps.*

### One equation, many surfaces

> Choose a family from the dropdown, and drag the slider to see how a single
> mathematical description can describe many different-looking surfaces.
>
> The **catenoid and the helicoid** are two shapes that do not look alike — but
> they turn out to be the same family, with a single parameter to transition
> between them. The **Enneper surface** takes on surprisingly different character
> depending on how much of it you view. And the **Scherk surface** shows a first
> family of "periodic" surfaces.

**Scene** (`MinimalSurfaceExplorer`). Free interaction, not scrubbed: pick a
family, move the parameter, watch one equation produce unlike-looking surfaces.

### The Field Keeps Growing

> By 1969, enough of that work had accumulated for Robert Osserman to bring much
> of the subject together in a graduate-level textbook: *A Survey of Minimal
> Surfaces*.
>
> Just one year later, NASA researcher Alan Schoen described a remarkable new
> family of **triply periodic minimal surfaces**, including the **gyroid**…
>
> Using the citations of Osserman's textbook, the next section follows the journey
> of minimal surfaces — from 200 years of theoretical math to applications in
> fields ranging from materials science and biology to computer graphics, computer
> vision and theoretical physics.

*Placeholder visual. This is the hinge into Stanza III.*

---

# Stanza III — Beyond Mathematics

Not a hand-authored sequence but a **data-driven one**: the citation graph of
*A Survey of Minimal Surfaces*, scrolled through field by field. One persistent
graph visual (`CitationGraph`) that filters and re-focuses as the text advances,
with `PaperDetail` and `FilterPanel` alongside.

27 steps in four movements:

1. **Setup** — what kind of work cites the survey, and that most of it is maths.
2. **Five fields**, each an intro plus two exemplar papers: *engineering*
   (bone scaffolds, porous biomaterials), *materials* (block copolymers, curved
   graphite), *biology* (heart myofibers, membrane necks), *computer science*
   (object segmentation, XROMM tongue mechanics), *physics* (Born–Infeld branes,
   trapped surfaces).
3. **Four pathways** — the recurring shapes of the transfer: maths discovers
   hidden structure; becomes a design language; becomes a computational tool;
   becomes part of physical theory.
4. **Free exploration** and an epilogue.

---

# The two asides

Both are standalone routes, linked from Stanza I, and the narrative reads without
either.

**`/pseudosphere` — "The Surface That Saddle Sits On".** Opens on exactly the
saddle Stanza I ends with, then widens to reveal the horn it is a piece of. Move
the point along it and the two curvatures change by a factor of twelve while
their product never moves. Ends on Hilbert: the surface has to stop, which is why
the hyperbolic plane has no complete model in ordinary space.

**`/circle-limit` — "The Grid Under Circle Limit".** The hyperbolic tiling
Escher's prints are laid on, drawn from true geodesics, with the centre draggable.
Carries the Coxeter sting: Escher's white spines meet the boundary at ~80°, so
they are hypercycles, not straight lines. No Escher artwork is reproduced — the
prints are in copyright.

---

# Known gaps

- **`field-grows` appears twice in `minimalSurfaces.js`** with different text, so
  the slide renders twice mid-stanza. Almost certainly an editing artifact.
- **The `euclid` slide** ("Euclid's Geometry") exists in the content file but is
  rendered nowhere. Stanza I's opening may already cover its ground.
- **Alternate drafts left inline.** Stanza I's cover and several Stanza II slides
  hold two versions of the same paragraphs in one `body` array; both render.
- **Four Stanza II slides still show `VisualPlaceholder`**: soap-film,
  field-grows (×2), two-centuries.
- **`intro-text.md` has drifted from the live front door.** The prose still
  matches, but the draft ends in a plain stanza list where the page now renders
  cards, and keeps its two footnotes as numbered items rather than tooltips. The
  page is authoritative; the .md is a stale source.
- **Typos in live copy**: "an similarly robust", "reseaarch", "dependning",
  "Euclidian".
- **Stanza II's opening** is the weakest seam — it asserts the link to Stanza I
  rather than earning it, and the Stanza I outro promises a pivot the Stanza II
  intro then re-explains.
