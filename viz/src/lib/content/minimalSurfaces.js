// Content for Stanza II — Minimal Surfaces, transcribed from
// scrollytelling-catenoid-narrative-copy.md. Kept as plain data, not
// markup, mirroring narrative.js's convention (viz/src/lib/content/narrative.js)
// so copy can be revised without touching the page.
//
// Order here is doc order with Slides 4 and 5 swapped (defining property
// before "one solution becomes a field") — approved narrative change: the
// zero-mean-curvature property should be established before saying it
// produces an infinite family, rather than after.
//
// Each body paragraph starting with "> " renders as a blockquote. **bold**
// renders inline (see renderInline in the page). `visualLabel` /
// `visualNote` describe what VisualPlaceholder.svelte should show for
// slides without a built visual yet; the Euler's-question slide (id
// 'euler-question') has none because its visual is the live catenoid
// interactive instead.

export const slides = [
	{
		id: 'intro',
		title: 'Minimal Surfaces',
		body: [
			'In *The Poetry of the Universe*, Robert Osserman describes how mathematicians gradually learned to imagine curved spaces that couldn’t be directly observed.',
			'Those same ideas also became fundamental to another branch of geometry: **minimal surfaces**.',
			'Like hyperbolic geometry, this field grew through a dialogue between physical observation and mathematical imagination.'
		],
		visualLabel: 'Transition motif from Stanza I'
	},
	{
		id: 'euler-question',
		title: 'Connecting two rings',
		body: [
			'In 1744, Leonhard Euler asked a deceptively simple question:',
			'> What surface of revolution connects two rings using the least possible area?',
			'Try to beat him.'
		]
		// Visual: the live catenoid interactive, rendered directly by this page.
	},
	{
		id: 'euler-answer',
		title: 'The Catenoid',
		body: [
			'Euler proved that the optimal surface comes from rotating a familiar curve.',
			'The curve is called the **catenary**, from the Latin *catena* ("chain"), because it is the shape naturally formed by a freely hanging chain.',
			'Rotate that curve around its axis and it becomes the **catenoid**—the first non-planar minimal surface.'
		],
		visualLabel: 'Chain animation'
	},
	{
		id: 'defining-property',
		title: 'Not What You Might Expect',
		body: [
			'Despite their name, minimal surfaces are **not** defined by having the smallest possible area.',
			'Instead, every smooth minimal surface shares a simple local property:',
			'its **mean curvature is zero everywhere**.',
			'At every point, the surface bends equally in opposite directions.',
			'The two principal curvatures exactly balance.',
			'> H = (κ₁ + κ₂) / 2 = 0'
		],
		visualLabel: 'Principal-curvature visualization on the catenoid'
	},
	{
		id: 'field-grows',
		title: 'One Surface Becomes Infinitely Many',
		body: [
			'Euler had solved one remarkable optimization problem.',
			'Over the following century, mathematicians asked a deeper question:',
			'> What do all minimal surfaces have in common?',
			'Bernhard Riemann and others showed that the mathematics described not just one remarkable surface, but an infinite family of mathematically definable ones.',
			'Riemann’s use of complex analysis dramatically simplified the mathematics and helped transform isolated examples into a coherent field of geometry.'
		],
		visualLabel: 'Gallery of minimal surfaces (Riemann’s family)'
	},
	{
		id: 'soap-film',
		title: 'Nature Had Been Making Them All Along',
		body: [
			'Minimal surfaces are mathematical objects.',
			'But they are also physical ones.',
			'Stretch a soap film between two rings and, under the right conditions, it naturally forms a catenoid.',
			'The same geometry Euler described on paper appears spontaneously in the physical world.'
		],
		visualLabel: 'Soap-film visualization'
	},
	{
		id: 'two-centuries',
		title: 'The Field Keeps Growing',
		body: [
			'Throughout the nineteenth and twentieth centuries, mathematicians discovered new minimal surfaces, developed general methods for constructing and classifying them, and explored when they exist and when they remain stable.',
			'By 1969, enough of that work had accumulated for Robert Osserman to bring much of the subject together in *A Survey of Minimal Surfaces*.',
			'Just one year later, NASA researcher Alan Schoen described a remarkable new family of **triply periodic minimal surfaces**, including the **gyroid**. Developed within an engineering research environment, these surfaces would later become some of the most influential geometries outside mathematics.'
		],
		visualLabel: 'Timeline: catenoid → Riemann examples → Schoen’s gyroid'
	},
	{
		id: 'transition',
		title: 'Beyond Mathematics',
		body: [
			'For more than two centuries, minimal surfaces grew primarily as a branch of pure mathematics.',
			'Then researchers in fields ranging from materials science and biology to computer graphics, computer vision and theoretical physics began recognizing these same geometries in their own work.',
			'The next stanza follows that journey through the citation history of *A Survey of Minimal Surfaces*.'
		],
		visualLabel: 'Preview of the citation network (Stanza III)'
	}
];
