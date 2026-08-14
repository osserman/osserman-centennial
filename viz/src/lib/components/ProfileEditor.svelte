<script>
	// 2D side-view profile editor: draws the r(z) curve that gets revolved
	// into the 3D surface, with draggable handles to shape it. Lives
	// separately from the 3D scene's own canvas on purpose — that canvas
	// already uses drag-to-orbit (OrbitControls), so reusing drag gestures
	// there for control points would be ambiguous (rotate the camera, or
	// move a point?). Plain 2D pointer math here instead of 3D raycasting.
	import { vProfile, curveProfile } from '$lib/catenoidProfile.js';

	let {
		R,
		L,
		midR = $bindable(R),
		spread = $bindable(0),
		mode = 'v', // 'v' (stage 2, sharp corner) | 'curve' (stage 3, smooth)
		showSpreadHandle = false
	} = $props();

	const WIDTH = 320;
	const HEIGHT = 150;
	const PAD_X = 24;
	const PAD_Y = 18;
	// The spread handle is rendered this many px above the curve rather than
	// exactly on it. At spread=0 it would otherwise sit at the exact same
	// point as the mid handle (both at x=0, y=toY(midR)) — and since the mid
	// handle is later in the DOM, painted on top, it silently ate every
	// pointer event meant for the one underneath. A fixed vertical offset
	// keeps the two handles visually and functionally separate at every
	// spread value, including 0, without needing spread's own drag math
	// (horizontal-only) to change at all.
	const SPREAD_HANDLE_Y_OFFSET = -16;

	function toX(z) {
		return PAD_X + ((z + L) / (2 * L)) * (WIDTH - 2 * PAD_X);
	}
	function toY(r) {
		return HEIGHT - PAD_Y - (r / R) * (HEIGHT - 2 * PAD_Y);
	}
	function fromY(y) {
		return ((HEIGHT - PAD_Y - y) / (HEIGHT - 2 * PAD_Y)) * R;
	}
	function fromX(x) {
		return ((x - PAD_X) / (WIDTH - 2 * PAD_X)) * (2 * L) - L;
	}

	let profilePoints = $derived(mode === 'curve' ? curveProfile(R, L, midR, spread) : vProfile(R, L, midR));
	let pathD = $derived(
		'M ' + profilePoints.map((p) => `${toX(p.z).toFixed(1)},${toY(p.r).toFixed(1)}`).join(' L ')
	);

	let svgEl;

	function clientToLocal(clientX, clientY) {
		const rect = svgEl.getBoundingClientRect();
		return {
			x: ((clientX - rect.left) / rect.width) * WIDTH,
			y: ((clientY - rect.top) / rect.height) * HEIGHT
		};
	}

	// Pointer capture routes every subsequent pointermove/up to the handle
	// that was actually grabbed, regardless of where the cursor physically
	// ends up — simpler and more robust than tracking a "which handle is
	// being dragged" boolean plus window-level listeners.
	function onMidPointerDown(e) {
		e.currentTarget.setPointerCapture(e.pointerId);
	}
	function onMidPointerMove(e) {
		if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
		const { y } = clientToLocal(e.clientX, e.clientY);
		midR = Math.max(0, Math.min(R, fromY(y)));
	}

	function onSpreadPointerDown(e) {
		e.currentTarget.setPointerCapture(e.pointerId);
	}
	function onSpreadPointerMove(e) {
		if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
		const { x } = clientToLocal(e.clientX, e.clientY);
		spread = Math.max(0, Math.min(L * 0.9, Math.abs(fromX(x))));
	}
</script>

<svg
	bind:this={svgEl}
	class="profile-editor"
	viewBox="0 0 {WIDTH} {HEIGHT}"
	role="img"
	aria-label="Profile curve editor"
>
	<!-- ring boundaries, as vertical reference ticks -->
	<line x1={toX(-L)} x2={toX(-L)} y1={toY(0)} y2={toY(R)} class="ring-guide" />
	<line x1={toX(L)} x2={toX(L)} y1={toY(0)} y2={toY(R)} class="ring-guide" />
	<line x1={PAD_X} x2={WIDTH - PAD_X} y1={toY(0)} y2={toY(0)} class="axis" />

	<path d={pathD} class="profile-line" />

	{#if showSpreadHandle}
		<circle
			cx={toX(spread)}
			cy={toY(midR) + SPREAD_HANDLE_Y_OFFSET}
			r="7"
			class="handle handle-spread"
			onpointerdown={onSpreadPointerDown}
			onpointermove={onSpreadPointerMove}
			role="slider"
			aria-label="Spread control"
			aria-valuenow={spread}
			tabindex="0"
		/>
	{/if}
	<circle
		cx={toX(0)}
		cy={toY(midR)}
		r="7"
		class="handle handle-mid"
		onpointerdown={onMidPointerDown}
		onpointermove={onMidPointerMove}
		role="slider"
		aria-label="Midpoint radius control"
		aria-valuenow={midR}
		tabindex="0"
	/>
</svg>

<style>
	.profile-editor {
		width: 100%;
		height: auto;
		touch-action: none;
	}
	.ring-guide {
		stroke: var(--text-muted);
		stroke-width: 1;
		opacity: 0.4;
	}
	.axis {
		stroke: var(--text-muted);
		stroke-width: 1;
		opacity: 0.25;
	}
	.profile-line {
		fill: none;
		stroke: var(--accent);
		stroke-width: 2.5;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	.handle {
		fill: var(--accent);
		stroke: var(--surface-1);
		stroke-width: 2;
		cursor: grab;
	}
	.handle:active {
		cursor: grabbing;
	}
	.handle-spread {
		fill: var(--swatch-violet);
	}
</style>
