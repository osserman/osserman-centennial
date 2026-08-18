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
			"Alexandria, established by Greeks on the coast of Egypt, was one of the ancient world's great centers of learning. There, drawing on centuries of mathematical developments from around the region, Euclid produced The Elements.",
			'> "Starting from a very few explicitly laid out assumptions, Euclid produced a dazzling series of consequences."[cite Poetry of the Universe]',
			"Of the handful of axioms and postulates Euclid offered, the parallel postulate was the least obvious, and the one mathematicians wrestled with most over the subsequent 2000 years."
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
		subtitle: "The **parallel postulate doesn't actually start with parallel lines**. It starts with any two lines — and another line that intersects them.",
		visualLabel: 'Parallel-postulate / triangle-angle-sum animation'
	},
	{
		id: 'sphere',
		title: 'Living on the Surface of a Sphere',
		// Same pattern as parallel-postulate above: a sticky subtitle, no
		// scrolling stage prompts. Every beat's narration -- "start at the
		// equator", each leg of the triangle walk, the 270 sum, and the
		// whole parallel-lines beat -- is carried by on-canvas captions in
		// SphereGeometryScene itself; see that component's CAPTIONS array.
		subtitle: "On surfaces that aren't flat, this foundational geometry doesn't quite work out.",
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
		id: 'gauss-survey',
		title: "Gauss' Survey of a Curved Planet",
		body: [
			'Advances in math require immense imagination and ingenuity, but they are not immaculately born in the head of a mathematician. They can be seeded by forebears and contemporaries, by keen observation, and sometimes by trying to find a more elegant way through a practical problem.',
			'One such problem arrived in 1818, when Carl Friedrich Gauss, a famed mathematician, physicist, and astronomer, was given the task of surveying the relatively new Kingdom of Hanover. While no new math was needed to complete this task, he took the opportunity to look deeper, in the process making a great advance in the study of curved surfaces.',
			'For centuries, triangles had been tools for surveying, for mapping the world. But he developed the math to understand the relationship between distances and angles and the curvature of the surfaces they are measured on. It enabled people, for the first time, to deduce the precise qualities of a surface\'s curvature from measurements taken on its surface.',
			"While this could be used to confirm theories about how the earth deviates from a sphere — bulged at the equator, flattened at the poles — it could also be used to explore and explain much more theoretical surfaces."
		],
		visualLabel: 'Gauss survey-triangle / curvature-from-measurement visual'
	},
	{
		id: 'imaginary-curvature',
		title: 'Measuring Negative Curvature with Imaginary Numbers',
		// This slide's copy is the least settled of the six (per the source
		// doc, "still pretty vague") — kept short and close to the clearest
		// parts of the draft rather than papering over the open questions.
		// The source doc's own unresolved notes-to-self are preserved below
		// for whoever revises this slide, not folded into the body text.
		body: [
			'Gaussian curvature can be negative or positive.',
			"While negative curvature is very real — it's the curvature of a saddle, or a potato chip — it turned out that measuring it required imaginary numbers. Like negative numbers before them, imaginary numbers were once considered an abstract, impossible-to-exist concept.",
			'Various mathematicians in the early 1800s proposed a surface of constant negative curvature that would violate the parallel postulate in a different way: there could be many straight lines passing through a point off another line that would never intersect it.'
		],
		visualLabel: 'Negative-curvature saddle / pseudosphere visual'
		// Open questions from the source doc, still unresolved:
		// - How to describe Gaussian curvature itself: principal curvatures
		//   having the same sign vs. opposite signs? A more/less
		//   mathematical definition? Possibly via a normal line and the
		//   planes through it and their intersections with the surface.
		// - The third paragraph's surface is probably the pseudosphere —
		//   worth an explicit visual/example once this slide gets its animation.
	},
	{
		id: 'hyperbolic-outro',
		title: 'Hyperbolic Geometry',
		body: [
			"In *Poetry of the Universe* Osserman goes further into these surfaces, showing their connections to Escher's Heaven and Earth, for example. But here we move in a different direction. Towards the field of mathematics Osserman researched and contributed to most significantly."
		]
		// This is the outro (see .cover-section in +page.svelte) — no
		// visualLabel, it doesn't sit in the scene-panel flow the slides
		// before it use.
	}
];
