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
		title: 'Non-Euclidean Geometry',
		body: [
			"Alexandria, founded by the Greeks on the coast of Egypt, was one of the ancient world's great centers of learning. There, drawing on centuries of mathematical developments from around the region, Euclid produced *The Elements*. ",
			'> "Starting from a very few explicitly laid out assumptions, Euclid produced a dazzling series of consequences." - Robert Osserman, *Poetry of the Universe*',
			"The assumptions Euclid offered take the form of five axioms and five postulates. Of them,		 the parallel postulate was the least self-evident, and is the one mathematicians wrestled with most over the next two thousand years."
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
		subtitle: '**What does it mean for two lines to be parallel?** According to Euclid, you have to start by imagining a perfectly flat, infinite plane — a world no one could ever actually draw.',
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
		subtitle: "While geometry on a flat plane could largely be derived from Euclid, developing an similarly robust geometry of curved surfaces took decidedly longer. On surfaces that aren't flat, Euclidian geometry doesn't quite work out.",
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
			"Flat maps of our curved world have been designed for centuries for practical purposes. But they can also be mathematically derived, with facinating geometric properties.",
		visualLabel: 'Azimuthal Equidistant projection: rotating globe, peel-open, distortion coloring, draggable center'
	},
	{
		id: 'a-different-kind-of-map',
		title: 'A Different Kind of Map',
		// Second half of the azimuthal sequence, which runs as ONE continuous
		// visual across two text sections -- see the .stanza-part pair in
		// +page.svelte. This subtitle was an on-canvas caption until the split;
		// it is long, and it reads far better held still in the sidebar while
		// the map transforms than flashed over the top of it.
		subtitle:
			"We are looking at a view of a finite world that requires infinite paper to show in its entirety. Next, we turn to an inverse of this map — one that shows an infinite surface within a simple circle. Like Euclid's plane, this disk requires thinking abstractly, not using geometry to represent or measure real world objects, but developing a geometry of an imaginary world."
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
			'The Poincaré disk maps a world of **constant negative curvature**. But what does "negative curvature" actually mean? To find out, look again at our sphere.',
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
			"In *Poetry of the Universe* Osserman goes further into these surfaces, showing their connections to Escher's Heaven and Earth, for example. But here we move in a different direction; towards the field of mathematics Osserman researched and contributed to most significantly."
		]
		// This is the outro (see .cover-section in +page.svelte) — no
		// visualLabel, it doesn't sit in the scene-panel flow the slides
		// before it use.
	}
];
