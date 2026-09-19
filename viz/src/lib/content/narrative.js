// Narrative content for the scrollytelling sequence, transcribed from
// scrollytelling-draft-texts.md. Kept as plain data (not component markup)
// so it stays easy to revise independently of the visualization code, per
// scrollytelling-project-context.md's explicit design requirement.
//
// Each step's `view` is a declarative instruction to <CitationGraph> — see
// its ViewSpec typedef. `openQuestion` renders as a visible aside, not a
// silently-dropped bracketed note, per the design doc's requirement to
// distinguish evidence from interpretation from open questions.

// Curated paper IDs grouped by field (see scripts/export_viz_data.py's
// CURATED_PAPERS for the section tagging this mirrors). That data file also
// still carries a `pathway` tag per paper (hidden_structure/design_language/
// computational_tool/physical_theory) — CitationGraph's `colorBy: 'pathway'`
// and palette.js's pathway colors still support it, but nothing here sets
// that view any more. The pathway framing was a separate end-of-stanza
// reclassification the revision brief (stanza-iii-revision-brief.md) asked
// to drop from the narrative; its insight survives as recurring language in
// each field's own prose instead (recognize/model/design/method/reason
// about) rather than a formal taxonomy. See git tag `pre-stanza3-revision`
// for the version with the pathway steps still in place.
const FIELD_PAPER_IDS = {
	biology: ['W2169776346', 'W2612605708', 'W2999050204', 'W2112838653'],
	engineering: ['W2120559167', 'W2943941736'],
	materials_science: ['W2044735577', 'W2002021482'],
	computer_science: ['W2044920528', 'W2151783599', 'W3026088860', 'W1878245702'],
	physics: ['W2034409564', 'W2002168123']
};

const NONE_VIEW = { colorBy: 'none', highlightIds: [], dimBackground: false };
// Single-hue highlight against a grey field, not a two-hue split — see
// CitationGraph's colorFor/isDimmed for 'math' vs 'nonMath'.
const MATH_VIEW = { colorBy: 'math', highlightIds: [], dimBackground: false };
const NON_MATH_VIEW = { colorBy: 'nonMath', highlightIds: [], dimBackground: false };
const WORK_TYPE_VIEW = { colorBy: 'workType', highlightIds: [], dimBackground: false };

function spotlight(ids) {
	return { colorBy: 'none', highlightIds: ids, dimBackground: true };
}

