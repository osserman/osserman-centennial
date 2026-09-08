// Content for Stanza I — Non-Euclidean Geometry, transcribed from
// scrollytelling-foundations.md (the user's own outline/draft file, kept at
// the repo root). Mirrors minimalSurfaces.js's conventions: plain data, not
// markup; each body paragraph starting with "> " renders as a blockquote;
// **bold** renders inline (see renderInline in the page); `visualLabel`
// describes what VisualPlaceholder.svelte should show until each slide's
// real interactive/animation is built.
//
// Scaffolding pass — no interactives built yet, so every scrollySlide uses
// the generic text+VisualPlaceholder treatment (see +page.svelte). The
// source markdown's own animation descriptions are kept as comments below
// each slide, for whoever builds that slide's visual next.
//
// Text is transcribed close to verbatim from the source doc — obvious
// typos fixed in passing (spelling, missing articles), but phrasing and
// sentence breaks otherwise left as written; the source doc's own
// commented-out / retired drafts are not carried over, matching how
// minimalSurfaces.js treats its own retired content.

export const slides = [
	{
		id: 'intro',
		title: 'Imagination, Reality and Hyperbolic Geometry',
		body: [
			//"One of the threads woven through *Poetry of the Universe* is the evolution of geometry.",
			"Alexandria, founded by the Greeks on the coast of Egypt, was one of the ancient world's great centers of learning. There, drawing on centuries of mathematical developments from around the region, Euclid produced *The Elements*. ",
			'> "Starting from a very few explicitly laid out assumptions, Euclid produced a dazzling series of consequences." - Robert Osserman, *Poetry of the Universe*',
			"The assumptions Euclid offered take the form of five axioms and five postulates. Of them, the parallel postulate was the least self-evident, and is the one mathematicians wrestled with most over the next two thousand years."
			// "Alexandria sat at the crossroads of civilizations."
			//"Ancient Egyptians spent centuries honing their understanding of shapes and developing an approach to mathematical reasoning, culminating in Euclid's *The Elements* around 300 BCE.",
			//"For 2000 years, the work would provide the mathematic foundations of geometry.",
			//'> Starting from a very few explicitly laid out assumptions, Euclid produced a dazzling series of consequences.',
			//'Only in the 19th century did mathematicians formalize the geometry of curved surfaces.'

			//'This stanza introduces Euclidean and non-Euclidean geometry — the interplay of imagination and ground truth, the introduction of imaginary numbers, and hyperbolic geometry.'
		]
	},
/*	{
		id: 'euclid',
		title: "Euclid's Geometry",
		body: [
			'Ancient Egyptians spent centuries honing their understanding of shapes and developing an approach to mathematical reasoning. Building on this foundation, Euclid published *The Elements* around 300 BCE.',
			'> Starting from a very few explicitly laid out assumptions, Euclid produced a dazzling series of consequences.'
		],
		visualLabel: 'Euclid / The Elements motif'
	},
	*/
	{
		id: 'parallel-postulate',
		title: 'The Parallel Postulate and Its Implications',
		// `subtitle` sits sticky under the title (see .intro-sticky in
		// +page.svelte) for the whole scene -- no more scrolling stage
		// prompts here. Every other beat of this scene's narration (what
		// the live rotating equation means, the alternate-angle claim, the
		// triangle forming, the 180 proof) is carried by on-canvas
		// captions in ParallelPostulateScene itself, timed tightly to the
		// animation -- see that component's CAPTIONS array (and its
		// drag-hint, which used to be this slide's separate `dragCaption`
		// field, now folded in there too).
		subtitle: '**What does it mean for two lines to be parallel?** Euclid started by imagining a perfectly flat, infinite plane — a world no one could ever actually draw.',
		visualLabel: 'Parallel-postulate / triangle-angle-sum animation'
	},
	{
		id: 'sphere',
		title: 'Life on the Surface of a Sphere',
		// Same pattern as parallel-postulate above: a sticky subtitle, no
		// scrolling stage prompts. Every beat's narration -- "start at the
		// equator", each leg of the triangle walk, the 270 sum, and the
		// whole parallel-lines beat -- is carried by on-canvas captions in
		// SphereGeometryScene itself; see that component's CAPTIONS array.
		subtitle: "Geometry on a flat plane can be derived from Euclid. But curved surfaces have a different logic, and require a different geometry.",
		visualLabel: 'Spherical-triangle / parallel-lines-meet-twice animation'
		// Closing paragraph from the source doc, not yet placed as a stage —
		// reads more like a wrap-up than something the scene has a beat for:
		// "On a sphere, all lines that would be parallel on a flat surface
		// intersect exactly twice. These characteristics of spherical
		// geometry were known, living alongside Euclid's geometry, for
		// centuries. But the mathematics of it took over a thousand years to
		// develop fully."
		//
		// Possible addition (source doc, unresolved): historical examples
		// from Poetry of the Universe — maybe the Egyptians' use of geometry
		// to measure the circumference of the earth.
	},
	{
		id: 'azimuthal-projection',
		title: 'Mapping a Curved World',
		// Same pattern as parallel-postulate/sphere above: a sticky subtitle,
		// no scrolling stage prompts -- every beat (the globe, the peel into
		// a flat map, the distortion coloring, the great circles, the
		// drag-to-recenter interaction) is carried by on-canvas captions in
		// AzimuthalProjectionScene itself; see that component's CAPTIONS
		// array. Experimental first pass at the Azimuthal Equidistant ->
		// Poincare disk sequence -- this slide covers only the projection
		// side (how flattening a sphere distorts it); the hyperbolic-disk
		// connection is a deliberately separate follow-up, not yet built.
		subtitle:
			'Mapmakers had faced a related challenge for centuries: how to represent the surface of a sphere on a flat page.',
		visualLabel: 'Azimuthal Equidistant projection: rotating globe, peel-open, distortion coloring, draggable center'
	},
	{
		id: 'a-different-kind-of-map',
		title: 'The Poincaré Disk',
		// Second half of the azimuthal sequence, which runs as ONE continuous
		// visual across two text sections -- see the .stanza-part pair in
		// +page.svelte. This subtitle was an on-canvas caption until the split;
		// it is long, and it reads far better held still in the sidebar while
		// the map transforms than flashed over the top of it.
		subtitle:
			"Our last map required infinite paper to show all of our finite sphere. Poincaré's disk fits an infinite surface into a simple circle. In many respects it is essentially the inverse of the last map we explored."
			//"We are looking at a view of a finite world that requires infinite paper to show in its entirety. Next, we turn to an inverse of this map — one that shows an infinite surface within a simple circle. Like Euclid's plane, this disk requires thinking abstractly, not using geometry to represent or measure real world objects, but developing a geometry of an imaginary world."
	},
	{
		id: 'negative-curvature',
		title: 'What Negative Curvature Means',
		// Replaces the old 'imaginary-curvature' slide (see
		// scrollytelling-non-euclidean-revisions.md). That slide asserted what
		// negative curvature was and flagged its own open questions -- how to
		// define Gaussian curvature, whether to go via principal curvatures --
		// which CurvatureExplorerScene now answers by showing it instead.
		//
		// The subtitle poses the question the scene spends its whole run
		// answering, and points back at the disc the reader has just left.
		subtitle:
			'To find out lets start with curvature on a sphere.',
			//'The Poincaré disk maps a world of **constant negative curvature**. But what does "negative curvature" actually mean? To find out, look again at our sphere.',
		// Optional side door, rendered under the subtitle. Not part of the
		// narrative -- the stanza reads correctly without ever following it.
		aside: {
			href: '/pseudosphere',
			label: 'Aside: the surface that saddle sits on'
		}
	},
	{
		id: 'hyperbolic-outro',
		title: 'Hyperbolic Geometry',
		body: [
			'In *Poetry of the Universe*, my father taught this geometry to build an intuition for curvature in higher dimensions and for the possible shape of the universe.',
			'But this foundational understanding of curvature also set the stage for the field of mathematics he spent his career studying: Minimal Surfaces.'
		]
		// This is the outro (see .cover-section in +page.svelte) — no
		// visualLabel, it doesn't sit in the scene-panel flow the slides
		// before it use.
	}
];

