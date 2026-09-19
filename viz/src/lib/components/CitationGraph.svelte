<script>
	// The persistent background graph: a temporal beeswarm (x = publication
	// date, precomputed in viz/scripts/compute-layout.mjs) of small
	// paper-shaped rects, one per citer of Osserman's Survey. Layout is fixed
	// and precomputed — this component only ever changes color/opacity/filter
	// state and the camera (pan/zoom) in response to `viewSpec`, never
	// repositions nodes. That's the "object constancy" requirement from
	// scrollytelling-project-context.md: readers should recognize the same
	// marks reorganizing their meaning, not a graph that re-lays-out.
	//
	// No seed node: Osserman's Survey itself has no natural position on a
	// "when did this cite the Survey" axis (see compute-layout.mjs). Its old
	// "hub" role is replaced by the persistent caption below the canvas.
	//
	// Rendered to <canvas> rather than SVG — at ~1,032 simultaneously visible
	// nodes, canvas avoids the DOM overhead an SVG node-per-mark approach
	// would carry, especially on every viewSpec redraw/camera frame.
	import { onMount, untrack } from 'svelte';
	import { activePalette, roles } from '$lib/palette.js';
	import InfoTooltip from './InfoTooltip.svelte';

	/**
	 * @typedef {Object} ViewSpec
	 * @property {'none'|'mathVsOther'|'pathway'|'workType'|'filter'} colorBy
	 * @property {string[]} highlightIds - curated node ids to spotlight; also
	 *   drives the camera (focus on these, or fit-all when empty)
	 * @property {boolean} dimBackground - mute all non-highlighted nodes heavily
	 */

	let {
		nodes = [],
		curated = [],
		viewSpec = {},
		timeDomain = [1970, 2025],
		theme = 'auto',
		sizeMetric = 'citations',
		onSelectNode,
		// 0..1 — how much of the graph has "arrived" yet. Nodes pop in roughly
		// left-to-right (oldest first), jittered per-node (see revealKeyById)
		// so it reads as papers individually arriving rather than a wall
		// sliding across the graph, while still drifting toward "citations
		// accumulating over the decades since 1969" overall. 1 (the default)
		// draws every node, i.e. every other stanza's/step's normal behavior is
		// unaffected; the intro step is the only one that ever passes less. See
		// beyond-mathematics/+page.svelte's graphRevealProgress.
		revealProgress = 1
	} = $props();

	// Each node carries a precomputed width/height/y *per size metric* (see
	// compute-layout.mjs — a metric with a different distribution than raw
	// citation count needs its own collision-resolved y-dodge, not just a
	// different displayed size). x is shared across all metrics.
	function geom(n) {
		return n.sizes[sizeMetric] ?? n.sizes.citations;
	}

	let container;
	let canvas;
	let ctx;
	let width = $state(0);
	let height = $state(0);
	let dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

	let hovered = $state(null);
	let pointer = $state({ x: 0, y: 0 });

	const curatedById = new Map(curated.map((c) => [c.id, c]));
	const nodeById = new Map(nodes.map((n) => [n.id, n]));

	// x-extent of the actual laid-out nodes (center points), used to map tick
	// years onto the same coordinate space compute-layout.mjs used — avoids
	// hardcoding that script's HALF_WIDTH constant here too.
	const xExtent = nodes.length
		? [Math.min(...nodes.map((n) => n.x)), Math.max(...nodes.map((n) => n.x))]
		: [-1, 1];

	function yearToVirtualX(year) {
		const [minYear, maxYear] = timeDomain;
		const t = (year - minYear) / (maxYear - minYear || 1);
		return xExtent[0] + t * (xExtent[1] - xExtent[0]);
	}

	// Cheap, stable string hash (FNV-1a) -> [0, 1). Used to jitter each node's
	// reveal moment -- Math.random() would re-shuffle the order on every
	// re-render, which for a value read every scroll-driven redraw would make
	// nodes flicker in and out rather than reveal once and stay.
	function hashUnit(str) {
		let h = 2166136261;
		for (let i = 0; i < str.length; i++) {
			h ^= str.charCodeAt(i);
			h = Math.imul(h, 16777619);
		}
		return (h >>> 0) / 4294967296;
	}

	// How scattered the reveal order is around each node's chronological slot,
	// as a fraction of the full timeline. A pure x-sweep (jitter 0) reads as a
	// wall sliding across the graph rather than papers individually arriving --
	// this randomizes each paper's pop-in moment while keeping the *overall*
	// drift left-to-right, so it still reads as "citations accumulating over
	// the decades" rather than a shuffled free-for-all. Clamped into [0, 1]
	// per node below, so the very earliest/latest papers still roughly bookend
	// the sweep rather than a jitter pushing them out of range.
	const REVEAL_JITTER = 0.35;
	const revealKeyById = new Map(
		nodes.map((n) => {
			const t = (n.x - xExtent[0]) / (xExtent[1] - xExtent[0] || 1);
			const jitter = (hashUnit(n.id) - 0.5) * REVEAL_JITTER;
			return [n.id, Math.max(0, Math.min(1, t + jitter))];
		})
	);
	// Soft edge width, in the same normalized [0, 1] units as revealKeyById --
	// short, so a paper snaps in close to its jittered moment ("pops") rather
	// than gradually fading, but not zero, which would strobe on every
	// scroll-driven redraw.
	const REVEAL_FEATHER = 0.015;

	// 0 (invisible) .. 1 (fully in) for one node at the current revealProgress.
	// revealProgress === 1 short-circuits to "everything visible" without
	// touching revealKeyById at all, so every non-intro step (and every other
	// page that might one day use this component) behaves exactly as before.
	function revealAlphaFor(n) {
		if (revealProgress >= 1) return 1;
		const key = revealKeyById.get(n.id) ?? 0;
		if (key <= revealProgress) return 1;
		if (key >= revealProgress + REVEAL_FEATHER) return 0;
		return 1 - (key - revealProgress) / REVEAL_FEATHER;
	}

	// --------------------------------------------------------------- camera

	// Plain variable, not $state — it's only ever read by imperative JS
	// (draw/toScreen/findNodeAt/animateTo), never a template binding. Making
	// it reactive caused a feedback loop: animateTo()'s rAF callback writes
	// it every frame, which would re-trigger the $effect below (since
	// animateTo also reads it synchronously to capture the tween's start
	// value), restarting the animation from a barely-advanced position on
	// every frame instead of running one continuous 800ms tween.
	let transform = { scale: 1, tx: 0, ty: 0 };
	let animFrame = null;

	function boundsFor(list) {
		if (!list.length) return null;
		let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
		for (const n of list) {
			const g = geom(n);
			minX = Math.min(minX, n.x - g.width / 2);
			maxX = Math.max(maxX, n.x + g.width / 2);
			minY = Math.min(minY, g.y - g.height / 2);
			maxY = Math.max(maxY, g.y + g.height / 2);
		}
		return { minX, maxX, minY, maxY };
	}

	function transformForBounds(b, pad, minSpan) {
		if (!b || !width || !height) return null;
		const spanX = Math.max(b.maxX - b.minX, minSpan);
		const spanY = Math.max(b.maxY - b.minY, minSpan);
		const cx = (b.minX + b.maxX) / 2;
		const cy = (b.minY + b.maxY) / 2;
		const scale = Math.min((width - pad * 2) / spanX, (height - pad * 2) / spanY);
		return { scale, tx: width / 2 - cx * scale, ty: height / 2 - cy * scale };
	}

	function fitAllTransform() {
		return transformForBounds(boundsFor(nodes), 60, 0);
	}

	// Minimum window (in virtual units) so a 1-2-paper spotlight still shows
	// surrounding timeline context instead of isolating one mark in empty space.
	const MIN_FOCUS_SPAN = 260;

	function focusTransform(ids) {
		const targets = ids.map((id) => nodeById.get(id)).filter(Boolean);
		if (!targets.length) return fitAllTransform();
		return transformForBounds(boundsFor(targets), 90, MIN_FOCUS_SPAN);
	}

	function currentTarget() {
		const ids = viewSpec.highlightIds || [];
		return ids.length ? focusTransform(ids) : fitAllTransform();
	}

	function easeInOutCubic(t) {
		return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
	}

	function animateTo(target) {
		if (!target) return;
		if (animFrame) cancelAnimationFrame(animFrame);
		const from = { ...transform };
		const start = performance.now();
		const DURATION = 800;
		function step(now) {
			const t = Math.min(1, (now - start) / DURATION);
			const e = easeInOutCubic(t);
			transform = {
				scale: from.scale + (target.scale - from.scale) * e,
				tx: from.tx + (target.tx - from.tx) * e,
				ty: from.ty + (target.ty - from.ty) * e
			};
			draw();
			if (t < 1) animFrame = requestAnimationFrame(step);
		}
		animFrame = requestAnimationFrame(step);
	}

	function applyTarget(animate) {
		const target = currentTarget();
		if (!target) return;
		if (animate) animateTo(target);
		else {
			transform = target;
			draw();
		}
	}

	function toScreen(n) {
		const g = geom(n);
		return { x: n.x * transform.scale + transform.tx, y: g.y * transform.scale + transform.ty };
	}

	// ------------------------------------------------------------- lookups

	function findNodeAt(mx, my) {
		for (let i = nodes.length - 1; i >= 0; i--) {
			const n = nodes[i];
			if (isDimmed(n)) continue; // faded-out papers aren't interactive while a spotlight is active
			if (revealAlphaFor(n) <= 0) continue; // not yet revealed, during the intro's populate sweep
			const g = geom(n);
			const p = toScreen(n);
			const halfW = (g.width * transform.scale) / 2 + 3;
			const halfH = (g.height * transform.scale) / 2 + 3;
			if (mx >= p.x - halfW && mx <= p.x + halfW && my >= p.y - halfH && my <= p.y + halfH) return n;
		}
		return null;
	}

	function colorFor(n, pal, highlightSet) {
		const spec = viewSpec;
		// 'math' / 'nonMath': single-hue highlight against a grey field, not a
		// two-hue split — the side *not* being talked about stays grey (and
		// dimmed, see isDimmed) rather than competing for attention with its
		// own color.
		if (spec.colorBy === 'math') {
			return n.field === 'Mathematics' ? pal[roles.math] : pal.muted;
		}
		if (spec.colorBy === 'nonMath') {
			return n.field !== 'Mathematics' ? pal[roles.nonMath] : pal.muted;
		}
		if (spec.colorBy === 'pathway') {
			const c = curatedById.get(n.id);
			if (c && c.pathway) return pal[roles.pathway[c.pathway]] ?? pal.muted;
			return pal.muted;
		}
		if (spec.colorBy === 'workType') {
			return pal[roles.workType[n.workType]] ?? pal.muted;
		}
		// Filter results: a solid fill on matches (not an outline — with
		// hundreds of simultaneous matches, a ring per mark reads as visual
		// noise, not emphasis) against the same muted/dimmed non-matches every
		// other spotlight mode uses.
		if (spec.colorBy === 'filter') {
			return highlightSet?.has(n.id) ? pal[roles.math] : pal.muted;
		}
		return pal.muted;
	}

	function isDimmed(n) {
		const spec = viewSpec;
		if (spec.colorBy === 'math') return n.field !== 'Mathematics';
		if (spec.colorBy === 'nonMath') return n.field === 'Mathematics';
		// Curated nodes not in *this step's* highlightIds stay dimmed even in
		// pathway mode — otherwise every pathway's papers stay lit on every
		// pathway step, instead of just the one the reader is currently on.
		if (spec.colorBy === 'pathway') return !(spec.highlightIds || []).includes(n.id);
		if (spec.dimBackground) return !(spec.highlightIds || []).includes(n.id);
		return false;
	}

	// ---------------------------------------------------------------- draw

	function drawAxis(pal) {
		const [minYear, maxYear] = timeDomain;
		const first = Math.ceil(minYear / 10) * 10;
		// Raised from height-26 and given a bolder, larger label so the
		// timeline reads as a real axis rather than a faint footnote under
		// the graph -- the line stays subdued (it's just a baseline), but the
		// year labels use textPrimary + a heavier weight for legibility.
		const y = height - 38;
		ctx.strokeStyle = pal.muted;
		ctx.globalAlpha = 0.5;
		ctx.lineWidth = 1.25;
		ctx.beginPath();
		ctx.moveTo(0, y);
		ctx.lineTo(width, y);
		ctx.stroke();
		ctx.fillStyle = pal.textPrimary;
		ctx.font = '600 13px system-ui, sans-serif';
		ctx.textAlign = 'center';
		for (let year = first; year <= maxYear; year += 10) {
			const sx = yearToVirtualX(year) * transform.scale + transform.tx;
			if (sx < -20 || sx > width + 20) continue;
			ctx.globalAlpha = 0.6;
			ctx.beginPath();
			ctx.moveTo(sx, y - 5);
			ctx.lineTo(sx, y + 6);
			ctx.stroke();
			ctx.globalAlpha = 0.85;
			ctx.fillText(String(year), sx, y + 22);
		}
		ctx.globalAlpha = 1;
	}

	function draw() {
		if (!ctx || !width || !height) return;
		const pal = activePalette(theme === 'auto' ? undefined : theme);
		ctx.save();
		ctx.scale(dpr, dpr);
		ctx.clearRect(0, 0, width, height);

		const highlightSet = new Set(viewSpec.highlightIds || []);

		for (const n of nodes) {
			const revealAlpha = revealAlphaFor(n);
			if (revealAlpha <= 0) continue;

			const g = geom(n);
			const p = toScreen(n);
			const w = g.width * transform.scale;
			const h = g.height * transform.scale;
			if (w < 0.3 && h < 0.3) continue;

			const dimmed = isDimmed(n);
			const isHighlighted = highlightSet.has(n.id);
			const color = colorFor(n, pal, highlightSet);
			const rw = isHighlighted ? w + 3 : w;
			const rh = isHighlighted ? h + 3 : h;
			const radius = Math.min(3, rw / 4, rh / 4);

			ctx.globalAlpha = (dimmed ? 0.15 : 0.9) * revealAlpha;

			ctx.beginPath();
			ctx.roundRect(p.x - rw / 2, p.y - rh / 2, rw, rh, radius);
			ctx.fillStyle = color;
			ctx.fill();
			// Surface-color separator ring (not a data-colored border) so
			// touching/overlapping marks stay legible — the dataviz skill's
			// "surface ring" mechanism, not an outline-as-emphasis.
			ctx.lineWidth = 1;
			ctx.strokeStyle = pal.surface;
			ctx.stroke();

			// Filter mode marks matches with a solid fill (above) instead of
			// this outline ring — with hundreds of simultaneous matches, a ring
			// around each one reads as noise, not emphasis.
			if (isHighlighted && viewSpec.colorBy !== 'filter') {
				ctx.globalAlpha = revealAlpha;
				ctx.lineWidth = 2;
				ctx.strokeStyle = pal.textPrimary;
				ctx.beginPath();
				ctx.roundRect(p.x - rw / 2 - 2, p.y - rh / 2 - 2, rw + 4, rh + 4, radius + 2);
				ctx.stroke();
			}
		}
		ctx.globalAlpha = 1;
		drawAxis(pal);
		ctx.restore();
	}

	// ----------------------------------------------------------- pointer

	function handleMove(evt) {
		const rect = canvas.getBoundingClientRect();
		const mx = evt.clientX - rect.left;
		const my = evt.clientY - rect.top;
		pointer = { x: mx, y: my };
		hovered = findNodeAt(mx, my);
	}

	function handleLeave() {
		hovered = null;
	}

	function handleClick(evt) {
		const rect = canvas.getBoundingClientRect();
		const mx = evt.clientX - rect.left;
		const my = evt.clientY - rect.top;
		onSelectNode?.(findNodeAt(mx, my));
	}

	onMount(() => {
		ctx = canvas.getContext('2d');
		const ro = new ResizeObserver((entries) => {
			const entry = entries[0];
			width = entry.contentRect.width;
			height = entry.contentRect.height;
			dpr = window.devicePixelRatio || 1;
			canvas.width = width * dpr;
			canvas.height = height * dpr;
			applyTarget(false); // resize snaps; narrative-driven changes animate
		});
		ro.observe(container);
		return () => ro.disconnect();
	});

	// Each effect below must depend on *exactly* its own trigger. applyTarget
	// (via currentTarget -> boundsFor -> geom) reads viewSpec, sizeMetric, and
	// nodes internally — without untrack(), calling it from any one of these
	// effects would make that effect *also* fire on the others' triggers.
	// That was a real bug: the sizeMetric effect's snap (applyTarget(false))
	// was implicitly re-running on every viewSpec change too (because it
	// reads viewSpec via currentTarget), snapping the transform to the target
	// *before* the viewSpec effect's animateTo ran — so the tween animated
	// from the target to itself, i.e. looked like an instant snap instead of
	// an 800ms zoom.
	$effect(() => {
		// Theme changes just recolor in place — no camera movement.
		theme;
		untrack(() => draw());
	});

	$effect(() => {
		// The intro's populate sweep redraws on every scroll tick, same as
		// theme -- no camera movement, just which nodes are visible.
		revealProgress;
		untrack(() => draw());
	});

	$effect(() => {
		// Switching size metric is a comparison toggle, not a narrative beat —
		// snap directly to the new metric's layout rather than tweening 1,032
		// marks' positions at once.
		sizeMetric;
		untrack(() => applyTarget(false));
	});

	$effect(() => {
		// Re-derive the camera target whenever the view spec (from scroll
		// position) changes, and animate to it — clearing a spotlight zooms
		// out to fit-all, setting one zooms in, both via the same tween.
		viewSpec;
		untrack(() => applyTarget(true));
	});
