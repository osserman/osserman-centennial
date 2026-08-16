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
		showSpreadHandle = false,
		// Final stage: the user's own curve stays visible (greyed, not removed)
		// for direct comparison, handles disabled, and the true minimum drawn
		// on top of it via overlayProfile.
		frozen = false,
		overlayProfile = null // [{ r, z }, ...] | null
	} = $props();

	const WIDTH = 320;
	const PAD_X = 24;
	const PAD_Y = 18;
	// HEIGHT is derived, not fixed — the plot area's aspect ratio has to
	// match the actual data's (z spans 2L, r spans R), or the curve reads as
	// far more stretched/flattened than the 3D surface it's revolved into
	// really is. A fixed HEIGHT=150 against WIDTH=320 (a ~2.4:1 plot area)
	// was silently distorting it at R=1, L=0.5 (a true 1:1 aspect) — this
	// keeps the two in sync for whatever R/L are passed in.
	let plotWidth = $derived(WIDTH - 2 * PAD_X);
	let plotHeight = $derived(plotWidth * (R / (2 * L)));
	let HEIGHT = $derived(plotHeight + 2 * PAD_Y);
	// The spread handle is rendered this many px above the curve rather than
	// exactly on it. At spread=0 it would otherwise sit at the exact same
	// point as the mid handle (both at x=0, y=toY(midR)) — and since the mid
	// handle is later in the DOM, painted on top, it silently ate every
	// pointer event meant for the one underneath. A fixed vertical offset
	// keeps the two handles visually and functionally separate at every
	// spread value, including 0, without needing spread's own drag math
	// (horizontal-only) to change at all.
	const SPREAD_HANDLE_Y_OFFSET = -22;
	const HANDLE_RADIUS = 12;

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
	let overlayPathD = $derived(
		overlayProfile
			? 'M ' + overlayProfile.map((p) => `${toX(p.z).toFixed(1)},${toY(p.r).toFixed(1)}`).join(' L ')
			: ''
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
	<path d={pathD} class="profile-line" class:frozen />
	{#if overlayPathD}
		<path d={overlayPathD} class="overlay-line" />
	{/if}

	{#if !frozen}
		{#if showSpreadHandle}
			<circle
				cx={toX(spread)}
				cy={toY(midR) + SPREAD_HANDLE_Y_OFFSET}
				r={HANDLE_RADIUS}
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
			r={HANDLE_RADIUS}
			class="handle handle-mid"
			onpointerdown={onMidPointerDown}
			onpointermove={onMidPointerMove}
			role="slider"
			aria-label="Midpoint radius control"
			aria-valuenow={midR}
			tabindex="0"
		/>
	{/if}
</svg>

<style>
	/* Fixed, and deliberately small — this used to be width:100% (filling
	   the ~19rem text column, so ~300px+ once the aspect-ratio fix made
	   HEIGHT track WIDTH properly), which pushed everything below it
	   (scroll hint, and whatever's further down the sticky column) close to
	   or off the bottom of the viewport. Handles/strokes are defined in the
	   SVG's own viewBox units, so shrinking the rendered box scales them
	   down proportionally too — no separate adjustment needed. */
	.profile-editor {
		width: 11rem;
		height: auto;
		touch-action: none;
	}
	/* Stroke widths and handle radius (HANDLE_RADIUS above) are noticeably
	   larger than they'd need to be at the old width:100% (~300px+) render
	   size — this editor is a fixed, small width:11rem now (see below), and
	   these are SVG-user-unit values, so the same numbers that looked right
	   at ~300px rendered to nearly invisible hairlines and pinpricks once
	   the box shrank to ~176px. Sized for how they look at *this* box's
	   actual rendered size, not the viewBox's nominal 320-unit width. */
	.profile-line {
		fill: none;
		stroke: var(--accent);
		stroke-width: 4.5;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	.profile-line.frozen {
		stroke: var(--text-muted);
		opacity: 0.6;
	}
	.overlay-line {
		fill: none;
		stroke: var(--swatch-aqua);
		stroke-width: 4.5;
		stroke-linecap: round;
		stroke-linejoin: round;
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
	.handle-spread {
		fill: var(--swatch-violet);
	}
</style>