// A third kind of narrative space, alongside the sidebar (title + one-line
// subtitle, paired to a scene) and the on-canvas captions (short, timed to an
// animation). An interstitial is neither: a few sentences of connective
// prose, standing on its own, that a reader pauses on rather than glances at.
// It exists for beats that need more room than a subtitle but aren't tied to
// any single scene's timeline -- here, the two pieces of intellectual history
// that motivate what's about to happen rather than describing what's on
// screen. Rendered by $lib/components/Interstitial.svelte.
export const interstitials = [
	{
		id: 'straight-in-curved-geometry',
		// Sits between 'sphere' and 'azimuthal-projection': the sphere scene
		// just showed lines that "should" be parallel meeting twice. This is
		// the missing premise for why that isn't already a contradiction of
		// Euclid, and the reframing (arc in 3D / straight line in a curved
		// geometry) that the next scene's map is built to make vivid.
		body: [
			"These properties of spheres had been known for centuries. But they weren't necessarily seen as incompatible with Euclid, because Euclid spoke of straight lines, whereas our lines on a sphere could just be considered arcs in three dimensions, rather than lines at all.",
			"The 19th century brought a conceptual shift. Mathematicians including Carl Friedrich Gauss began studying what geometry would look like if you were confined to the curved surface itself. On the surface of the Earth, we essentially are confined to two dimensions, and the arcs from the previous visual are the straightest paths available to us. So are they curved lines in three dimensions, or a straight line in a curved geometry?"
		]
	},
	{
		id: 'imaginary-geometry',
		// Sits mid-sequence inside the azimuthal-projection scene, between the
		// stereographic zoom-out and the arrival of the Poincare disk -- the
		// history that explains why the map is about to become a circle at
		// all, read while the just-finished flat map sits still alongside it.
		body: [
			'These geometries of the plane and the sphere, while not always intuitive, are based on surfaces that are familiar with us.',
			'In the early nineteenth century, Nikolai Lobachevsky took a different approach. He developed what he called an "imaginary geometry" - in part because of it\'s close relations to imaginary numbers. This geometry was inspired not from a familiar physical surface, but from mathmatical abstration. It is a geometry in which most of Euclid\'s assumptions remain, but not the parallel postulate.',
			'After decades of mathematical controversy about this "imaginary geometry," in 1868 Eugenio Beltrami showed that it was in fact internally consistent. And a little over a decade later, Henri Poincaré developed a circular model that made this otherwise hard-to-picture geometry concrete enough to see and work with.'
		]
	},
	{
		id: 'curvature-is-measurable',
		// Standalone placement, like 'straight-in-curved-geometry': sits in
		// ordinary document flow between the azimuthal-projection <main> and the
		// negative-curvature <main>, nothing tracking its height. Closes the disc
		// sequence by naming what made it the inverse of the sphere (constant
		// negative vs positive curvature) and asserts that "negative curvature"
		// is concrete and measurable -- the handoff into the scene that shows it.
		body: [
			"The reason the Poincaré Disk is essentially an inverse of our last map is because the geometry Lobachevsky imagined is in some ways the inverse of a sphere. While a sphere has constant positive curvature, Lobachevsky's geometry maps to a surface with constant negative curvature.",
			"But while Lobachevsky started with mathematical abstraction, that doesn't mean \"negative curvature\" itself is fuzzy. Or that it can't be visualized or measured.",
			"When tasked with surveying the Kingdom of Hanover in the 1820's, Gauss developed a new way to define and measure curvature. And it applies equally well to negative curvature as it does positive curvature.",
			"But what is negative curvature?"
		]
	}
];