</script>

<div class="graph-container" bind:this={container}>
	<canvas
		bind:this={canvas}
		onmousemove={handleMove}
		onmouseleave={handleLeave}
		onclick={handleClick}
		style="width: 100%; height: 100%;"
	></canvas>

	<!-- Held out until the reveal sweep finishes -- it names what every tile
	     IS, so it shouldn't appear over a graph that's still visibly filling
	     in, only once "these rectangles" actually mean the full set. Every
	     other step has revealProgress === 1 already, so this is always
	     visible immediately outside the intro's populate sweep. -->
	<div class="graph-caption" class:visible={revealProgress >= 1}>
		Scholarly works that have cited <em>A Survey of Minimal Surfaces</em>.
		<span class="caption-row">
			Each tile sized by citation data.
			<span class="caption-tooltip-wrap">
				<InfoTooltip
					label="How tile size is calculated"
					placement="bottom"
					message="Sized by each paper's OpenAlex citation percentile (normalized for its field, publication year, and work type). For papers OpenAlex doesn't compute that for — mostly preprints, dissertations, and conference papers — size instead reflects the paper's raw-citation-count rank within this dataset."
				/>
			</span>
		</span>
		<span class="graph-source">Source: OpenAlex</span>
	</div>

	{#if hovered}
		<div
			class="tooltip"
			style="top: {pointer.y + 16}px; {container && pointer.x + 276 > container.clientWidth
				? `right: ${container.clientWidth - pointer.x + 16}px;`
				: `left: ${pointer.x + 16}px;`}"
		>
			<div class="tooltip-title">{hovered.title}</div>
			<div class="tooltip-meta">
				{hovered.authors ? hovered.authors + ' · ' : ''}{hovered.year} · {hovered.field}
			</div>
		</div>
	{/if}