export const steps = [
	{
		id: 'intro',
		kicker: null,
		heading: 'Roots and branches',
		//subheading: 'Tracing the unexpected journeys from math theory to other fields',
		body: [
			'First published in 1969, <strong>A Survey of Minimal Surfaces</strong> is a graduate-level textbook that became the standard introduction to this rapidly growing area of geometry.',
			'More than fifty years later, the book has been cited by over **1,000** scholarly publications.',
			//'Within these citations we can see the still-evolving range of fields where this field of math has proved relevant.',
		],
		openQuestion: null,
		view: NONE_VIEW
	},
	{
		id: 'work-types',
		kicker: null,
		heading: 'Types of work',
		body: ['Based on OpenAlex classifications, we see these 1,000+ citing works span several kinds of scholarly output:'],
		typeBreakdown: [
			{ label: 'Journal articles', count: 684, swatch: 'aqua' },
			{ label: 'Preprints', count: 162, swatch: 'yellow' },
			{ label: 'Book chapters', count: 109, swatch: 'violet' },
			{ label: 'Other — conference papers, dissertations, books, and more', count: 78, swatch: 'muted' }
		],
		openQuestion: null,
		view: WORK_TYPE_VIEW
	},
	{
		id: 'math',
		kicker: null,
		heading: 'Most were in mathematics',
		body: [
			'More than two thirds of citations come from works within geometry, differential geometry, analysis, and a variety of other mathematical fields.',
		],
		openQuestion: null,
		view: MATH_VIEW
	},
	{
		id: 'beyond-intro',
		kicker: null,
		heading: 'Citations Beyond Mathematics',
		body: [
			'But minimal surface mathematics has also been applied to a surprising range of other disciplines.',
			"Many of these pathways are visible with the hundreds of works from outside mathematics{{tooltip:This project relies on OpenAlex's automated field classifications to sort citing works by discipline. Those classifications are not human-verified and are not always consistently correct.}} citing my father's textbook.",
			'Here are a few particularly influential examples...'
		],
		openQuestion: null,
		view: NON_MATH_VIEW
	},

	// --- Biology ---
	// Ordering follows the revision brief's Biology -> Bioengineering/
	// Engineering -> Materials Science -> Computer Science -> Physics
	// progression: each transition should complicate or extend the previous
	// field's relationship rather than read as an unrelated new category.
	// Each field is now ONE scroll step (down from an intro + one step per
	// paper) with its curated papers as a PaperList of collapsed <details>
	// underneath — see PaperList.svelte and +page.svelte's field-step wrapper.
	{
		id: 'biology',
		kicker: 'Biology',
		heading: 'The shapes of life',
		body: [
			"With soap films, surface tension alone pulls them toward forms that minimize area. **Living systems are far messier**, shaped by a wide range of competing mechanical, chemical and molecular forces.",
			"Nonetheless, minimal surfaces and related shapes appear across a wide range of biological systems and scales, from muscle fibers in the heart to far smaller structures formed by cell membranes.",
			//'Minimal-surface and closely related geometries have appeared in research on living systems at remarkably different scales — from the organization of muscle fibers in the heart to the microscopic necks formed when cell membranes bend, merge, and divide.',
			'Here, mathematics can provide a language for **recognizing and modeling** forms found in nature.',
			//'The next examples reverse that relationship. Rather than using mathematics to describe structures found in living systems, researchers use related geometries to **design** structures for biological purposes.'
		],
		papers: [
			{
				paperId: 'W2169776346',
				title: 'Heart wall myofibers are arranged in minimal surfaces to optimize organ function',
				year: 2012,
				body: [
					'This paper proposes that the arrangement of muscle fibers through the wall of the heart follows a generalized helicoid, an extension of one of the classic 19th-century minimal surfaces developed by generations of geometers.',
					'The authors argue that this geometry helps explain how the heart bundles its muscle fibers while minimizing fiber length and helping the heart pump blood efficiently.'
				]
			},
			{
				paperId: 'W2612605708',
				title: 'Gaussian curvature directs the distribution of spontaneous curvature on bilayer membrane necks',
				year: 2018,
				body: [
					'Cell membranes constantly bend, merge and divide as cells grow, communicate and transport materials.',
					'This paper investigates how the geometry of the narrow membrane necks formed during these processes influences where proteins accumulate.'
				]
			},
			{
				paperId: 'W2999050204',
				title: 'On virus growth and form',
				year: 2020,
				body: [
					"In describing the many kinds of curvature relevant to virus growth, the authors cite Osserman's Survey to identify surfaces with zero mean curvature — only to note that minimal surfaces have not found a relevant role in virus systems. Here, the mathematics provides a language for analyzing biological form even when the answer is negative."
				]
			},
			{
				paperId: 'W2112838653',
				title: 'Electrostatic colloid-membrane binding',
				year: 2004,
				body: [
					'What happens when a charged particle encounters an oppositely charged flexible membrane? The authors model how competing electrostatic forces, bending energy and surface tension determine whether the membrane touches, partially surrounds or wraps the particle.',
					'Under some conditions, the membrane takes on a catenoid-like shape — echoing the minimal surface formed by soap films between two rings.'
				]
			}
		],
		openQuestion: null,
		view: spotlight(FIELD_PAPER_IDS.biology)
	},

	// --- Bioengineering & Engineering ---
	{
		id: 'engineering',
		kicker: 'Bioengineering',
		heading: 'From describing to designing',
		body: [
			'Advances in computation and fabrication have made it possible to **manufacture intricate minimal-surface-inspired structures** for medical applications, including scaffolds that encourage bone-tissue growth and 3D-printed metallic implants.',
			'Here, the geometry is not used only to recognize shapes found in nature, but as a starting point for **design** — leveraging properties such as interconnected pores, high surface area and mechanical strength.'
			
// 'Advances in computation and fabrication have made it possible to manufacture intricate structures based on triply periodic minimal-surface geometries. In bioengineering, researchers have investigated these forms as porous scaffolds intended to support the growth of bone and other tissue.',
			//"The geometry is no longer only something to recognize — here it becomes a starting point for **design**. The properties researchers actually care about (interconnected pores, surface area, mechanical strength) depend on the specific geometry chosen, not on mathematical minimality by itself.",
			//'Bioengineered scaffolds already sit near the boundary between engineering, biology, and materials science. Following the mathematics into materials makes that boundary blur further: some minimal-surface-like structures are deliberately designed, while others emerge through the behavior of the materials themselves.'
		],
		papers: [
			{
				paperId: 'W2120559167',
				title: 'Bone tissue regeneration: the role of scaffold geometry',
				year: 2014,
				body: [
					'This influential review argues that the geometry of a scaffold — a porous structure that supports the growth of new bone tissue — can significantly influence how new bone forms.',
					'Researchers have explored many possible scaffold geometries, from structures inspired by natural bone to mathematically defined architectures. This review identifies minimal-surface geometries as one particularly promising family, because they combine interconnected pores with favorable mechanical and transport properties.'
				]
			},
			{
				paperId: 'W2943941736',
				title: 'Additively manufactured porous metallic biomaterials',
				year: 2019,
				body: [
					'By the late 2010s, advances in metal 3D printing made these intricate geometries practical to manufacture.',
					'This review discusses how they were being investigated for orthopedic implants and other biomedical applications where internal geometry strongly influences mechanical strength and biological performance.'
				]
			}
		],
		openQuestion: null,
		view: spotlight(FIELD_PAPER_IDS.engineering)
	},

	// --- Materials Science ---
	{
		id: 'materials-science',
		kicker: 'Materials Science',
		heading: 'Molecular-scale geometries',
		body: [
			'Shrink down much further, to the scale of molecules and atoms, and minimal surfaces appear again.',
			'Under some conditions, materials spontaneously organize themselves into microscopic networks. Researchers discovered that some of these structures closely resemble minimal surfaces mathematicians had described.',
			'In other cases, researchers have used known minimal surfaces as templates for imagining new materials, asking how carbon atoms might be arranged along their intricate geometries.'

		//	'At microscopic scales, some materials organize themselves into intricate networks resembling triply periodic minimal surfaces. Researchers studying self-assembling block copolymers have used minimal-surface geometry to help **recognize and describe** these structures. Other work explores related curved geometries in deliberately conceived materials, including forms of curved carbon.',
		//	'Here the relationship runs in both directions: mathematics can help researchers understand structures that emerge through self-assembly, and imagine structures that might be made.',
		//	'So far, much of this story has involved the **forms** studied by minimal-surface mathematics. But an idea can travel without its shape. Sometimes what crosses into another field is the mathematical machinery itself.'
		],
		papers: [
			{
				paperId: 'W2044735577',
				title: 'Bicontinuous Cubic Morphologies in Block Copolymers and Amphiphile/Water Systems',
				year: 1997,
				body: [
					'Certain plastics, and mixtures of oil-like and water-like molecules, naturally separate into complex three-dimensional networks.',
					'This paper helped show how a family of minimal surfaces — including the gyroid and Schwarz surfaces — could describe those structures.'
				]
			},
			{
				paperId: 'W2002021482',
				title: 'Triply Periodic Minimal Surfaces Decorated with Curved Graphite',
				year: 1993,
				body: [
					'This paper asked whether carbon atoms could be arranged into entirely new three-dimensional architectures inspired by minimal-surface geometry.',
					'It helped launch the study of a family of materials now known as schwarzites, whose unusual geometry continues to attract interest for potential applications in nanomaterials and energy technologies.'
				],
				openQuestion:
					'Needs more research: which proposed properties (mechanical, electronic, catalytic) have been demonstrated experimentally versus remaining theoretical?'
			}
		],
		openQuestion: null,
		view: spotlight(FIELD_PAPER_IDS.materials_science)
	},

	// --- Computer Science ---
	{
		id: 'computer-science',
		kicker: 'Computer Science',
		heading: 'Mathematics and Computation',
		body: [
			"As early as the 1980s computer graphics was aiding the mathematical study of minimal surfaces.",
			"Soon after the exchange began running the other way. Researchers turned the mathematics of surfaces into computational methods for other problems: finding the boundaries of objects in three-dimensional images, a key task in computer vision; reconstructing the shape and movement of organs from a limited set of measured points; and generating forms for tensile structures, allowing architects and engineers to digitally design and analyze the kinds of curved structures once explored with physical soap-film models."

			//'Before a computer can recognize an object, it first needs to determine where that object begins and ends — a surprisingly difficult problem. Methods developed around minimal surfaces have been adapted as computational tools for exactly this kind of question, in work ranging from image segmentation to the reconstruction of complex three-dimensional motion.',
			//'Here, what travels is not necessarily a recognizable catenoid, helicoid, or gyroid. It can be a **method** for finding, separating, reconstructing, or analyzing surfaces.',
			//'One of these methods crosses disciplinary boundaries again: the same kind of minimal-surface algorithm used for image segmentation reappears in biological research, reconstructing the movement of the tongue from anatomical scans.',
			//'Elsewhere, the mathematics moves in a different direction again — not toward a structure that can be fabricated or observed directly, but into mathematical theories of the physical world.'
		],
		papers: [
			{
				paperId: 'W2044920528',
				title: 'The computer-aided discovery of new embedded minimal surfaces',
				year: 1987,
				body: [
					'In the 1980s, David Hoffman used computer-generated images to investigate newly discovered minimal surfaces too complicated to fully picture from equations alone.',
					'These visuals helped reveal properties that could then be proved mathematically — computer graphics working here as a tool for mathematical discovery, before the exchange between the two fields ran the other way.'
				]
			},
			{
				paperId: 'W2151783599',
				title: 'Minimal surfaces based object segmentation',
				year: 1997,
				body: [
					'This influential paper approaches image segmentation as a geometric optimization problem.',
					'Instead of tracing object boundaries directly, the algorithm searches for surfaces that naturally settle onto the edges of objects while minimizing a geometric energy — one of several important mathematical approaches to three-dimensional image segmentation during the late 1990s.'
				],
				openQuestion:
					'Needs more research: how influential did this particular approach remain as machine learning transformed computer vision?'
			},
			{
				paperId: 'W3026088860',
				title: 'XROMM and diceCT reveal a hydraulic mechanism of tongue base retraction',
				year: 2020,
				body: [
					'Although motivated by anatomy, this paper uses minimal-surface mathematics in a different way: researchers reconstructed smooth three-dimensional anatomical surfaces from sparse measurements using a minimal-surface algorithm.',
					'Here the mathematics functions less as an explanation of biology than as a scientific tool.'
				]
			},
			{
				paperId: 'W1878245702',
				title: 'Quasi-harmonic Bézier approximation of minimal surfaces for finding forms of structural membranes',
				year: 2015,
				body: [
					'Long before computers, architects and engineers found the shapes of tensile fabric structures using physical soap-film models — a soap film naturally settles into a minimal surface.',
					'This paper folds that same search into a computational design pipeline: it approximates minimal surfaces with Bézier patches so a candidate roof or canopy shape can be generated, analyzed for structural performance, and refined digitally, without ever building a physical model.'
				]
			}
		],
		openQuestion: null,
		view: spotlight(FIELD_PAPER_IDS.computer_science)
	},

	// --- Physics ---
	{
		id: 'physics',
		kicker: 'Physics',
		heading: 'Inside the equations of spacetime',
		body: [
			'While <em>Poetry of the Universe</em> doesn\'t discuss minimal surfaces, this field of math has led directly back to the book\'s subject: our attempts to understand the universe itself.',
			'Minimal surfaces and mathematical ideas developed around them now appear in theoretical physics, in work involving **fields and branes, black holes and the geometry of spacetime**.',
			'Here, the mathematics becomes part of the **framework scientists use to reason about physical systems** that may be difficult or impossible to observe directly.'
//			'One of the most surprising branches leads into theoretical physics. Minimal surfaces and mathematical ideas developed around them appear in areas far removed from soap films: in work involving fields and branes, and in geometry related to black holes and spacetime.',
//			'In these settings, the mathematics can become part of the framework scientists use to **reason about** physical systems that may be difficult or impossible to observe directly.'
		],
		papers: [
			{
				paperId: 'W2034409564',
				title: 'Born–Infeld particles and Dirichlet p-branes',
				year: 1998,
				body: ['A highly influential paper in string theory exploring the geometry of Dirichlet branes.'],
				openQuestion:
					"Needs more research: clarify exactly how minimal surface theory enters this work, and the role Osserman's Survey plays in the citation."
			},
			{
				paperId: 'W2002168123',
				title: 'Regions with trapped surfaces in spherical symmetry',
				year: 2011,
				body: [
					'A general-relativity paper studying trapped surfaces associated with strong gravitational fields and black-hole formation.',
					'Although trapped surfaces are distinct from classical minimal surfaces, they belong to a closely related family of geometric ideas.'
				]
			}
		],
		openQuestion: null,
		view: spotlight(FIELD_PAPER_IDS.physics)
	},

	// --- Free exploration / epilogue ---
	{
		id: 'free-exploration',
		kicker: null,
		heading: 'Explore further',
		body: [
			'These are only a small sample of the papers that cite the Survey.',
			'The graph is interactive — hover any point to see the paper it represents.',
			'Click filter in the top right to limit to a subset of articles.'
		],
		openQuestion: null,
		view: NONE_VIEW
	},
	/*{
		id: 'epilogue',
		kicker: null,
		heading: 'The story is still unfolding',
		body: [
			'None of these applications were visible when the mathematics was first developed.',
			'The mathematicians who studied minimal surfaces in the nineteenth and twentieth centuries were not designing medical implants, training computers to recognize images, or modeling cell membranes.',
			'They were exploring geometry for its own sake.',
			'Yet over the decades, those abstract ideas found unexpected homes across science and engineering.',
			'This visualization is not a complete history of minimal surfaces.',
			'It is an attempt to trace some of the surprising paths by which one area of pure mathematics gradually became part of our understanding—and shaping—of the world.'
		],
		openQuestion: null,
		view: NONE_VIEW
	}*/
];

