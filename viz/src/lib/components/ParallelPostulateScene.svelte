<script module>
	// Stage boundaries — exported so +page.svelte can derive which scrolling
	// prompt to highlight from the same numbers this scene animates against
	// (same reasoning as MeanCurvatureScene's own exported boundaries).
	export const LINES_END = 0.1; // two bare lines, no transversal yet
	export const TRANSVERSAL_END = 0.18; // transversal fades in
	export const ROTATE_END = 0.5; // continuous rotation + live equation/verdict
	// Between ROTATE_END and ALTERNATE_END: a brief hold at "won't
	// intersect" (nothing changes), then the rotate-beat's own wedges/text
	// fade fully out, *then* the second transversal fades in — sequential,
	// not overlapping (an earlier version cross-faded them, which read as
	// muddled since old and new content were both partially visible at once).
	export const ALT_HOLD_END = 0.56;
	export const ALT_FADEOUT_END = 0.63;
	export const ALTERNATE_END = 0.72; // second transversal, 4 colored wedges
	export const TRIANGLE_END = 0.92; // transversals converge to a point on the line
	// Beyond TRIANGLE_END: the three wedges settle into the straight-line
	// proof; at progress >= 1 the triangle's vertices become drag handles.
</script>

<script>
	// Slide 2's scene: Euclid's parallel postulate, worked through as one
	// continuous scroll-scrubbed construction — two bare lines, a
	// transversal, a continuously rotating top line with a live angle-sum
	// readout showing which side (if either) the lines would meet on, a
	// second transversal demonstrating alternate angles are equal, the two
	// transversals sliding together to a shared point *on* the top line, and
	// the classic straight-line proof that a triangle's angles sum to 180.
	// Once scrolling completes the reader can drag the triangle's own
	// vertices and watch the angle sum stay 180 no matter the shape.
	//
	// Design followed closely from a set of reference mockups plus two
	// rounds of direct feedback on earlier versions of this file:
	//  - transversals are trimmed to exactly the segment between the two
	//    lines they cross — no overhang past either intersection.
	//  - wedges render *behind* the black lines (painter's order below),
	//    so the vertex itself stays crisp.
	//  - the top line pivots at its own fixed crossing point with
	//    transversal 1 (T1_FIXED below), not around some unrelated center.
	//  - the two transversals *translate* toward each other (same angle,
	//    same shape, just slid sideways) rather than bending/rotating — see
	//    the shift1/shift2 math below. Both endpoints of each transversal
	//    move by the same vector, which is what "translate" means.
	//  - there is exactly one line per transversal, always (see
	//    currentB1/currentApex1 etc.) — an earlier version drew the
	//    original fixed transversal *and* a separate sliding copy at the
	//    same time, which looked like two overlapping lines.
	//  - once dragging unlocks: the two base vertices are constrained to
	//    horizontal movement along the bottom line; the apex is free, and
	//    the top line (plus its "carried angle" wedges) moves with it,
	//    which is what keeps the alternate-angle relationship — and the
	//    180 proof itself — geometrically true for whatever triangle the
	//    reader drags into being, not just the scripted one.
	//
	// Plain SVG, not three.js — everything here is flat-plane geometry.
	// Coordinate note: SVG y increases downward. `visualAngle` throughout
	// this file means "0 = horizontal, positive = tilts up on screen" (the
	// everyday reading of a slope), converted to y-down math internally by
	// negating the sine term wherever it's used — see angleToDir.
	let { progress = 0, dragEnabled = false } = $props();

	const VIEW_W = 600;
	const VIEW_H = 480;
	const BOTTOM_Y = 300;
	const TOP_Y_NOMINAL = 150; // only used to seed T1_FIXED below
	const CENTER_X = 300;
	const HALF_LEN = 250;
	// Swapped from an earlier version so the sweep starts on the right
	// (sum < 180) and moves through parallel to the left (sum > 180) —
	// was the other way around.
	const TOP_ANGLE_START = -10; // deg, tilted down-right initially
	const TOP_ANGLE_OVERSHOOT = 10; // deg, swept past parallel to show the flip
	// Wide gap — the two transversals need real room to visibly slide
	// together into a triangle, not just nudge inward.
	const TRANSVERSAL1_X = 140; // where it crosses the bottom line
	const TRANSVERSAL1_ANGLE = 70; // 90 - 20 (20 deg off perpendicular)
	const TRANSVERSAL2_X = 460;
	const TRANSVERSAL2_ANGLE = 125; // 90 + 35 (mirrors transversal 1 inward)
	// Same radius for every wedge (an earlier version made the gold "test"
	// wedge larger, which read as inconsistent once the others settled).
	const WEDGE_R_SMALL = 28;
	const LABEL_PAD = 22;
	const VERDICT_Y = 335; // just under the bottom line, not down by the equation
	const EQUATION_Y = 405;
	const HANDLE_RADIUS = 7;
	const BASE_DRAG_MARGIN = 12; // keep base handles from sliding off the line's ends

	function lerp(a, b, t) {
		return a + (b - a) * t;
	}
	function lerpPt(a, b, t) {
		return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
	}
	function remap(t, lo, hi) {
		return Math.max(0, Math.min(1, (t - lo) / (hi - lo)));
	}
	function toRad(deg) {
		return (deg * Math.PI) / 180;
	}
	// Unit direction vector for a visual angle (see the note above).
	function angleToDir(deg) {
		const r = toRad(deg);
		return [Math.cos(r), -Math.sin(r)];
	}
	function addScaled(p, dir, len) {
		return [p[0] + dir[0] * len, p[1] + dir[1] * len];
	}
	// Intersection of two lines, each given as a point + visual angle.
	function intersect(p1, angle1, p2, angle2) {
		const d1 = angleToDir(angle1);
		const d2 = angleToDir(angle2);
		const denom = d1[0] * d2[1] - d1[1] * d2[0];
		if (Math.abs(denom) < 1e-9) return null;
		const dx = p2[0] - p1[0];
		const dy = p2[1] - p1[1];
		const t = (dx * d2[1] - dy * d2[0]) / denom;
		return addScaled(p1, d1, t);
	}
	// Interior angle (0-180) at `vertex` between rays toward `a` and `b`.
	function angleBetween(vertex, a, b) {
		const v1 = [a[0] - vertex[0], a[1] - vertex[1]];
		const v2 = [b[0] - vertex[0], b[1] - vertex[1]];
		const m1 = Math.hypot(v1[0], v1[1]);
		const m2 = Math.hypot(v2[0], v2[1]);
		if (m1 < 1e-6 || m2 < 1e-6) return 0;
		const cos = Math.max(-1, Math.min(1, (v1[0] * v2[0] + v1[1] * v2[1]) / (m1 * m2)));
		return (Math.acos(cos) * 180) / Math.PI;
	}
	// Filled pie-slice path for the (always minor, <=180deg) angle at
	// `vertex` swept from the direction toward `a` to the direction toward `b`.
	function wedgePath(vertex, a, b, radius) {
		const a1 = Math.atan2(-(a[1] - vertex[1]), a[0] - vertex[0]);
		const a2 = Math.atan2(-(b[1] - vertex[1]), b[0] - vertex[0]);
		const p1 = [vertex[0] + radius * Math.cos(a1), vertex[1] - radius * Math.sin(a1)];
		const p2 = [vertex[0] + radius * Math.cos(a2), vertex[1] - radius * Math.sin(a2)];
		let diff = a2 - a1;
		while (diff <= -Math.PI) diff += 2 * Math.PI;
		while (diff > Math.PI) diff -= 2 * Math.PI;
		const sweepFlag = diff > 0 ? 0 : 1;
		return `M ${vertex[0].toFixed(1)} ${vertex[1].toFixed(1)} L ${p1[0].toFixed(1)} ${p1[1].toFixed(1)} A ${radius} ${radius} 0 0 ${sweepFlag} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)} Z`;
	}
	// Point along the angle's own bisector, at `radius` from vertex — used
	// to place numeric labels just outside a wedge.
	function bisectorPoint(vertex, a, b, radius) {
		const a1 = Math.atan2(-(a[1] - vertex[1]), a[0] - vertex[0]);
		const a2 = Math.atan2(-(b[1] - vertex[1]), b[0] - vertex[0]);
		let diff = a2 - a1;
		while (diff <= -Math.PI) diff += 2 * Math.PI;
		while (diff > Math.PI) diff -= 2 * Math.PI;
		const mid = a1 + diff / 2;
		return [vertex[0] + radius * Math.cos(mid), vertex[1] - radius * Math.sin(mid)];
	}

	// --- fixed points, independent of progress — computed once ---
	const B1_FIXED = [TRANSVERSAL1_X, BOTTOM_Y];
	const B2_FIXED = [TRANSVERSAL2_X, BOTTOM_Y];
	// The pivot: where transversal 1 crosses the top line once it's
	// horizontal. The top line rotates *around this fixed point* rather
	// than around some unrelated center — transversal 1 itself never has
	// to move during the rotate beat, only the top line swings around it.
	const T1_FIXED = intersect(B1_FIXED, TRANSVERSAL1_ANGLE, [CENTER_X, TOP_Y_NOMINAL], 0);
	const TOP_Y = T1_FIXED[1];
	// Extents chosen so the top line still spans roughly the same overall
	// width as the bottom line even though it now pivots off-center.
	const TOP_LEFT_EXTENT = T1_FIXED[0] - (CENTER_X - HALF_LEN);
	const TOP_RIGHT_EXTENT = CENTER_X + HALF_LEN - T1_FIXED[0];
	const T2_SETTLED = intersect(B2_FIXED, TRANSVERSAL2_ANGLE, T1_FIXED, 0);
	// Shared apex once the triangle forms — midway between the two
	// transversals' settled crossing points, on the (horizontal) top line.
	const APEX_FIXED = [(T1_FIXED[0] + T2_SETTLED[0]) / 2, TOP_Y];
	// Where B1/B2 actually end up once the scripted slide finishes (see
	// shift1/shift2 in the scene derivation below) — *not* B1_FIXED/
	// B2_FIXED, which is where they started before sliding. Seeding the
	// drag state from the pre-slide positions was a real bug: the base
	// vertices would snap back outward the instant dragging unlocked,
	// reading as a whole new (wider) triangle replacing the one just drawn.
	const B1_POST_SLIDE = [B1_FIXED[0] + (APEX_FIXED[0] - T1_FIXED[0]), BOTTOM_Y];
	const B2_POST_SLIDE = [B2_FIXED[0] + (APEX_FIXED[0] - T2_SETTLED[0]), BOTTOM_Y];
	const BOTTOM_X_MIN = CENTER_X - HALF_LEN + BASE_DRAG_MARGIN;
	const BOTTOM_X_MAX = CENTER_X + HALF_LEN - BASE_DRAG_MARGIN;

	let svgEl;
	function clientToLocal(clientX, clientY) {
		const rect = svgEl.getBoundingClientRect();
		return [((clientX - rect.left) / rect.width) * VIEW_W, ((clientY - rect.top) / rect.height) * VIEW_H];
	}
	// Apex: free to move anywhere (within a little vertical margin) — the
	// top line and its wedges follow it (see topP1/topP2 in the scene
	// derivation below).
	function makeApexDragHandlers(setter) {
		return {
			onpointerdown: (e) => e.currentTarget.setPointerCapture(e.pointerId),
			onpointermove: (e) => {
				if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
				const [x, y] = clientToLocal(e.clientX, e.clientY);
				setter([x, Math.max(30, Math.min(VIEW_H - 30, y))]);
			}
		};
	}
	// Base vertices: restricted to horizontal movement along the bottom
	// line, matching the construction they came from (they're points on a
	// fixed line, not free-floating) — and additionally bound by each
	// other, `isLeft` says which one this handle is, `getOtherX` reads the
	// other one's *current* x live (a closure over reactive state, not a
	// one-time snapshot) so B1 can never drag past B2 or vice versa.
	function makeBaseDragHandlers(setter, isLeft, getOtherX) {
		return {
			onpointerdown: (e) => e.currentTarget.setPointerCapture(e.pointerId),
			onpointermove: (e) => {
				if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
				const [x] = clientToLocal(e.clientX, e.clientY);
				const otherX = getOtherX();
				const clampedX = isLeft
					? Math.max(BOTTOM_X_MIN, Math.min(otherX - BASE_DRAG_MARGIN, x))
					: Math.min(BOTTOM_X_MAX, Math.max(otherX + BASE_DRAG_MARGIN, x));
				setter([clampedX, BOTTOM_Y]);
			}
		};
	}

	// --- draggable triangle vertices — null until dragging unlocks, then
	// seeded from the scripted construction's own end points (see the
	// $effect below) so there is no visual jump. currentB1/currentB2/
	// currentApex (in the scene derivation below) fall back to the fixed
	// scripted points whenever these are still null, which is what lets
	// the exact same rendering code serve both phases. ---
	let dragB1 = $state(null);
	let dragB2 = $state(null);
	let dragApex = $state(null);
	let seeded = false;
	$effect(() => {
		if (dragEnabled && !seeded) {
			seeded = true;
			dragB1 = B1_POST_SLIDE;
			dragB2 = B2_POST_SLIDE;
			dragApex = APEX_FIXED;
		} else if (!dragEnabled && seeded) {
			// Scrolling back up re-locks dragging (dragEnabled goes false
			// again) -- without this, currentB1/currentB2/currentApex below
			// (which fall back to the *scripted* points only when the drag
			// ones are null) would stay frozen on wherever dragging last
			// left the triangle forever after, instead of resuming the
			// scripted construction as progress decreases. Clearing these
			// lets the scene scrub backward correctly; scrolling forward
			// past the unlock point again reseeds fresh from the scripted
			// end state, same as the first time.
			seeded = false;
			dragB1 = null;
			dragB2 = null;
			dragApex = null;
		}
	});

	// --- one continuous derivation, driven by `progress` and (once
	// unlocked) the drag state above ---
	let scene = $derived.by(() => {
		const p = progress;

		const linesT = remap(p, 0, LINES_END);
		const transversalT = remap(p, LINES_END, TRANSVERSAL_END);
		const rotateT = remap(p, TRANSVERSAL_END, ROTATE_END);
		const altT = remap(p, ROTATE_END, ALTERNATE_END);
		// Sequential, not simultaneous: old content is fully opaque through
		// the hold, then fades out; new content only starts fading in once
		// the old is fully gone.
		const oldFadeT = remap(p, ALT_HOLD_END, ALT_FADEOUT_END);
		const newFadeT = remap(p, ALT_FADEOUT_END, ALTERNATE_END);
		const triT = remap(p, ALTERNATE_END, TRIANGLE_END);
		const proofT = remap(p, TRIANGLE_END, 1);

		// Top line's angle: sweeps from START past parallel to the
		// OVERSHOOT (showing the meet-side flip), then eases back to
		// exactly parallel (0) so later beats can assume a horizontal line.
		const topAngle =
			rotateT <= 0.7
				? lerp(TOP_ANGLE_START, TOP_ANGLE_OVERSHOOT, remap(rotateT, 0, 0.7))
				: lerp(TOP_ANGLE_OVERSHOOT, 0, remap(rotateT, 0.7, 1));
		const topDir = angleToDir(topAngle);
		const scriptedTopP1 = addScaled(T1_FIXED, topDir, -TOP_LEFT_EXTENT);
		const scriptedTopP2 = addScaled(T1_FIXED, topDir, TOP_RIGHT_EXTENT);

		const bottomP1 = [CENTER_X - HALF_LEN, BOTTOM_Y];
		const bottomP2 = [CENTER_X + HALF_LEN, BOTTOM_Y];

		// T1 is *always* T1_FIXED — the whole point of pivoting there.
		const T1 = T1_FIXED;
		const T2 = intersect(B2_FIXED, TRANSVERSAL2_ANGLE, T1_FIXED, topAngle) ?? T2_SETTLED;

		// --- angle at B1 (bottom, transversal 1): fixed regardless of
		// topAngle, since it only depends on the transversal vs. the
		// bottom line, both constant. ---
		const angleB1Deg = angleBetween(B1_FIXED, bottomP2, T1_FIXED);
		// --- angle at T1 (top, transversal 1): the co-interior angle
		// under test as the top line rotates — between the top line's
		// rightward ray (same side as bottomP2, for the "sum of same-side
		// interior angles" condition) and the transversal ray down toward
		// B1. Sums to 180 with angleB1Deg exactly when parallel —
		// verified numerically, not just by eye. ---
		const angleT1Deg = angleBetween(T1_FIXED, scriptedTopP2, B1_FIXED);
		const sumRounded = Math.round(angleB1Deg + angleT1Deg);
		const meetSign = sumRounded > 180 ? -1 : sumRounded < 180 ? 1 : 0; // -1 left, +1 right

		// --- translate (not bend) each transversal toward the shared
		// apex: both of its endpoints shift by the same horizontal vector,
		// so the segment keeps its original angle and length the whole
		// way, only sliding sideways. Both T1_FIXED/T2_SETTLED and
		// APEX_FIXED sit at the same y (TOP_Y), so this shift is exactly
		// horizontal — which is also why the base end lands back on the
		// bottom line (y unchanged) with no extra constraint needed. ---
		const shift1 = triT * (APEX_FIXED[0] - T1_FIXED[0]);
		const shift2 = triT * (APEX_FIXED[0] - T2_SETTLED[0]);
		const scriptedB1 = [B1_FIXED[0] + shift1, BOTTOM_Y];
		const scriptedB2 = [B2_FIXED[0] + shift2, BOTTOM_Y];
		const scriptedApex1 = [T1_FIXED[0] + shift1, TOP_Y];
		const scriptedApex2 = [T2_SETTLED[0] + shift2, TOP_Y];

		const currentB1 = dragB1 ?? scriptedB1;
		const currentB2 = dragB2 ?? scriptedB2;
		const currentApex1 = dragApex ?? scriptedApex1; // transversal 1's upper end
		const currentApex2 = dragApex ?? scriptedApex2; // transversal 2's upper end

		// The top line (and everything measured against it) moves with
		// the apex once dragging starts — same fixed left/right extents,
		// just recentered on wherever the apex currently is.
		const topP1 = dragApex ? [dragApex[0] - TOP_LEFT_EXTENT, dragApex[1]] : scriptedTopP1;
		const topP2 = dragApex ? [dragApex[0] + TOP_RIGHT_EXTENT, dragApex[1]] : scriptedTopP2;

		return {
			linesT,
			transversalT,
			rotateT,
			altT,
			oldFadeT,
			newFadeT,
			triT,
			proofT,
			bottomP1,
			bottomP2,
			topP1,
			topP2,
			T1,
			T2,
			currentB1,
			currentB2,
			currentApex1,
			currentApex2,
			angleB1Deg,
			angleT1Deg,
			sumRounded,
			meetSign,
			// rotate-beat wedges (single transversal, testing the top angle)
			wedgeB1: wedgePath(B1_FIXED, bottomP2, T1_FIXED, WEDGE_R_SMALL),
			wedgeT1: wedgePath(T1_FIXED, scriptedTopP2, B1_FIXED, WEDGE_R_SMALL),
			labelB1: bisectorPoint(B1_FIXED, bottomP2, T1_FIXED, WEDGE_R_SMALL + LABEL_PAD),
			labelT1: bisectorPoint(T1_FIXED, scriptedTopP2, B1_FIXED, WEDGE_R_SMALL + LABEL_PAD),
			// B1/B2's own wedges — unified across the alternate-angle beat,
			// the triangle forming, the scripted proof, *and* dragging.
			wedgeB1Base: wedgePath(currentB1, currentB2, currentApex1, WEDGE_R_SMALL),
			wedgeB2Base: wedgePath(currentB2, currentB1, currentApex2, WEDGE_R_SMALL),
			// The two "carried" wedges — at currentApex1/currentApex2
			// respectively, *not* a single shared point — so they slide
			// continuously with their own transversal from the moment
			// they first appear (altT > 0) through the whole triangle-
			// forming beat, rather than disappearing and a separate pair
			// reappearing once the two points meet. They naturally end up
			// at the same location once currentApex1 === currentApex2.
			apexWedgeLeft: wedgePath(currentApex1, topP1, currentB1, WEDGE_R_SMALL),
			apexWedgeRight: wedgePath(currentApex2, currentB2, topP2, WEDGE_R_SMALL),
			// The middle "own" wedge only makes sense once the two points
			// have actually met — shown separately, gated in the template.
			apexWedgeOwn: wedgePath(currentApex1, currentB1, currentB2, WEDGE_R_SMALL),
			// Above the top line (not inside the triangle, where it used to
			// overlap the gold wedge) — a fixed offset above the apex.
			labelApex: [currentApex1[0], currentApex1[1] - 26],
			// Degree labels for the four alternate-angle wedges above —
			// wedgeB1Base pairs with apexWedgeLeft (both wedge-a), wedgeB2Base
			// with apexWedgeRight (both wedge-b): same color, same numeric
			// value, which *is* the "alternate interior angles are equal"
			// claim made visible rather than just stated. Faded out as the
			// triangle forms (altLabelOpacity below) rather than left on --
			// once the two vertices converge these four numbers would stack
			// on top of each other and the single 180° proof label.
			angleB1OwnDeg: angleBetween(currentB1, currentB2, currentApex1),
			angleB2OwnDeg: angleBetween(currentB2, currentB1, currentApex2),
			angleApexLeftDeg: angleBetween(currentApex1, topP1, currentB1),
			angleApexRightDeg: angleBetween(currentApex2, currentB2, topP2),
			labelB1Own: bisectorPoint(currentB1, currentB2, currentApex1, WEDGE_R_SMALL + LABEL_PAD),
			labelB2Own: bisectorPoint(currentB2, currentB1, currentApex2, WEDGE_R_SMALL + LABEL_PAD),
			labelApexLeft: bisectorPoint(currentApex1, topP1, currentB1, WEDGE_R_SMALL + LABEL_PAD),
			labelApexRight: bisectorPoint(currentApex2, currentB2, topP2, WEDGE_R_SMALL + LABEL_PAD),
			altLabelOpacity: newFadeT * (1 - triT)
		};
	});

	let liveSum = $derived.by(() => {
		if (!dragB1 || !dragB2 || !dragApex) return null;
		const aB1 = angleBetween(dragB1, dragB2, dragApex);
		const aB2 = angleBetween(dragB2, dragApex, dragB1);
		const aApex = angleBetween(dragApex, dragB1, dragB2);
		return Math.round(aB1 + aB2 + aApex);
	});

	// side: 'left' | 'right' | null (parallel — no arrow, centered text)
	let verdict = $derived.by(() => {
		const diff = scene.sumRounded - 180;
		if (Math.abs(diff) < 1) return { text: "won't intersect", side: null };
		return { text: 'will intersect', side: diff > 0 ? 'left' : 'right' };
	});

	// --- on-canvas captions -- same pattern tried out in SphereGeometryScene:
	// once the animation is doing something specific, the explanatory text
	// sits directly over the scene, timed to the same progress boundaries
	// that drive the geometry, instead of living as scrolling left-panel
	// prompts. The left panel now keeps only the quiet opening setup (see
	// nonEuclideanGeometry.js's single 'parallel-postulate' stage) -- these
	// four carry forward its old stages 2-5. Each entry's optional `top`
	// (a CSS length/percent, e.g. '6%' or '80%') repositions just that one
	// caption within the scene panel -- omit it to use CAPTION_DEFAULT_TOP.
	const CAPTION_DEFAULT_TOP = '16%';
	// Two captions sharing the rotate beat's own window -- split the window
	// in two (rather than giving them the same start/end, which would just
	// overlap them) so the second only takes over once the first has had
	// its own dedicated stretch. Same `lerp` already used for the geometry
	// above; adjust the 0.5 to give one half more time than the other.
	const ROTATE_CAPTION_SPLIT = lerp(TRANSVERSAL_END, ALT_HOLD_END, 0.5);
	const CAPTIONS = [
		{
			start: TRANSVERSAL_END,
			end: ROTATE_CAPTION_SPLIT,
			text: "Euclid reasoned that if two interior angles on one side add up to less than 180°, the lines will eventually meet on that side."
		},
		{
			start: ROTATE_CAPTION_SPLIT,
			end: ALT_HOLD_END,
			text: "At exactly 180°, they'll never meet — they're parallel."
		},
		{
			start: ALT_FADEOUT_END,
			end: ALTERNATE_END,
			text: 'He showed that any line crossing two parallel lines creates alternate interior angles that are equal.'
		},
		{ start: ALTERNATE_END, end: TRIANGLE_END, text: 'And from here, he showed...' },
		{
			start: TRIANGLE_END,
			end: 1,
			text: "...any triangle's angles always add up to 180°."
		}
	];
	function captionOpacity(start, end, prog) {
		if (prog < start || prog > end) return 0;
		const fade = Math.min(0.15, (end - start) * 0.25) || 0.001;
		return Math.min(remap(prog, start, start + fade), 1 - remap(prog, end - fade, end));
	}
	let captionOpacities = $derived(CAPTIONS.map((c) => captionOpacity(c.start, c.end, progress)));