</div>

<style>
	.graph-container {
		position: relative;
		width: 100%;
		height: 100%;
	}
	canvas {
		display: block;
		cursor: pointer;
	}
	.graph-caption {
		position: absolute;
		top: 1.25rem;
		left: 1.25rem;
		max-width: 22rem;
		font-size: 0.85rem;
		color: var(--text-secondary);
		pointer-events: none;
		line-height: 1.45;
		opacity: 0;
		transition: opacity 0.6s ease;
	}
	.graph-caption.visible {
		opacity: 1;
	}
	.caption-row {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
	}
	/* Only clickable once the caption itself is actually visible -- opacity:0
	   alone doesn't stop clicks/hover, and this icon opts back into pointer
	   events against the caption's own pointer-events:none. */
	.graph-caption.visible .caption-tooltip-wrap {
		pointer-events: auto;
	}
	.graph-source {
		display: block;
		margin-top: 0.3rem;
		font-size: 0.72rem;
		color: var(--text-muted);
	}
	.tooltip {
		position: absolute;
		pointer-events: none;
		max-width: 260px;
		background: var(--surface-1, #fcfcfb);
		color: var(--text-primary, #0b0b0b);
		border: 1px solid rgba(11, 11, 11, 0.1);
		border-radius: 6px;
		padding: 0.5rem 0.65rem;
		font-size: 0.8rem;
		line-height: 1.35;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
		z-index: 10;
	}
	.tooltip-title {
		font-weight: 600;
		margin-bottom: 0.15rem;
	}
	.tooltip-meta {
		color: var(--text-secondary, #52514e);
	}
</style>
