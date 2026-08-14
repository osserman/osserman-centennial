<script>
	import { onMount } from 'svelte';
	import CatenoidScene from '$lib/components/CatenoidScene.svelte';
	import ProfileEditor from '$lib/components/ProfileEditor.svelte';
	import AreaBarChart from '$lib/components/AreaBarChart.svelte';
	import {
		DEFAULT_R,
		DEFAULT_L,
		vProfile,
		curveProfile,
		cylinderProfile,
		catenaryProfile,
		maxPossibleArea
	} from '$lib/catenoidProfile.js';

	// R/L were briefly reactive (debug sliders, since removed) — dynamically
	// changing them after midR/spread had already been initialized from the
	// old values caused a real bug (a stale cinch radius could end up larger
	// than the new ring radius). Fixed constants sidestep that entirely.
	const ringR = DEFAULT_R;
	const ringL = DEFAULT_L;

	// Computed once, up front, from the fixed ring geometry above — not from
	// whatever's currently interactive — so AreaBarChart's Y axis never
	// rescales mid-interaction. See maxPossibleArea's own comment for why
	// that reactive rescaling was actively misleading.
	const chartMaxVal = maxPossibleArea(ringR, ringL) * 1.1;

	// Internal staging. 'intro' is scroll-scrubbed (see below); 'cinch' and
	// 'curve' are the click/drag-driven sandbox, advanced via a Continue
	// button — tightly-coupled interactive beats where the reader needs to
	// actually try dragging before moving on, which is fragile to gate on
	// scroll position (see the citation chapter's activeIndex edge cases
	// earlier this project). The outer scrollytelling that will eventually
	// link multiple interactions together is a separate, later concern.
	let stage = $state('intro'); // 'intro' | 'cinch' | 'curve' | 'catenary'

	let midR = $state(DEFAULT_R);
	// Starts offset from center (not 0) so the spread handle isn't rendered
	// exactly on top of the mid handle when the curve stage first appears —
	// at spread=0 the two handles occupy the same point, and since the mid
	// handle is later in the DOM (painted on top), it silently intercepted
	// every pointer event meant for the spread handle underneath it.
	const INITIAL_SPREAD = DEFAULT_L * 0.12;
	let spread = $state(INITIAL_SPREAD);
	let hasInteractedCinch = $state(false);
	let hasInteractedCurve = $state(false);

	let area = $state(0);
	let cylinderArea = $state(0);
	let cinchRange = $state({ min: Infinity, max: -Infinity });
	let curveRange = $state({ min: Infinity, max: -Infinity });
	let cinchBest = $state(null);
	let curveBest = $state(null);
	let catenaryArea = $state(null);

	// catenaryProfile returns null past GOLDSCHMIDT_LIMIT — not reachable at
	// the fixed ringR/ringL above (chosen specifically to stay under it), but
	// falling back to the cylinder rather than crashing if that ever changes.
	let profile = $derived(
		stage === 'catenary'
			? (catenaryProfile(ringR, ringL) ?? cylinderProfile(ringR, ringL))
			: stage === 'curve'
				? curveProfile(ringR, ringL, midR, spread)
				: stage === 'cinch'
					? vProfile(ringR, ringL, midR)
					: cylinderProfile(ringR, ringL)
	);

	function handleAreaChange(a) {
		area = a;
		if (stage === 'intro') {
			cylinderArea = a;
		} else if (stage === 'cinch') {
			cinchRange = { min: Math.min(cinchRange.min, a), max: Math.max(cinchRange.max, a) };
		} else if (stage === 'curve') {
			curveRange = { min: Math.min(curveRange.min, a), max: Math.max(curveRange.max, a) };
		} else if (stage === 'catenary') {
			catenaryArea = a;
		}
	}

	$effect(() => {
		if (stage === 'cinch' && midR !== ringR) hasInteractedCinch = true;
	});
	$effect(() => {
		if (stage === 'curve' && spread !== INITIAL_SPREAD) hasInteractedCurve = true;
	});

	function finite(v) {
		return Number.isFinite(v) ? v : undefined;
	}

	let bars = $derived.by(() => {
		const list = [{ label: 'Cylinder', value: cylinderArea, isStatic: true }];
		if (stage === 'cinch') {
			list.push({ label: 'V-shape', value: area, min: finite(cinchRange.min), max: finite(cinchRange.max) });
		} else if (stage === 'curve') {
			list.push({
				label: 'V-shape',
				value: cinchBest ?? finite(cinchRange.min) ?? area,
				min: finite(cinchRange.min),
				max: finite(cinchRange.max)
			});
			list.push({ label: 'Smooth curve', value: area, min: finite(curveRange.min), max: finite(curveRange.max) });
		} else if (stage === 'catenary') {
			list.push({ label: 'V-shape', value: cinchBest ?? finite(cinchRange.min) ?? 0 });
			list.push({ label: 'Smooth curve', value: curveBest ?? finite(curveRange.min) ?? 0 });
			if (catenaryArea != null) list.push({ label: 'Catenary', value: catenaryArea, isAnswer: true });
		}
		return list;
	});

	// How much area your best hand-shaped smooth curve left on the table
	// compared to the true minimum — a direct, computed answer to "how do
	// I compare the two side by side."
	let comparisonNote = $derived.by(() => {
		if (stage !== 'catenary' || catenaryArea == null) return '';
		const best = curveBest ?? finite(curveRange.min);
		if (best == null) return '';
		const pct = ((best - catenaryArea) / catenaryArea) * 100;
		return pct < 0.05
			? 'Your best smooth curve matched the true minimum almost exactly.'
			: `Your best smooth curve was ${pct.toFixed(1)}% above the true minimum.`;
	});

	function goNext() {
		if (stage === 'cinch') {
			cinchBest = finite(cinchRange.min) ?? area;
			stage = 'curve';
		} else if (stage === 'curve') {
			curveBest = finite(curveRange.min) ?? area;
			stage = 'catenary';
		}
	}

	let continueEnabled = $derived(
		stage === 'cinch' ? hasInteractedCinch : stage === 'curve' ? hasInteractedCurve : false
	);
	let continueLabel = $derived(
		stage === 'cinch' ? 'Try a smooth curve' : stage === 'curve' ? 'Show the minimum' : ''
	);

	let body = $derived(
		stage === 'cinch'
			? 'Drag the point up or down to find a surface connecting the rings with an area less than the cylinder.'
			: stage === 'curve'
				? 'What if the transition were smooth instead of sharp? Drag the second point sideways to soften the curve.'
				: stage === 'catenary'
					? "In 1744, Leonhard Euler proved this exact curve — the catenary — produces the smallest possible surface. Rotated, it's called a catenoid."
					: ''
	);

	// Scroll-scrubbed reveal: revealProgress tracks how far the intro text
	// has scrolled from just-below-the-fold to its resting position,
	// driving the cylinder's sweep-open animation directly (no timer —
	// scroll position *is* the clock). Once it reaches 1, stage advances to
	// 'cinch' automatically and this stops mattering — everything from
	// there on is the click/drag sandbox above, unaffected by scroll.
	let revealProgress = $state(0);
	let introTextEl = $state();
	// The intro text is `position: sticky` (settles at STICKY_TOP_FRAC of
	// viewport height and stays there) so it visually "arrives" at a fixed
	// comfortable reading position regardless of how tall the surrounding
	// spacers are — decoupling "does the text look good arriving on screen"
	// from "is there enough scroll room," which turned out not to work as
	// one combined calculation (a taller lead-in spacer increases both the
	// scroll room available *and* the distance the text needs to travel by
	// the same amount, so it never actually closes the gap between them;
	// only a trailing spacer, which doesn't move the text, adds net room).
	// Progress is the fraction of that fixed travel distance covered so
	// far: 0 at the text's first-measured (pre-scroll) position, 1 once
	// its rect.top reaches the sticky threshold and it stops moving.
	const STICKY_TOP_FRAC = 0.38;
	let introInitialTop = null;

	function updateScrollProgress() {
		if (stage !== 'intro' || !introTextEl) return;
		const rect = introTextEl.getBoundingClientRect();
		const vh = window.innerHeight;
		if (introInitialTop === null) introInitialTop = rect.top;
		const stickyTop = STICKY_TOP_FRAC * vh;
		const span = introInitialTop - stickyTop;
		const progress = span > 0 ? Math.max(0, Math.min(1, (introInitialTop - rect.top) / span)) : 1;
		revealProgress = progress;
		if (progress >= 1) {
			revealProgress = 1;
			stage = 'cinch';
		}
	}

	onMount(() => {
		updateScrollProgress();
		window.addEventListener('scroll', updateScrollProgress, { passive: true });
		window.addEventListener('resize', updateScrollProgress);
		return () => {
			window.removeEventListener('scroll', updateScrollProgress);
			window.removeEventListener('resize', updateScrollProgress);
		};
	});
