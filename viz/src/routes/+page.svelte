<script>
	import Scrolly from '$lib/components/Scrolly.svelte';
	import ScrollyStep from '$lib/components/ScrollyStep.svelte';
	import StepText from '$lib/components/StepText.svelte';
	import CitationGraph from '$lib/components/CitationGraph.svelte';
	import { steps } from '$lib/content/narrative.js';

	let { data } = $props();

	let activeIndex = $state(0);
	let activeView = $derived(steps[activeIndex]?.view ?? { colorBy: 'none', highlightIds: [], dimBackground: false });
</script>

<svelte:head>
	<title>From Pure Mathematics to the World</title>
</svelte:head>

<main>
	<div class="graph-layer">
		<CitationGraph nodes={data.nodes} edges={data.edges} curated={data.curated} viewSpec={activeView} />
	</div>

	<div class="text-layer">
		<Scrolly bind:active={activeIndex}>
			{#each steps as step, i}
				<ScrollyStep index={i} active={i === activeIndex}>
					<div class="step-card">
						<StepText {step} />
					</div>
				</ScrollyStep>
			{/each}
		</Scrolly>
	</div>
</main>

<style>
	:global(html, body) {
		margin: 0;
		padding: 0;
		background: var(--surface-1);
		color: var(--text-primary);
		font-family:
			system-ui,
			-apple-system,
			'Segoe UI',
			sans-serif;
	}
	:global(:root) {
		color-scheme: light;
		--surface-1: #fcfcfb;
		--surface-2: #f0efec;
		--text-primary: #0b0b0b;
		--text-secondary: #52514e;
		--text-muted: #898781;
		--accent: #2a78d6;
	}
	@media (prefers-color-scheme: dark) {
		:global(:root) {
			color-scheme: dark;
			--surface-1: #1a1a19;
			--surface-2: #232322;
			--text-primary: #ffffff;
			--text-secondary: #c3c2b7;
			--text-muted: #898781;
			--accent: #3987e5;
		}
	}

	main {
		position: relative;
	}
	.graph-layer {
		position: sticky;
		top: 0;
		height: 100vh;
		width: 100%;
		z-index: 0;
	}
	.text-layer {
		position: relative;
		z-index: 1;
		margin-top: -100vh;
		pointer-events: none;
	}
	.step-card {
		pointer-events: auto;
		max-width: 26rem;
		margin-left: min(6vw, 4rem);
		background: var(--surface-1);
		border: 1px solid color-mix(in srgb, var(--text-primary) 20%, transparent);
		border-radius: 10px;
		padding: 1.5rem 1.75rem;
		box-shadow: 0 12px 36px rgba(0, 0, 0, 0.35);
	}

	@media (max-width: 720px) {
		.step-card {
			margin-left: 1rem;
			margin-right: 1rem;
			max-width: none;
		}
	}
</style>