</script>

<svg
	bind:this={svgEl}
	class="scene"
	viewBox="0 0 {VIEW_W} {VIEW_H}"
	role="img"
	aria-label="Parallel postulate construction"
>
	<!-- base lines — always full width, never fade out, but fade to grey
	     once the triangle is fully formed: the triangle itself (drawn in
	     black below, including its own bottom edge) becomes the thing to
	     look at, and these read as background reference from here on. -->
	<g style="opacity:{scene.linesT}">
		<line x1={scene.bottomP1[0]} y1={scene.bottomP1[1]} x2={scene.bottomP2[0]} y2={scene.bottomP2[1]} class="line" class:faded={scene.proofT > 0 || dragEnabled} />
		<line x1={scene.topP1[0]} y1={scene.topP1[1]} x2={scene.topP2[0]} y2={scene.topP2[1]} class="line" class:faded={scene.proofT > 0 || dragEnabled} />
	</g>

	<!-- rotate/test-angle wedges — drawn *behind* the lines below (SVG
	     paints in document order) so the crossing point itself stays crisp
	     rather than getting buried under a filled wedge -->
	{#if scene.rotateT > 0 && scene.oldFadeT < 1}
		<g style="opacity:{Math.min(1, scene.rotateT * 3) * (1 - scene.oldFadeT)}">
			<path d={scene.wedgeB1} class="wedge wedge-a" />
			<path d={scene.wedgeT1} class="wedge wedge-c" />
			<text x={scene.labelB1[0]} y={scene.labelB1[1]} class="label label-a">{Math.round(scene.angleB1Deg)}°</text>
			<text x={scene.labelT1[0]} y={scene.labelT1[1]} class="label label-c">{Math.round(scene.angleT1Deg)}°</text>
			<text x={CENTER_X} y={EQUATION_Y} class="label equation" text-anchor="middle">
				<tspan class="eq-a">{Math.round(scene.angleT1Deg)}°</tspan>
				<tspan class="eq-neutral"> + </tspan>
				<tspan class="eq-c">{Math.round(scene.angleB1Deg)}°</tspan>
				<tspan class="eq-neutral"> {scene.sumRounded === 180 ? '=' : scene.sumRounded > 180 ? '>' : '<'} 180°</tspan>
			</text>
			<!-- verdict sits just under the bottom line, with a bold arrow
			     planted on whichever side the lines would actually meet on
			     — left of the text for a left meet, right of the text for a
			     right meet — rather than a fixed trailing arrow. -->
			<text x={CENTER_X} y={VERDICT_Y} class="label verdict" text-anchor="middle">{verdict.text}</text>
			{#if verdict.side === 'left'}
				<text x={CENTER_X - 88} y={VERDICT_Y} class="label verdict-arrow" text-anchor="middle">←</text>
			{:else if verdict.side === 'right'}
				<text x={CENTER_X + 88} y={VERDICT_Y} class="label verdict-arrow" text-anchor="middle">→</text>
			{/if}
		</g>
	{/if}

	<!-- the two "carried" wedges — one per transversal, each sliding
	     continuously with its own line from the moment it appears through
	     the whole triangle-forming beat and into dragging, rather than
	     disappearing and a separate pair reappearing once they meet. Fades
	     in via newFadeT — only after the rotate-beat's own content has
	     fully faded out (see oldFadeT above), not simultaneously. -->
	{#if scene.newFadeT > 0}
		<g style="opacity:{scene.newFadeT}">
			<path d={scene.apexWedgeLeft} class="wedge wedge-a" />
			<path d={scene.apexWedgeRight} class="wedge wedge-b" />
		</g>
	{/if}

	<!-- B1/B2's own wedges — unified across every later beat, drawn behind
	     the transversal lines below. -->
	{#if scene.newFadeT > 0}
		<path d={scene.wedgeB1Base} class="wedge wedge-a" style="opacity:{scene.newFadeT}" />
		<path d={scene.wedgeB2Base} class="wedge wedge-b" style="opacity:{scene.newFadeT}" />
	{/if}

	<!-- degree labels for the four alternate-angle wedges above -- same
	     color pairing as the wedges (wedge-a/label-a at B1 and apex-left,
	     wedge-b/label-b at B2 and apex-right) so the equal numbers read as
	     the same claim the color-matching already makes. Fades out as the
	     triangle forms (see altLabelOpacity) rather than persisting through
	     the proof, where the apex pair would otherwise stack on the 180°
	     label. -->
	{#if scene.altLabelOpacity > 0}
		<g style="opacity:{scene.altLabelOpacity}">
			<text x={scene.labelB1Own[0]} y={scene.labelB1Own[1]} class="label label-a">{Math.round(scene.angleB1OwnDeg)}°</text>
			<text x={scene.labelB2Own[0]} y={scene.labelB2Own[1]} class="label label-b">{Math.round(scene.angleB2OwnDeg)}°</text>
			<text x={scene.labelApexLeft[0]} y={scene.labelApexLeft[1]} class="label label-a">{Math.round(scene.angleApexLeftDeg)}°</text>
			<text x={scene.labelApexRight[0]} y={scene.labelApexRight[1]} class="label label-b">{Math.round(scene.angleApexRightDeg)}°</text>
		</g>
	{/if}

	<!-- the straight-line proof's middle wedge — appears only once the two
	     transversals have fully met (not progressively during the slide),
	     and stays visible through dragging: the construction (base
	     vertices on the bottom line, top line following the apex) keeps
	     it geometrically valid for any triangle the reader drags into
	     being, not just the scripted one. -->
	{#if scene.proofT > 0 || dragEnabled}
		<g>
			<path d={scene.apexWedgeOwn} class="wedge wedge-c" />
			<text x={scene.labelApex[0]} y={scene.labelApex[1]} class="label label-sum" text-anchor="middle">
				{dragEnabled && liveSum != null ? liveSum : 180}°
			</text>
		</g>
	{/if}

	<!-- transversal 1 — exactly one line, always: B1..T1_FIXED before any
	     sliding, translating in place during the triangle beat, then
	     drag-driven. Never a second, separately-drawn copy. -->
	{#if scene.transversalT > 0}
		<line x1={scene.currentB1[0]} y1={scene.currentB1[1]} x2={scene.currentApex1[0]} y2={scene.currentApex1[1]} class="line line-transversal" style="opacity:{scene.transversalT}" />
	{/if}
	<!-- transversal 2 — same, appearing later (with the sequential
	     old-fades-out-then-new-fades-in timing, see newFadeT above) -->
	{#if scene.newFadeT > 0}
		<line x1={scene.currentB2[0]} y1={scene.currentB2[1]} x2={scene.currentApex2[0]} y2={scene.currentApex2[1]} class="line line-transversal" style="opacity:{scene.newFadeT}" />
	{/if}

	<!-- the triangle's own bottom edge — a new explicit segment (not just
	     relying on the greyed-out background bottom line above) so the
	     finished triangle reads as three matching black sides, and so it
	     moves correctly when the base vertices are dragged. -->
	{#if scene.proofT > 0 || dragEnabled}
		<line x1={scene.currentB1[0]} y1={scene.currentB1[1]} x2={scene.currentB2[0]} y2={scene.currentB2[1]} class="line line-transversal" />
	{/if}

	{#if dragEnabled && dragB1 && dragB2 && dragApex}
		<circle cx={dragB1[0]} cy={dragB1[1]} r={HANDLE_RADIUS} class="handle" {...makeBaseDragHandlers((pt) => (dragB1 = pt), true, () => dragB2[0])} role="slider" aria-label="Base vertex (slides along the line)" tabindex="0" />
		<circle cx={dragB2[0]} cy={dragB2[1]} r={HANDLE_RADIUS} class="handle" {...makeBaseDragHandlers((pt) => (dragB2 = pt), false, () => dragB1[0])} role="slider" aria-label="Base vertex (slides along the line)" tabindex="0" />
		<circle cx={dragApex[0]} cy={dragApex[1]} r={HANDLE_RADIUS} class="handle" {...makeApexDragHandlers((pt) => (dragApex = pt))} role="slider" aria-label="Apex vertex" tabindex="0" />
	{/if}
</svg>

<div class="caption-overlay">
	{#each CAPTIONS as c, i}
		{#if captionOpacities[i] > 0.01}
			<p class="caption" style="opacity: {captionOpacities[i]}; top: {c.top ?? CAPTION_DEFAULT_TOP};">{c.text}</p>
		{/if}
	{/each}
</div>

{#if dragEnabled}
	<p class="drag-hint">Drag the corners.</p>
{/if}

<style>
	.scene {
		width: 100%;
		height: 100%;
		touch-action: none;
	}
	.caption-overlay {
		/* No top/bottom here -- each .caption sets its own `top` (see
		   CAPTIONS' per-entry `top` field / CAPTION_DEFAULT_TOP), since
		   different captions may want different vertical spots. Default
		   is near the top: this scene's own SVG content (equation,
		   verdict, wedge labels) is concentrated in the lower-middle of
		   the frame, so a bottom-anchored caption collided with it. */
		position: absolute;
		inset: 0;
		display: flex;
		justify-content: center;
		padding: 0 8%;
		pointer-events: none;
	}
	.caption {
		position: absolute;
		max-width: 30rem;
		margin: 0;
		padding: 0.85rem 1.25rem;
		border-radius: 10px;
		background: color-mix(in srgb, var(--surface-1) 82%, transparent);
		backdrop-filter: blur(6px);
		box-shadow: 0 6px 24px rgba(0, 0, 0, 0.12);
		font-size: 1.05rem;
		line-height: 1.5;
		text-align: center;
		color: var(--text-primary);
	}
	.drag-hint {
		position: absolute;
		top: 1.5rem;
		left: 1.5rem;
		margin: 0;
		font-size: 0.9rem;
		font-style: italic;
		color: var(--text-secondary);
	}
	.line {
		stroke: var(--text-primary);
		stroke-width: 2.5;
		stroke-linecap: round;
		transition: stroke 0.4s ease;
	}
	.line.faded {
		stroke: var(--text-muted);
	}
	.line-transversal {
		stroke: var(--text-primary);
	}
	.wedge {
		stroke: none;
		opacity: 0.88;
	}
	.wedge-a {
		fill: var(--accent);
	}
	.wedge-b {
		fill: var(--swatch-violet);
	}
	.wedge-c {
		fill: var(--swatch-yellow);
	}
	.label {
		font-size: 20px;
		font-weight: 700;
		text-anchor: middle;
		dominant-baseline: middle;
	}
	.label-a {
		fill: var(--accent);
	}
	.label-b {
		fill: var(--swatch-violet);
	}
	.label-c {
		fill: var(--swatch-yellow);
	}
	.label-sum {
		fill: var(--text-primary);
	}
	.equation {
		font-size: 24px;
	}
	.eq-a {
		fill: var(--swatch-yellow);
	}
	.eq-c {
		fill: var(--accent);
	}
	.eq-neutral {
		fill: var(--text-primary);
	}
	.verdict {
		font-size: 18px;
		font-weight: 600;
		fill: var(--text-secondary);
	}
	.verdict-arrow {
		font-size: 30px;
		font-weight: 700;
		fill: var(--text-primary);
	}
	.handle {
		/* Deliberately not one of the wedge colors (accent/violet/yellow) —
		   a handle needs to read as "control," not as another angle. */
		fill: #2ad6c3;
		stroke: var(--surface-1);
		stroke-width: 2;
		cursor: grab;
	}
	.handle:active {
		cursor: grabbing;
	}
</style>
