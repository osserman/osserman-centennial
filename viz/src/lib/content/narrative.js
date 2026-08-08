// Narrative content for the scrollytelling sequence, transcribed from
// scrollytelling-draft-texts.md. Kept as plain data (not component markup)
// so it stays easy to revise independently of the visualization code, per
// scrollytelling-project-context.md's explicit design requirement.
//
// Each step's `view` is a declarative instruction to <CitationGraph> — see
// its ViewSpec typedef. `openQuestion` renders as a visible aside, not a
// silently-dropped bracketed note, per the design doc's requirement to
// distinguish evidence from interpretation from open questions.

// Curated paper IDs grouped by pathway (see scripts/export_viz_data.py's
// CURATED_PAPERS for the section/pathway tagging this mirrors).
const PATHWAY_IDS = {
	hidden_structure: ['W2169776346', 'W2612605708', 'W2999050204', 'W2112838653', 'W2044735577'],
	design_language: ['W2120559167', 'W2943941736', 'W2002021482'],
	computational_tool: ['W2151783599', 'W3026088860'],
	physical_theory: ['W2034409564', 'W2002168123']
};

const NONE_VIEW = { colorBy: 'none', highlightIds: [], dimBackground: false };
// Single-hue highlight against a grey field, not a two-hue split — see
// CitationGraph's colorFor/isDimmed for 'math' vs 'nonMath'.
const MATH_VIEW = { colorBy: 'math', highlightIds: [], dimBackground: false };
const NON_MATH_VIEW = { colorBy: 'nonMath', highlightIds: [], dimBackground: false };
const DIM_VIEW = { colorBy: 'none', highlightIds: [], dimBackground: true };

function spotlight(ids) {
	return { colorBy: 'none', highlightIds: ids, dimBackground: true };
}

