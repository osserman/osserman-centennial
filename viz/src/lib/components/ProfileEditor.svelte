<script>
	// 2D side-view profile editor: draws the r(z) curve that gets revolved
	// into the 3D surface, with draggable handles to shape it. Lives
	// separately from the 3D scene's own canvas on purpose — that canvas
	// already uses drag-to-orbit (OrbitControls), so reusing drag gestures
	// there for control points would be ambiguous (rotate the camera, or
	// move a point?). Plain 2D pointer math here instead of 3D raycasting.
	import { R, L, vProfile, curveProfile } from '$lib/catenoidProfile.js';

	let {
		midR = $bindable(R),
		spread = $bindable(0),
		mode = 'v', // 'v' (stage 2, sharp corner) | 'curve' (stage 3, smooth)
		showSpreadHandle = false
	} = $props();

	const WIDTH = 320;
	const HEIGHT = 150;
	const PAD_X = 24;
	const PAD_Y = 18;

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

	let profilePoints = $derived(mode === 'curve' ? curveProfile(midR, spread) : vProfile(midR));
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
			cy={toY(midR)}
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