// The stanza's cover -- same shape and role as introSlide in the other two
// stanzas' content files (nonEuclideanGeometry.js, minimalSurfaces.js): a
// full-viewport card the reader scrolls past before the two-column layout
// begins, rendered by .cover-section/.cover-card in +page.svelte. Distinct
// from steps[0] above (id 'intro'), which is the first sidebar step of the
// scrollytelling sequence itself, paired to the graph's initial view -- this
// is the frame before any of that starts. The epigraph paragraph (starting
// with "> ") renders as a blockquote styled like the other stanzas' openings;
// split at " - " so splitQuote in +page.svelte can find the attribution.
export const intro = {
	title: 'Beyond Mathematics',
	body: [
		'Two decades before Heinrich Hertz first experimentally demonstrated electromagnetic waves, James Clerk Maxwell developed a set of equations that predicted their existence.',
		'Hertz wrote of Maxwell\'s work: "One cannot escape the feeling that these mathematical formulas have an independent existence and an intelligence of their own ... that we get more out of them than was originally put into them." [as cited in *Poetry of the Universe*]',
		'> "Neither Maxwell nor Hertz nor anyone else at the time would have dreamed that out of those few equations would grow the future industries of radio, television, radar, as well as countless other scientific and technological applications." - Robert Osserman, *Poetry of the Universe*',
		"My father's own field subtly echoes this story. To see how, we begin with another book he wrote: *A Survey of Minimal Surfaces*."
	]
};