export const steps = [
	{
		id: 'intro',
		kicker: null,
		heading: 'The propagation of minimal surface mathematatics',
		subheading: 'Tracing the unexpected journeys of math theory to practice',
		body: [
			'In 1969, Robert Osserman published <strong>A Survey of Minimal Surfaces</strong>.',
			"It was the first broad graduate-level mathematics textbook spanning this sub-field of geometry.",
			'More than fifty years later, the book has been cited by over **1,000** scholarly publications.',
			"Scroll down to learn more."
		],
		openQuestion: null,
		view: NONE_VIEW
	},
	{
		id: 'math',
		kicker: null,
		heading: 'Mathematics',
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
			"Many of these pathways are visible with the 300+ works from outside mathematics citing Osserman's textbook." ,
			'Here are a few examples...'
		],
		openQuestion: null,
		view: NON_MATH_VIEW
	},

	// --- Engineering & Bioengineering ---
	{
		id: 'engineering-intro',
		kicker: 'Engineering & Bioengineering',
		heading: 'Building scaffolds the body can grow through',
		body: [
			'Researchers designing artificial bone, medical implants and tissue scaffolds face a difficult balancing act.',
			'The structures need to be strong enough to support the body while remaining porous enough for cells, blood vessels and nutrients to move through them.',
			'Ideas from minimal surface mathematics offered one possible solution.' 
		],
		openQuestion: 'Verification questions: is the above accurate; and how important have these minimal-surface informed designs been as the field evolves.',
		view: DIM_VIEW
	},
	{
		id: 'engineering-scaffold',
		kind: 'paper',
		paperId: 'W2120559167',
		kicker: 'Engineering & Bioengineering',
		heading: 'Bone tissue regeneration: the role of scaffold geometry (2014)',
		body: [
			"This influential review argues that the geometry of a scaffold (a porous structure that supports the growth of new bone tissue) can significantly influence how new bone forms.",
			"Researchers have explored many possible scaffold geometries — from structures inspired by natural bone to mathematically defined architectures. This review identifies minimal-surface geometries as one particularly promising family because they combine interconnected pores with favorable mechanical and transport properties."
		],
		openQuestion: 'Verification questions: is the above accurate; how have these promising minimal-surfaces approaches held up?',
		view: spotlight(['W2120559167'])
	},
	{
		id: 'engineering-am',
		kind: 'paper',
		paperId: 'W2943941736',
		kicker: 'Engineering & Bioengineering',
		heading: 'Additively manufactured porous metallic biomaterials (2019)',
		body: [
			'By the late 2010s, advances in metal 3D printing made these intricate geometries practical to manufacture.',
			'This review discusses how they were being investigated for orthopedic implants and other biomedical applications where internal geometry strongly influences mechanical strength and biological performance.'
		],
		openQuestion: 'Verification question: is the above accurate?',
		view: spotlight(['W2120559167', 'W2943941736'])
	},

	// --- Materials Science ---
	{
		id: 'materials-intro',
		kicker: 'Materials Science',
		heading: 'Recognizing shapes nature already produces',
		body: [
			"One area of materials science studies self-assembly: how, when the conditions are right, molecules can spontaneously organize themselves into remarkably intricate three-dimensional networks only billionths of a meter across.",
			'As researchers began studying these microscopic networks, they realized many closely resembled surfaces mathematicians had already been exploring for decades.',
			'Minimal-surface mathematics provided a language for recognizing, describing, and eventually engineering these hidden geometries.'
		],
		openQuestion: 'Verification question: is the above accurate?',
		view: DIM_VIEW
	},
	{
		id: 'materials-copolymers',
		kind: 'paper',
		paperId: 'W2044735577',
		kicker: 'Materials Science',
		heading: 'Bicontinuous Cubic Morphologies in Block Copolymers and Amphiphile/Water Systems (1997)',
		body: [
			'Certain plastics and mixtures of oil-like and water-like molecules naturally separate into complex three-dimensional networks.',
			'This paper helped show how a family of minimal surfaces—including the gyroid and Schwarz surfaces—could describe those structures.',
		],
		openQuestion: null,
		view: spotlight(['W2044735577'])
	},
	{
		id: 'materials-carbon',
		kind: 'paper',
		paperId: 'W2002021482',
		kicker: 'Materials Science',
		heading: 'Triply Periodic Minimal Surfaces Decorated with Curved Graphite (1993)',
		body: [
			"This paper asked whether carbon atoms could be arranged into entirely new three-dimensional architectures inspired by minimal-surface geometry.", 
			"It helped launch the study of a family of materials now known as schwarzites, whose unusual geometry continues to attract interest for potential applications in nanomaterials and energy technologies."	
		],
		openQuestion:
			'Needs more research: verify, and clarify which proposed properties (e.g. mechanical, electronic, catalytic, etc.) have been demonstrated experimentally versus remaining theoretical.',
		view: spotlight(['W2044735577', 'W2002021482'])
	},

	// --- Biology ---
	{
		id: 'biology-intro',
		kicker: 'Biology',
		heading: 'Does life itself organize around these geometries?',
		body: [
			'Beyond engineered materials, researchers have also discovered that similar geometries appear throughout nature—from cell membranes to the architecture of the heart.',
		],
		openQuestion: null,
		view: DIM_VIEW
	},
	{
		id: 'biology-heart',
		kind: 'paper',
		paperId: 'W2169776346',
		kicker: 'Biology',
		heading: 'Heart wall myofibers are arranged in minimal surfaces to optimize organ function (2012)',
		body: [
			"This paper proposes that the arrangement of muscle fibers through the wall of the heart follows a generalized helicoid, which is an extension of one of the classic 19th-century minimal surfaces developed by generations of geometers.",
			"The authors argue that this geometry helps explain how the heart bundles its muscle fibers while minimizing fiber length and helping the heart pump blood efficiently."
		],
		openQuestion: null,
		view: spotlight(['W2169776346'])
	},
	{
		id: 'biology-membrane',
		kind: 'paper',
		paperId: 'W2612605708',
		kicker: 'Biology',
		heading: 'Gaussian curvature directs the distribution of spontaneous curvature on bilayer membrane necks (2018)',
		body: [
			"Cell membranes constantly bend, merge and divide as cells grow, communicate and transport materials.",
			"This paper investigates how the geometry of the narrow membrane necks formed during these processes influences where proteins accumulate."
		],
		openQuestion: null,
		view: spotlight(['W2169776346', 'W2612605708'])
	},
	{
		id: 'biology-explore',
		kicker: 'Biology',
		heading: 'Explore further',
		body: [],
		list: ['On Virus Growth and Form (2020)', 'Electrostatic Colloid–Membrane Binding'],
		openQuestion: null,
		view: spotlight(['W2169776346', 'W2612605708', 'W2999050204', 'W2112838653'])
	},

	// --- Computer Science ---
	{
		id: 'cs-intro',
		kicker: 'Computer Science',
		heading: 'Where does an object begin and end?',
		body: [
			'Minimal surfaces found another unexpected home in computer vision.',
			'Before a computer can recognize an object, it first needs to determine where that object begins and ends.',
			'That turns out to be a surprisingly difficult problem.'
		],
		openQuestion: null,
		view: DIM_VIEW
	},
	{
		id: 'cs-segmentation',
		kind: 'paper',
		paperId: 'W2151783599',
		kicker: 'Computer Science',
		heading: 'Minimal surfaces based object segmentation (1997)',
		body: [
			'This influential paper approaches image segmentation as a geometric optimization problem.',
			'Instead of tracing object boundaries directly, the algorithm searches for surfaces that naturally settle onto the edges of objects while minimizing a geometric energy.',
			'It became one of several important mathematical approaches to three-dimensional image segmentation during the late 1990s.'
		],
		openQuestion:
			'Needs more research: how influential did this particular approach remain as machine learning transformed computer vision?',
		view: spotlight(['W2151783599'])
	},
	{
		id: 'cs-xromm',
		kind: 'paper',
		paperId: 'W3026088860',
		kicker: 'Computer Science',
		heading: 'XROMM and diceCT reveal a hydraulic mechanism of tongue base retraction (2020)',
		body: [
			'Although motivated by anatomy, this paper uses minimal-surface mathematics in a different way.',
			'Researchers reconstructed smooth three-dimensional anatomical surfaces from sparse measurements using a minimal-surface algorithm.',
			'Here the mathematics functions less as an explanation of biology than as a scientific tool.'
		],
		openQuestion: null,
		view: spotlight(['W2151783599', 'W3026088860'])
	},

	// --- Physics ---
	{
		id: 'physics-intro',
		kicker: 'Physics',
		heading: 'Inside the equations of spacetime',
		body: [
			'One of the most surprising branches leads into theoretical physics.',
			'Here related geometric ideas appear not in materials or biological structures, but inside mathematical descriptions of spacetime and fundamental particles.'
		],
		openQuestion: null,
		view: DIM_VIEW
	},
	{
		id: 'physics-borninfeld',
		kind: 'paper',
		paperId: 'W2034409564',
		kicker: 'Physics',
		heading: 'Born–Infeld particles and Dirichlet p-branes (1998)',
		body: ['A highly influential paper in string theory exploring the geometry of Dirichlet branes.'],
		openQuestion:
			"Needs more research: clarify exactly how minimal surface theory enters this work, and the role Osserman's Survey plays in the citation.",
		view: spotlight(['W2034409564'])
	},
	{
		id: 'physics-trapped',
		kind: 'paper',
		paperId: 'W2002168123',
		kicker: 'Physics',
		heading: 'Region with trapped surfaces in spherical symmetry… (2011)',
		body: [
			'A general-relativity paper studying trapped surfaces associated with strong gravitational fields and black-hole formation.',
			'Although trapped surfaces are distinct from classical minimal surfaces, they belong to a closely related family of geometric ideas.'
		],
		openQuestion: null,
		view: spotlight(['W2034409564', 'W2002168123'])
	},

	// --- Reinterpretation ---
	{
		id: 'pathways-intro',
		kicker: null,
		heading: 'Many fields. But only a few recurring pathways.',
		body: [
			'At first glance these papers seem to have little in common.',
			'Bone implants. Computer vision. Cell membranes. String theory. Heart anatomy.',
			'Yet many of them rely on minimal-surface mathematics in surprisingly similar ways.',
			'The same mathematical ideas have repeatedly crossed disciplinary boundaries—not because they solved the same problem, but because they entered the world through a handful of recurring relationships.'
		],
		openQuestion: null,
		// All 12 highlighted (visible, ringed) but deliberately not yet colored
		// by pathway — the categorization is revealed one pathway at a time,
		// starting with pathway-1 below.
		view: spotlight(Object.values(PATHWAY_IDS).flat())
	},
	{
		id: 'pathway-1',
		kicker: 'Pathway 1',
		heading: 'Mathematics discovers hidden structure',
		body: [
			'Sometimes mathematicians explored geometries long before scientists recognized similar forms in nature.',
			'Here mathematics becomes a language for recognizing patterns already present in the natural world.'
		],
		list: ['Heart-wall myofibers', 'Membrane geometry', 'Self-assembled materials', 'Virus morphology'],
		openQuestion: null,
		view: { colorBy: 'pathway', highlightIds: PATHWAY_IDS.hidden_structure, dimBackground: true }
	},
	{
		id: 'pathway-2',
		kicker: 'Pathway 2',
		heading: 'Mathematics becomes a design language',
		body: [
			'Sometimes researchers deliberately build with mathematical ideas.',
			'Instead of asking what shapes nature produces, they ask what shapes might work best.',
			'Geometry becomes a tool for invention.'
		],
		list: ['Bone scaffolds', 'Porous metallic biomaterials', 'Carbon structures', 'TPMS-inspired polymers'],
		openQuestion: null,
		view: { colorBy: 'pathway', highlightIds: PATHWAY_IDS.design_language, dimBackground: true }
	},
	{
		id: 'pathway-3',
		kicker: 'Pathway 3',
		heading: 'Mathematics becomes a computational tool',
		body: [
			"Sometimes the mathematics isn't describing the object at all.",
			'Instead it becomes part of the algorithm.',
			'The mathematics quietly disappears into software used to analyze the world.'
		],
		list: ['Image segmentation', 'Anatomical surface reconstruction'],
		openQuestion: null,
		view: { colorBy: 'pathway', highlightIds: PATHWAY_IDS.computational_tool, dimBackground: true }
	},
	{
		id: 'pathway-4',
		kicker: 'Pathway 4',
		heading: 'Mathematics becomes part of physical theory',
		body: [
			'Sometimes geometric ideas become embedded in the equations used to describe reality itself.'
		],
		list: ['String theory', 'General relativity'],
		openQuestion: 'Future branch: holography?',
		view: { colorBy: 'pathway', highlightIds: PATHWAY_IDS.physical_theory, dimBackground: true }
	},

	// --- Free exploration / epilogue ---
	{
		id: 'free-exploration',
		kicker: null,
		heading: 'Explore further',
		body: [
			'These are only a small sample of the papers that cite the Survey.',
			'The graph is interactive — hover any point to see the paper it represents.'
		],
		openQuestion: null,
		view: NONE_VIEW
	},
	{
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
	}
];
