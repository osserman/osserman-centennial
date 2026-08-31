<script>
	// Dev harness -- NOT part of the narrative, not linked from any nav.
	// Two things the scrollytelling page makes tedious to iterate on:
	//
	//   1. Scrubbing AzimuthalProjectionScene's progress without scrolling
	//      several thousand vh to reach it (and re-scrolling after every
	//      edit). The scene here is the real component, same props, so
	//      whatever gets tuned against this harness is what ships.
	//   2. Dialling in geoPolarPetal's own parameters (lobes/spread/bow/
	//      profile) against real coastlines, live, before any of it gets
	//      committed to a scroll-driven sequence.
	//
	// Deliberately kept out of the story's own visual language (plain
	// controls, visible numbers) -- it's an instrument, not a page.
	import { onMount } from 'svelte';
	import { geoPath, geoGraticule10 } from 'd3-geo';
	import { geoPolarPetal } from 'radial-petal-projection';
	import AzimuthalProjectionScene, {
		ROTATE_END,
		TISSOT_END,
		CIRCLES_END,
		DRAG_END,
		RETURN_END,
		MORPH_REVEAL_END,
		MORPH_END,
		TESSELLATE_END
	} from '$lib/components/AzimuthalProjectionScene.svelte';
	import { activePalette } from '$lib/palette.js';
	import { coastlines } from '$lib/coastlines.js';

	// ---------- section 1: scene scrubber ----------
	let sceneProgress = $state(0);
	let dragEnabled = $state(false);
	let playing = $state(false);

	// Named stage boundaries, so a beat can be jumped to directly instead of
	// hunted for by dragging. Values come from the scene's own exports --
	// never duplicated here, so they can't drift out of sync with it.
	const MARKS = [
		['start', 0],
		['ROTATE_END', ROTATE_END],
		['TISSOT_END', TISSOT_END],
		['CIRCLES_END', CIRCLES_END],
		['drag (1.0)', 1],
		['DRAG_END', DRAG_END],
		['RETURN_END', RETURN_END],
		['MORPH_REVEAL', MORPH_REVEAL_END],
		['MORPH_END', MORPH_END],
		['TESSELLATE', TESSELLATE_END]
	];

	// The page normally derives this from scroll position; mirrored here so
	// the drag interaction is reachable in the harness too.
	const autoDrag = $derived(sceneProgress >= 1 && sceneProgress < DRAG_END);

	function nudge(delta) {
		sceneProgress = Math.min(TESSELLATE_END, Math.max(0, +(sceneProgress + delta).toFixed(4)));
	}

	function onKey(e) {
		if (e.target.tagName === 'INPUT' && e.target.type === 'range') return;
		if (e.key === 'ArrowRight') nudge(e.shiftKey ? 0.001 : 0.01);
		else if (e.key === 'ArrowLeft') nudge(e.shiftKey ? -0.001 : -0.01);
		else if (e.key === ' ') {
			e.preventDefault();
			playing = !playing;
		}
	}

	onMount(() => {
		let raf,
			last = performance.now();
		const tick = (now) => {
			const dt = (now - last) / 1000;
			last = now;
			if (playing) {
				sceneProgress += dt * 0.18;
				if (sceneProgress >= TESSELLATE_END) {
					sceneProgress = TESSELLATE_END;
					playing = false;
				}
			}
			raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	});

	// ---------- section 2: petal playground ----------
	let lobes = $state(12);
	let spread = $state(1);
	let bow = $state(1);
	let profile = $state('gore');
	let showGraticule = $state(true);
	let showLand = $state(true);

	const PROFILES = ['gore', 'sine', 'vesica', 'leaf'];

	// Same winding normalization the scene does -- d3-geo's spherical
	// clipping needs each exterior ring wound small-side-in, and
	// coastlines.js isn't guaranteed to be.
	const land = {
		type: 'FeatureCollection',
		features: coastlines.map((ring) => ({
			type: 'Feature',
			geometry: { type: 'Polygon', coordinates: [ring.map(([lat, lon]) => [lon, lat])] }
		}))
	};
	const graticule = geoGraticule10();

	let petalCanvas;
	let petalCtx;
	let petalSize = $state(0);

	function drawPetal() {
		if (!petalCtx || !petalSize) return;
		const pal = activePalette();
		const s = petalSize;
		petalCtx.clearRect(0, 0, s, s);

		const proj = geoPolarPetal()
			.lobes(lobes)
			.bow(bow)
			.spread(spread)
			.profile(profile)
			.translate([s / 2, s / 2])
			.scale((s * 0.46) / Math.PI);
		const path = geoPath(proj, petalCtx);

		petalCtx.beginPath();
		path({ type: 'Sphere' });
		petalCtx.fillStyle = pal.mapWater;
		petalCtx.fill();

		if (showLand) {
			petalCtx.fillStyle = pal.mapLand;
			for (const f of land.features) {
				petalCtx.beginPath();
				path(f);
				petalCtx.fill();
			}
		}

		if (showGraticule) {
			petalCtx.beginPath();
			path(graticule);
			petalCtx.strokeStyle = pal.textPrimary;
			petalCtx.globalAlpha = 0.22;
			petalCtx.lineWidth = 0.6;
			petalCtx.stroke();
			petalCtx.globalAlpha = 1;
		}

		petalCtx.beginPath();
		path({ type: 'Sphere' });
		petalCtx.strokeStyle = pal.textPrimary;
		petalCtx.globalAlpha = 0.5;
		petalCtx.lineWidth = 1;
		petalCtx.stroke();
		petalCtx.globalAlpha = 1;
	}

	$effect(() => {
		// re-draw on any control change
		void lobes;
		void spread;
		void bow;
		void profile;
		void showGraticule;
		void showLand;
		void petalSize;
		drawPetal();
	});

	function initPetal(node) {
		petalCanvas = node;
		petalCtx = node.getContext('2d');
		const ro = new ResizeObserver(([entry]) => {
			const w = Math.min(entry.contentRect.width, 620);
			if (!w) return;
			const dpr = window.devicePixelRatio || 1;
			petalSize = w;
			node.width = w * dpr;
			node.height = w * dpr;
			node.style.width = `${w}px`;
			node.style.height = `${w}px`;
			petalCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
			drawPetal();
		});
		ro.observe(node.parentElement);
		return { destroy: () => ro.disconnect() };
	}
</script>

<svelte:window on:keydown={onKey} />

<svelte:head>
	<title>Projection lab (dev)</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="lab">
	<header>
		<h1>Projection lab</h1>
		<p>
			Dev harness for <code>AzimuthalProjectionScene</code> and <code>geoPolarPetal</code>. Not linked
			from the site.
		</p>
	</header>

	<section>
		<h2>1 · Scene scrubber</h2>
		<div class="controls">
			<button onclick={() => (playing = !playing)}>{playing ? '❚❚ pause' : '▶ play'}</button>
			<input type="range" min="0" max={TESSELLATE_END} step="0.001" bind:value={sceneProgress} />
			<output>{sceneProgress.toFixed(3)}</output>
			<label class="chk">
				<input type="checkbox" bind:checked={dragEnabled} /> force drag
			</label>
		</div>
		<div class="marks">
			{#each MARKS as [label, value]}
				<button class:active={Math.abs(sceneProgress - value) < 0.005} onclick={() => (sceneProgress = value)}>
					{label}
					<span>{value}</span>
				</button>
			{/each}
		</div>
		<p class="hint">← / → step 0.01 · shift for 0.001 · space plays</p>
		<div class="stage">
			<AzimuthalProjectionScene progress={sceneProgress} dragEnabled={dragEnabled || autoDrag} />
		</div>
	</section>

	<section>
		<h2>2 · Petal playground</h2>
		<p class="hint">
			Live <code>geoPolarPetal</code> parameters against real coastlines — for dialling in the gore
			stage before it's wired into a sequence.
		</p>
		<div class="petal-wrap">
			<div class="petal-controls">
				<label>
					lobes <output>{lobes}</output>
					<input type="range" min="2" max="36" step="1" bind:value={lobes} />
				</label>
				<label>
					spread <output>{spread.toFixed(2)}</output>
					<input type="range" min="0" max="1" step="0.01" bind:value={spread} />
				</label>
				<label>
					bow <output>{bow.toFixed(2)}</output>
					<input type="range" min="0.2" max="3" step="0.05" bind:value={bow} />
					<em>(ignored by gore/vesica)</em>
				</label>
				<label>
					profile
					<select bind:value={profile}>
						{#each PROFILES as p}<option value={p}>{p}</option>{/each}
					</select>
				</label>
				<label class="chk"><input type="checkbox" bind:checked={showLand} /> land</label>
				<label class="chk"><input type="checkbox" bind:checked={showGraticule} /> graticule</label>
				<p class="note">
					<strong>spread = 1, profile = gore</strong> is the true orange-peel gore (equal-area).
					Lowering spread opens a gap at every latitude.
				</p>
			</div>
			<div class="petal-canvas">
				<canvas use:initPetal></canvas>
			</div>
		</div>
	</section>
</div>

<style>
	.lab {
		max-width: 1180px;
		margin: 0 auto;
		padding: 2rem 1.5rem 5rem;
		color: var(--text-primary);
	}
	header h1 {
		margin: 0 0 0.25rem;
		font-size: 1.5rem;
	}
	header p,
	.hint {
		color: var(--text-muted);
		font-size: 0.85rem;
		margin: 0.25rem 0 0;
	}
	section {
		margin-top: 2.5rem;
	}
	h2 {
		font-size: 1rem;
		margin: 0 0 0.75rem;
		padding-bottom: 0.4rem;
		border-bottom: 1px solid color-mix(in srgb, var(--text-primary) 15%, transparent);
	}
	code {
		font-family: ui-monospace, 'SF Mono', Menlo, monospace;
		font-size: 0.85em;
	}
	.controls {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}
	.controls input[type='range'] {
		flex: 1;
		min-width: 260px;
	}
	output {
		font-family: ui-monospace, 'SF Mono', Menlo, monospace;
		font-size: 0.85rem;
		min-width: 4ch;
	}
	button {
		font: inherit;
		font-size: 0.8rem;
		padding: 0.35rem 0.7rem;
		border-radius: 6px;
		border: 1px solid color-mix(in srgb, var(--text-primary) 25%, transparent);
		background: transparent;
		color: var(--text-primary);
		cursor: pointer;
	}
	button:hover {
		background: color-mix(in srgb, var(--text-primary) 8%, transparent);
	}
	.marks {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-top: 0.75rem;
	}
	.marks button {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		line-height: 1.25;
		font-size: 0.72rem;
	}
	.marks button span {
		color: var(--text-muted);
		font-family: ui-monospace, 'SF Mono', Menlo, monospace;
	}
	.marks button.active {
		border-color: var(--text-primary);
		background: color-mix(in srgb, var(--text-primary) 10%, transparent);
	}
	.chk {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.8rem;
		color: var(--text-muted);
	}
	.stage {
		position: relative;
		height: min(78vh, 760px);
		margin-top: 1rem;
		border: 1px solid color-mix(in srgb, var(--text-primary) 15%, transparent);
		border-radius: 10px;
		overflow: hidden;
	}
	.petal-wrap {
		display: flex;
		gap: 1.5rem;
		align-items: flex-start;
		flex-wrap: wrap;
		margin-top: 1rem;
	}
	.petal-controls {
		flex: 0 0 240px;
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
	}
	.petal-controls label {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		font-size: 0.8rem;
		color: var(--text-muted);
	}
	.petal-controls label.chk {
		flex-direction: row;
		align-items: center;
	}
	.petal-controls em {
		font-size: 0.7rem;
		opacity: 0.7;
	}
	.petal-controls select {
		font: inherit;
		font-size: 0.8rem;
		padding: 0.25rem;
	}
	.note {
		font-size: 0.75rem;
		color: var(--text-muted);
		line-height: 1.45;
		margin: 0;
	}
	.petal-canvas {
		flex: 1;
		min-width: 320px;
	}
	.petal-canvas canvas {
		display: block;
		border: 1px solid color-mix(in srgb, var(--text-primary) 15%, transparent);
		border-radius: 10px;
	}
</style>