</script>

<svelte:head>
	<title>Connecting two rings</title>
</svelte:head>

<main class="layout">
	<div class="text-panel">
		{#if stage === 'intro'}
			<div class="intro-spacer-lead"></div>
			<div class="intro-sticky" bind:this={introTextEl}>
				<h1>Connecting two rings</h1>
				<p class="prompt">Two rings. If you wanted to connect them with a surface, what's the simplest choice?</p>
			</div>
			<div class="intro-spacer-trail"></div>
		{:else}
			<h1>Connecting two rings</h1>
			<p class="prompt">{body}</p>

			{#if stage === 'cinch' || stage === 'curve'}
				<ProfileEditor
					R={ringR}
					L={ringL}
					bind:midR
					bind:spread
					mode={stage === 'curve' ? 'curve' : 'v'}
					showSpreadHandle={stage === 'curve'}
				/>
			{/if}

			<AreaBarChart {bars} maxVal={chartMaxVal} />

			{#if comparisonNote}
				<p class="comparison-note">{comparisonNote}</p>
			{/if}

			{#if stage === 'cinch' || stage === 'curve'}
				<button class="continue-btn" disabled={!continueEnabled} onclick={goNext}>
					{continueLabel}
				</button>
			{:else if stage === 'catenary'}
				<p class="up-next">Up next: how minimal surfaces became a mathematical field of their own — coming soon.</p>
			{/if}
		{/if}
	</div>

	<div class="scene-panel">
		<CatenoidScene {profile} R={ringR} L={ringL} {revealProgress} onAreaChange={handleAreaChange} />
	</div>
</main>

<style>
	.layout {
		display: flex;
		align-items: stretch;
		min-height: 100vh;
	}
	.text-panel {
		width: min(28vw, 24rem);
		flex-shrink: 0;
		padding: 3rem 2.5rem;
		border-right: 1px solid var(--surface-2);
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}
	.intro-spacer-lead {
		height: 90vh;
	}
	.intro-sticky {
		position: sticky;
		top: 38vh;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}
	.intro-spacer-trail {
		height: 100vh;
	}
	h1 {
		font-size: 1.7rem;
		font-weight: 700;
		line-height: 1.2;
		letter-spacing: -0.01em;
		margin: 0;
	}
	.prompt {
		font-size: 1.05rem;
		line-height: 1.6;
		color: var(--text-secondary);
		margin: -1rem 0 0;
	}
	.continue-btn {
		align-self: flex-start;
		background: var(--accent);
		color: var(--surface-1);
		border: none;
		border-radius: 999px;
		padding: 0.65rem 1.4rem;
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
	}
	.continue-btn:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}
	.up-next {
		font-size: 0.85rem;
		color: var(--text-muted);
		font-style: italic;
		margin: 0;
	}
	.comparison-note {
		font-size: 0.85rem;
		color: var(--text-secondary);
		margin: 0;
	}
	.scene-panel {
		flex: 1;
		min-width: 0;
		position: sticky;
		top: 0;
		height: 100vh;
	}
	@media (max-width: 900px) {
		.layout {
			flex-direction: column;
		}
		.text-panel {
			width: auto;
			border-right: none;
		}
		.scene-panel {
			position: static;
			height: 60vh;
		}
	}
</style>
