<script module>
	// Stage boundaries — exported so +page.svelte can derive which scrolling
	// prompt to highlight from the same numbers this scene animates against
	// (same reasoning as MeanCurvatureScene's own exported boundaries).
	export const LINES_END = 0.2;
	export const ROTATE_END = 0.45;
	export const ALTERNATE_END = 0.65;
	export const TRIANGLE_END = 0.85;
	// Beyond TRIANGLE_END: the 180 deg straight-line proof at the apex
	// settles in; at progress >= 1 the three vertices become drag handles.
</script>

<script>
	// Slide 2's scene: Euclid's parallel postulate, worked through as one
	// continuous scroll-scrubbed construction rather than asserted — two
	// lines and a transversal, the angle sum that decides whether they meet,
	// a second transversal showing alternate angles are equal, the two
	// transversals swinging together into a triangle, and the classic
	// straight-line proof that a triangle's angles sum to 180 deg. Once
	// scrolling completes the reader can drag the triangle's own vertices
	// and watch the angle sum stay 180 deg no matter the shape.
	//
	// Plain SVG, not three.js — everything here is flat-plane geometry
	// (lines, angles, a triangle), so a 2D scene is simpler to build and
	// read than routing it through a 3D renderer for no reason.
	//
	// Coordinate note: SVG y increases downward. `visualAngle` throughout
	// this file means "0 = horizontal, positive = tilts up on screen" (the
	// everyday reading of a slope), converted to y-down math internally by
	// negating the sine term wherever it's used — see angleToDir.
	let { progress = 0, dragEnabled = false } = $props();

	const VIEW_W = 600;
	const VIEW_H = 460;
	const BOTTOM_Y = 380;
	const CENTER_X = 300;
	const HALF_LEN = 250;
	const TOP_Y_INITIAL = 190;
	const TOP_ANGLE_START = 10; // deg, tilted up-right initially
	const TOP_ANGLE_FLIP = -12; // deg, overshoot past parallel to show the flip
	const TRANSVERSAL1_X = 380; // where it crosses the bottom line
	const TRANSVERSAL1_ANGLE = 70; // 90 - 20 (20 deg off perpendicular)
	const TRANSVERSAL2_X = 200;
	const TRANSVERSAL2_ANGLE = 55; // 90 - 35 (35 deg off perpendicular)
	const APEX = [300, 55];
	const ARC_RADIUS_A = 34;
	const ARC_RADIUS_B = 46;
	const HANDLE_RADIUS = 10;

	function remap(t, lo, hi) {
		return Math.max(0, Math.min(1, (t - lo) / (hi - lo)));
	}
	function lerp(a, b, t) {
		return a + (b - a) * t;
	}
	function lerpPt(a, b, t) {
		return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
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
	// Where a line through `p` at `angleDeg` reaches a given y (used to find
	// each transversal's natural far point, before it bends toward the apex).
	function pointAtY(p, angleDeg, y) {
		const dir = angleToDir(angleDeg);
		if (Math.abs(dir[1]) < 1e-6) return [p[0], y];
		const t = (y - p[1]) / dir[1];
		return [p[0] + dir[0] * t, y];
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
	// SVG arc path for the (always minor, <=180deg) angle at `vertex` swept
	// from the direction toward `a` to the direction toward `b`.
	function arcPath(vertex, a, b, radius) {
		const a1 = Math.atan2(-(a[1] - vertex[1]), a[0] - vertex[0]);
		const a2 = Math.atan2(-(b[1] - vertex[1]), b[0] - vertex[0]);
		const p1 = [vertex[0] + radius * Math.cos(a1), vertex[1] - radius * Math.sin(a1)];
		const p2 = [vertex[0] + radius * Math.cos(a2), vertex[1] - radius * Math.sin(a2)];
		let diff = a2 - a1;
		while (diff <= -Math.PI) diff += 2 * Math.PI;
		while (diff > Math.PI) diff -= 2 * Math.PI;
		const sweepFlag = diff > 0 ? 0 : 1;
		return `M ${p1[0].toFixed(1)} ${p1[1].toFixed(1)} A ${radius} ${radius} 0 0 ${sweepFlag} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
	}
	function midDir(vertex, a, b, radius) {
		const a1 = Math.atan2(-(a[1] - vertex[1]), a[0] - vertex[0]);
		const a2 = Math.atan2(-(b[1] - vertex[1]), b[0] - vertex[0]);
		let diff = a2 - a1;
		while (diff <= -Math.PI) diff += 2 * Math.PI;
		while (diff > Math.PI) diff -= 2 * Math.PI;
		const mid = a1 + diff / 2;
		return [vertex[0] + radius * Math.cos(mid), vertex[1] - radius * Math.sin(mid)];
	}

	// --- draggable triangle vertices (live once dragEnabled) ---
	// Seeded from the scripted construction's own end state (B1, B2, APEX)
	// the first time dragging unlocks — see the $effect below — so the
	// hand-off from "scripted proof" to "drag it yourself" is seamless,
	// not a jump to some other default triangle.
	let dragB1 = $state(null);
	let dragB2 = $state(null);
	let dragApex = $state(null);
	let seeded = false;

	let svgEl;
	function clientToLocal(clientX, clientY) {
		const rect = svgEl.getBoundingClientRect();
		return [((clientX - rect.left) / rect.width) * VIEW_W, ((clientY - rect.top) / rect.height) * VIEW_H];
	}
	function makeDragHandlers(setter) {
		return {
			onpointerdown: (e) => e.currentTarget.setPointerCapture(e.pointerId),
			onpointermove: (e) => {
				if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
				setter(clientToLocal(e.clientX, e.clientY));
			}
		};
	}

	// --- scripted construction, driven entirely by `progress` ---
	let scene = $derived.by(() => {
		const p = progress;

		const linesT = remap(p, 0, LINES_END);
		const rotateT = remap(p, LINES_END, ROTATE_END);
		const altT = remap(p, ROTATE_END, ALTERNATE_END);
		const triT = remap(p, ALTERNATE_END, TRIANGLE_END);
		const proofT = remap(p, TRIANGLE_END, 1);

		// Top line's angle: rotates past parallel to show the intersection
		// flip sides (first half of rotateT), then settles back to exactly
		// parallel (second half) — see TOP_ANGLE_FLIP.
		const topAngle =
			rotateT <= 0.6
				? lerp(TOP_ANGLE_START, TOP_ANGLE_FLIP, remap(rotateT, 0, 0.6))
				: lerp(TOP_ANGLE_FLIP, 0, remap(rotateT, 0.6, 1));
		const topCenter = [CENTER_X, TOP_Y_INITIAL];

		const bottomP1 = [CENTER_X - HALF_LEN, BOTTOM_Y];
		const bottomP2 = [CENTER_X + HALF_LEN, BOTTOM_Y];
		const topDir = angleToDir(topAngle);
		const topP1 = addScaled(topCenter, topDir, -HALF_LEN);
		const topP2 = addScaled(topCenter, topDir, HALF_LEN);

		const B1 = [TRANSVERSAL1_X, BOTTOM_Y];
		const B2 = [TRANSVERSAL2_X, BOTTOM_Y];
		const T1 = intersect(B1, TRANSVERSAL1_ANGLE, topCenter, topAngle) ?? [TRANSVERSAL1_X, TOP_Y_INITIAL];
		const T2 = intersect(B2, TRANSVERSAL2_ANGLE, topCenter, topAngle) ?? [TRANSVERSAL2_X, TOP_Y_INITIAL];

		// Transversal 1's lower ray (below the bottom line) and its upper
		// ray's *natural* continuation (before it bends toward the apex).
		const t1Below = pointAtY(B1, TRANSVERSAL1_ANGLE, BOTTOM_Y + 55);
		const t1Natural = pointAtY(T1, TRANSVERSAL1_ANGLE, APEX[1]);
		const t1Upper = lerpPt(t1Natural, APEX, triT);

		const t2Natural = pointAtY(T2, TRANSVERSAL2_ANGLE, APEX[1]);
		const t2Upper = lerpPt(t2Natural, APEX, triT);

		// Angle arcs at the four transversal/parallel-line crossings — shown
		// from ROTATE_END onward (once the lines have settled parallel).
		// Interior angles: at B1, between the transversal-up ray and the
		// bottom line's rightward ray (the side facing transversal 2 is
		// leftward of B1, so "interior" here is the left-facing side,
		// toward B2). At T1 (top line), the *alternate* angle sits on the
		// opposite side of the transversal from B1's interior angle.
		const angleB1 = arcPath(B1, bottomP1, T1, ARC_RADIUS_A);
		const angleT1 = arcPath(T1, topP2, B1, ARC_RADIUS_A);
		const angleB2 = arcPath(B2, bottomP2, T2, ARC_RADIUS_B);
		const angleT2 = arcPath(T2, topP1, B2, ARC_RADIUS_B);

		const sumDeg = Math.round(angleBetween(B1, bottomP1, T1) + angleBetween(T1, topP1, B1));

		// --- apex straight-line proof (TRIANGLE_END -> 1) ---
		const apexLeft = [APEX[0] - 70, APEX[1]];
		const apexRight = [APEX[0] + 70, APEX[1]];
		const apexAngleLeft = arcPath(APEX, apexLeft, B1, ARC_RADIUS_A * 0.7);
		const apexAngleOwn = arcPath(APEX, B1, B2, ARC_RADIUS_A * 0.7);
		const apexAngleRight = arcPath(APEX, B2, apexRight, ARC_RADIUS_A * 0.7);
		const apexLabelPos = midDir(APEX, B1, B2, ARC_RADIUS_A * 0.7 + 16);

		return {
			linesT,
			rotateT,
			altT,
			triT,
			proofT,
			bottomP1,
			bottomP2,
			topP1,
			topP2,
			B1,
			B2,
			T1,
			T2,
			t1Below,
			t1Upper,
			t2Upper,
			angleB1,
			angleT1,
			angleB2,
			angleT2,
			sumDeg,
			apexLeft,
			apexRight,
			apexAngleLeft,
			apexAngleOwn,
			apexAngleRight,
			apexLabelPos,
			topAngle
		};
	});

	// Seed the drag state from the scripted construction's own end points
	// the first time dragging unlocks, so there's no visual jump.
	$effect(() => {
		if (dragEnabled && !seeded) {
			seeded = true;
			dragB1 = scene.B1;
			dragB2 = scene.B2;
			dragApex = APEX;
		}
	});

	// Live triangle, once the reader is dragging vertices.
	let liveAngles = $derived.by(() => {
		if (!dragB1 || !dragB2 || !dragApex) return null;
		const aB1 = angleBetween(dragB1, dragB2, dragApex);
		const aB2 = angleBetween(dragB2, dragB1, dragApex);
		const aApex = angleBetween(dragApex, dragB1, dragB2);
		return {
			aB1,
			aB2,
			aApex,
			sum: Math.round(aB1 + aB2 + aApex),
			arcB1: arcPath(dragB1, dragB2, dragApex, ARC_RADIUS_A * 0.6),
			arcB2: arcPath(dragB2, dragApex, dragB1, ARC_RADIUS_A * 0.6),
			arcApex: arcPath(dragApex, dragB1, dragB2, ARC_RADIUS_A * 0.6),
			labelPos: midDir(dragApex, dragB1, dragB2, ARC_RADIUS_A * 0.6 + 16)
		};
	});
</script>

<svg
	bind:this={svgEl}
	class="scene"
	viewBox="0 0 {VIEW_W} {VIEW_H}"
	role="img"
	aria-label="Parallel postulate construction"
>
	{#if !dragEnabled}
		<!-- base lines -->
		<g style="opacity:{scene.linesT}">
			<line x1={scene.bottomP1[0]} y1={scene.bottomP1[1]} x2={scene.bottomP2[0]} y2={scene.bottomP2[1]} class="line" />
			<line x1={scene.topP1[0]} y1={scene.topP1[1]} x2={scene.topP2[0]} y2={scene.topP2[1]} class="line" />
		</g>

		<!-- transversal 1 -->
		<g style="opacity:{scene.linesT}">
			<line x1={scene.t1Below[0]} y1={scene.t1Below[1]} x2={scene.T1[0]} y2={scene.T1[1]} class="line line-transversal" />
			<line x1={scene.T1[0]} y1={scene.T1[1]} x2={scene.t1Upper[0]} y2={scene.t1Upper[1]} class="line line-transversal" />
		</g>

		<!-- angle-sum arcs at transversal 1 (rotate + settle beat) -->
		{#if scene.rotateT > 0}
			<g style="opacity:{Math.min(1, scene.rotateT * 2)}">
				<path d={scene.angleB1} class="arc arc-a" />
				<path d={scene.angleT1} class="arc arc-a" />
			</g>
		{/if}

		<!-- transversal 2 + alternate-angle arcs -->
		{#if scene.altT > 0}
			<g style="opacity:{scene.altT}">
				<line x1={TRANSVERSAL2_X} y1={BOTTOM_Y + 55} x2={scene.T2[0]} y2={scene.T2[1]} class="line line-transversal" />
				<line x1={scene.T2[0]} y1={scene.T2[1]} x2={scene.t2Upper[0]} y2={scene.t2Upper[1]} class="line line-transversal" />
				<path d={scene.angleB2} class="arc arc-b" />
				<path d={scene.angleT2} class="arc arc-b" />
			</g>
		{/if}

		<!-- apex straight-line proof -->
		{#if scene.proofT > 0}
			<g style="opacity:{scene.proofT}">
				<line x1={scene.apexLeft[0]} y1={scene.apexLeft[1]} x2={scene.apexRight[0]} y2={scene.apexRight[1]} class="line line-dashed" />
				<path d={scene.apexAngleLeft} class="arc arc-a" />
				<path d={scene.apexAngleOwn} class="arc arc-c" />
				<path d={scene.apexAngleRight} class="arc arc-b" />
				<text x={scene.apexLabelPos[0]} y={scene.apexLabelPos[1]} class="label label-sum">180°</text>
			</g>
		{/if}
	{:else if liveAngles}
		<!-- drag sandbox: the reader's own triangle -->
		<line x1={dragB1[0]} y1={dragB1[1]} x2={dragB2[0]} y2={dragB2[1]} class="line" />
		<line x1={dragB2[0]} y1={dragB2[1]} x2={dragApex[0]} y2={dragApex[1]} class="line" />
		<line x1={dragApex[0]} y1={dragApex[1]} x2={dragB1[0]} y2={dragB1[1]} class="line" />
		<path d={liveAngles.arcB1} class="arc arc-a" />
		<path d={liveAngles.arcB2} class="arc arc-b" />
		<path d={liveAngles.arcApex} class="arc arc-c" />
		<text x={liveAngles.labelPos[0]} y={liveAngles.labelPos[1]} class="label label-sum">{liveAngles.sum}°</text>

		<circle cx={dragB1[0]} cy={dragB1[1]} r={HANDLE_RADIUS} class="handle" {...makeDragHandlers((pt) => (dragB1 = pt))} role="slider" aria-label="Triangle vertex" tabindex="0" />
		<circle cx={dragB2[0]} cy={dragB2[1]} r={HANDLE_RADIUS} class="handle" {...makeDragHandlers((pt) => (dragB2 = pt))} role="slider" aria-label="Triangle vertex" tabindex="0" />
		<circle cx={dragApex[0]} cy={dragApex[1]} r={HANDLE_RADIUS} class="handle" {...makeDragHandlers((pt) => (dragApex = pt))} role="slider" aria-label="Triangle vertex" tabindex="0" />
	{/if}
</svg>

<style>
	.scene {
		width: 100%;
		height: 100%;
		touch-action: none;
	}
	.line {
		stroke: var(--text-primary);
		stroke-width: 2.5;
		stroke-linecap: round;
	}
	.line-transversal {
		stroke: var(--text-secondary);
	}
	.line-dashed {
		stroke: var(--text-muted);
		stroke-width: 2;
		stroke-dasharray: 6 6;
	}
	.arc {
		fill: none;
		stroke-width: 3;
	}
	.arc-a {
		stroke: var(--accent);
	}
	.arc-b {
		stroke: var(--swatch-aqua);
	}
	.arc-c {
		stroke: var(--swatch-violet);
	}
	.label {
		font-size: 22px;
		font-weight: 700;
		fill: var(--text-primary);
		text-anchor: middle;
		dominant-baseline: middle;
	}
	.handle {
		fill: var(--accent);
		stroke: var(--surface-1);
		stroke-width: 3;
		cursor: grab;
	}
	.handle:active {
		cursor: grabbing;
	}
</style>
