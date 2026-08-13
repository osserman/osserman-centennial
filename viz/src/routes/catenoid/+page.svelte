<script>
	import CatenoidScene from '$lib/components/CatenoidScene.svelte';
	import ProfileEditor from '$lib/components/ProfileEditor.svelte';
	import AreaBarChart from '$lib/components/AreaBarChart.svelte';
	import { R, L, vProfile, curveProfile, cylinderProfile } from '$lib/catenoidProfile.js';

	// Internal staging for this single interaction — advanced via an
	// explicit Continue button, not scroll. These are tightly-coupled
	// interactive beats where the reader needs to actually try dragging
	// before moving on; gating that on scroll position is fragile (see the
	// citation chapter's activeIndex edge cases earlier this project) and
	// works against "reward curiosity, don't rush the reader." The outer
	// scrollytelling that will eventually link multiple interactions
	// together is a separate, later concern.
	let stage = $state('intro'); // 'intro' | 'reveal' | 'cinch' | 'curve'

	let midR = $state(R);
	// Starts offset from center (not 0) so the spread handle isn't rendered
	// exactly on top of the mid handle when the curve stage first appears —
	// at spread=0 the two handles occupy the same point, and since the mid
	// handle is later in the DOM (painted on top), it silently intercepted
	// every pointer event meant for the spread handle underneath it.
	const INITIAL_SPREAD = L * 0.12;
	let spread = $state(INITIAL_SPREAD);
	let revealed = $state(false);
	let revealComplete = $state(false);
	let hasInteractedCinch = $state(false);
	let hasInteractedCurve = $state(false);

	let area = $state(0);
	let cylinderArea = $state(0);
	let cinchRange = $state({ min: Infinity, max: -Infinity });
	let curveRange = $state({ min: Infinity, max: -Infinity });
	let cinchBest = $state(null);

	let profile = $derived(
		stage === 'curve' ? curveProfile(midR, spread) : stage === 'cinch' ? vProfile(midR) : cylinderProfile()
	);

	function handleAreaChange(a) {
		area = a;
		if (stage === 'intro' || stage === 'reveal') {
			cylinderArea = a;
		} else if (stage === 'cinch') {
			cinchRange = { min: Math.min(cinchRange.min, a), max: Math.max(cinchRange.max, a) };
		} else if (stage === 'curve') {
			curveRange = { min: Math.min(curveRange.min, a), max: Math.max(curveRange.max, a) };
		}
	}

	$effect(() => {
		if (stage === 'cinch' && midR !== R) hasInteractedCinch = true;
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
		}
		return list;
	});

	function goNext() {
		if (stage === 'intro') {
			stage = 'reveal';
			revealed = true;
		} else if (stage === 'reveal') {
			stage = 'cinch';
		} else if (stage === 'cinch') {
			cinchBest = finite(cinchRange.min) ?? area;
			stage = 'curve';
		}
	}

	let continueEnabled = $derived(
		stage === 'intro' ? true : stage === 'reveal' ? revealComplete : stage === 'cinch' ? hasInteractedCinch : false
	);
	let continueLabel = $derived(
		stage === 'intro'
			? 'Show the simplest surface'
			: stage === 'reveal'
				? 'Can we do better?'
				: stage === 'cinch'
					? 'Try a smooth curve'
					: ''
	);

	let heading = 'Can you beat the cylinder?';
	let body = $derived(
		stage === 'intro'
			? "Two rings. If you wanted to connect them with a surface, what's the simplest choice?"
			: stage === 'reveal'
				? 'The simplest choice: a cylinder.'
				: stage === 'cinch'
					? 'Drag the point up or down. Can you find a shape with less surface area than the cylinder?'
					: 'What if the transition were smooth instead of sharp? Drag the second point sideways to soften the curve.'
	);
</script>

<svelte:head>
	<title>Can you beat the cylinder?</title>
</svelte:head>

<main class="layout">
	<div class="text-panel">
		<h1>{heading}</h1>
		<p class="prompt">{body}</p>

		{#if stage === 'cinch' || stage === 'curve'}
			<ProfileEditor bind:midR bind:spread mode={stage === 'curve' ? 'curve' : 'v'} showSpreadHandle={stage === 'curve'} />
		{/if}

		{#if bars.length}
			<AreaBarChart {bars} />
		{/if}

		{#if stage !== 'curve'}
			<button class="continue-btn" disabled={!continueEnabled} onclick={goNext}>
				{continueLabel}
			</button>
		{:else}
			<p class="up-next">Next: Euler's 1744 answer — coming soon.</p>
		{/if}
	</div>

	<div class="scene-panel">
		<CatenoidScene {profile} {revealed} onAreaChange={handleAreaChange} onRevealComplete={() => (revealComplete = true)} />
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
