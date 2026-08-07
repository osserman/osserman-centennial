<script>
	// The persistent background graph. Layout (x/y) is precomputed and fixed
	// (viz/scripts/compute-layout.mjs) — this component only ever changes
	// color/opacity/filter state in response to `viewSpec`, never repositions
	// nodes. That's the "object constancy" requirement from
	// scrollytelling-project-context.md: readers should recognize the same
	// dots reorganizing their meaning, not a graph that re-lays-out.
	//
	// Rendered to <canvas> rather than SVG — at ~1,033 simultaneously visible
	// nodes, canvas avoids the DOM overhead an SVG node-per-circle approach
	// would carry, especially on every viewSpec redraw.
	import { onMount } from 'svelte';
	import { quadtree } from 'd3-quadtree';
	import { activePalette, roles, pathwayShape } from '$lib/palette.js';

	/**
	 * @typedef {Object} ViewSpec
	 * @property {'none'|'mathVsOther'|'pathway'} colorBy
	 * @property {string[]} highlightIds - curated node ids to draw larger + labeled
	 * @property {boolean} dimBackground - mute all non-highlighted nodes heavily
	 *
	 * Deliberately no per-field mass recoloring: OpenAlex's field labels are
	 * independently known to be noisy (see reports/pilot_methodology_notes.md),
	 * and several draft-text sections group curated papers that don't share a
	 * single OpenAlex field anyway (the narrative "Biology" section spans
	 * Biochemistry/Molecular Biology, Environmental Science and Materials
	 * Science; recoloring "the field" would be both technically wrong and
	 * overclaiming). Sections spotlight their 1-2 curated papers instead.
	 */

	let { nodes = [], edges = [], curated = [], viewSpec = {} } = $props();

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

	// Fit transform: compute once from the fixed layout's bounding box.
	let transform = $state({ scale: 1, tx: 0, ty: 0 });

	function computeTransform() {
		if (!nodes.length || !width || !height) return;
		const xs = nodes.map((n) => n.x);
		const ys = nodes.map((n) => n.y);
		const minX = Math.min(...xs), maxX = Math.max(...xs);
		const minY = Math.min(...ys), maxY = Math.max(...ys);
		const pad = 60;
		const scale = Math.min(
			(width - pad * 2) / (maxX - minX || 1),
			(height - pad * 2) / (maxY - minY || 1)
		);
		const tx = width / 2 - ((minX + maxX) / 2) * scale;
		const ty = height / 2 - ((minY + maxY) / 2) * scale;
		transform = { scale, tx, ty };
	}

	function toScreen(n) {
		return { x: n.x * transform.scale + transform.tx, y: n.y * transform.scale + transform.ty };
	}

	let qtree = $derived.by(() => {
		if (!nodes.length) return null;
		const t = transform;
		const q = quadtree(
			nodes,
			(n) => n.x * t.scale + t.tx,
			(n) => n.y * t.scale + t.ty
		);
		return q;
	});

	function colorFor(n, pal) {
		if (n.isSeed) return pal[roles.seed] ?? pal.textPrimary;
		const spec = viewSpec;
		if (spec.colorBy === 'mathVsOther') {
			return n.field === 'Mathematics' ? pal[roles.math] : pal[roles.nonMath];
		}
		if (spec.colorBy === 'pathway') {
			const c = curatedById.get(n.id);
			if (c && c.pathway) return pal[roles.pathway[c.pathway]] ?? pal.muted;
			return pal.muted;
		}
		return pal.muted;
	}

	function isDimmed(n) {
		const spec = viewSpec;
		if (n.isSeed) return false;
		// Curated nodes not in *this step's* highlightIds stay dimmed even in
		// pathway mode — otherwise every pathway's papers stay lit on every
		// pathway step, instead of just the one the reader is currently on.
		if (spec.colorBy === 'pathway') return !(spec.highlightIds || []).includes(n.id);
		if (spec.dimBackground) return !(spec.highlightIds || []).includes(n.id);
		return false;
	}

	function draw() {
		if (!ctx || !width || !height) return;
		const pal = activePalette();
		ctx.save();
		ctx.scale(dpr, dpr);
		ctx.clearRect(0, 0, width, height);

		// Edges: only for explicitly highlighted nodes (drawing all 1,032
		// star edges at once would be visual noise the design doc explicitly
		// wants to avoid — "restrained", not a hairball).
		const highlightSet = new Set(viewSpec.highlightIds || []);
		if (highlightSet.size) {
			const seed = nodes.find((n) => n.isSeed);
			if (seed) {
				const seedPt = toScreen(seed);
				ctx.strokeStyle = pal.textSecondary;
				ctx.globalAlpha = 0.5;
				ctx.lineWidth = 1;
				for (const id of highlightSet) {
					const n = nodeById.get(id);
					if (!n) continue;
					const p = toScreen(n);
					ctx.beginPath();
					ctx.moveTo(seedPt.x, seedPt.y);
					ctx.lineTo(p.x, p.y);
					ctx.stroke();
				}
			}
		}
		ctx.globalAlpha = 1;

		for (const n of nodes) {
			const p = toScreen(n);
			const dimmed = isDimmed(n);
			const isHighlighted = highlightSet.has(n.id);
			const color = colorFor(n, pal);
			const r = n.isSeed ? n.radius : isHighlighted ? n.radius + 2 : n.radius;

			ctx.globalAlpha = dimmed ? 0.15 : n.isSeed ? 1 : 0.85;
			ctx.fillStyle = color;

			const c = curatedById.get(n.id);
			const shape = c ? pathwayShape[c.pathway] : 'dot';
			ctx.beginPath();
			if (shape === 'ring' && viewSpec.colorBy === 'pathway') {
				ctx.arc(p.x, p.y, r, 0, 2 * Math.PI);
				ctx.lineWidth = 2.5;
				ctx.strokeStyle = color;
				ctx.stroke();
			} else {
				ctx.arc(p.x, p.y, r, 0, 2 * Math.PI);
				ctx.fill();
			}

			if (isHighlighted) {
				ctx.globalAlpha = 1;
				ctx.lineWidth = 1.5;
				ctx.strokeStyle = pal.textPrimary;
				ctx.beginPath();
				ctx.arc(p.x, p.y, r + 2, 0, 2 * Math.PI);
				ctx.stroke();
			}
		}
		ctx.globalAlpha = 1;
		ctx.restore();
	}

	function handleMove(evt) {
		const rect = canvas.getBoundingClientRect();
		const mx = evt.clientX - rect.left;
		const my = evt.clientY - rect.top;
		pointer = { x: evt.clientX - rect.left, y: evt.clientY - rect.top };
		if (!qtree) return;
		const found = qtree.find(mx, my, 14);
		hovered = found || null;
	}

	function handleLeave() {
		hovered = null;
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
			computeTransform();
			draw();
		});
		ro.observe(container);
		return () => ro.disconnect();
	});

	$effect(() => {
		// Redraw whenever the view spec (from scroll position) changes.
		viewSpec;
		draw();
	});
</script>

<div class="graph-container" bind:this={container}>
	<canvas
		bind:this={canvas}
		onmousemove={handleMove}
		onmouseleave={handleLeave}
		style="width: 100%; height: 100%;"
	></canvas>
	{#if hovered}
		<div class="tooltip" style="left: {pointer.x + 16}px; top: {pointer.y + 16}px;">
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
