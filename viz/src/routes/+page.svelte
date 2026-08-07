<script>
	import { onMount } from 'svelte';
	import Scrolly from '$lib/components/Scrolly.svelte';
	import ScrollyStep from '$lib/components/ScrollyStep.svelte';
	import StepText from '$lib/components/StepText.svelte';
	import CitationGraph from '$lib/components/CitationGraph.svelte';
	import { steps } from '$lib/content/narrative.js';

	let { data } = $props();

	let activeIndex = $state(0);
	let activeView = $derived(steps[activeIndex]?.view ?? { colorBy: 'none', highlightIds: [], dimBackground: false });

	// Group consecutive steps that share a kicker (e.g. the 3 Engineering
	// steps) so the kicker can render once as a sticky header that stays
	// pinned while its papers scroll past underneath — "lock the topic while
	// introducing the papers within it." Steps without a kicker (intro, math,
	// beyond-intro, free-exploration, epilogue) each get their own headerless
	// group of one.
	const groups = [];
	for (let i = 0; i < steps.length; i++) {
		const step = steps[i];
		const last = groups[groups.length - 1];
		if (last && step.kicker && last.kicker === step.kicker) last.items.push({ step, index: i });
		else groups.push({ kicker: step.kicker, items: [{ step, index: i }] });
	}

	// Theme: 'auto' follows the OS; 'light'/'dark' is an explicit override,
	// settable via the toggle button or a ?theme=light|dark URL param (for
	// sharing/screenshotting a specific mode without touching OS settings).
	let theme = $state('auto');

	function applyTheme(t) {
		theme = t;
		if (t === 'auto') delete document.documentElement.dataset.theme;
		else document.documentElement.dataset.theme = t;
		const url = new URL(window.location.href);
		if (t === 'auto') url.searchParams.delete('theme');
		else url.searchParams.set('theme', t);
		history.replaceState(null, '', url);
	}

	function cycleTheme() {
		applyTheme(theme === 'auto' ? 'light' : theme === 'light' ? 'dark' : 'auto');
	}

	onMount(() => {
		const param = new URLSearchParams(window.location.search).get('theme');
		if (param === 'light' || param === 'dark') applyTheme(param);
	});
</script>

<svelte:head>
	<title>From Pure Mathematics to the World</title>
</svelte:head>

<main class="layout">
	<div class="text-panel">
		<Scrolly bind:active={activeIndex}>
			{#each groups as group}
				<div class="topic-group">
					{#if group.kicker}
						<div class="topic-header">{group.kicker}</div>
					{/if}
					{#each group.items as { step, index }}
						<ScrollyStep index={index} active={index === activeIndex}>
							<StepText {step} />
						</ScrollyStep>
					{/each}
				</div>
			{/each}
		</Scrolly>
	</div>

	<div class="graph-panel">
		<button class="theme-toggle" onclick={cycleTheme} title="Toggle light/dark (currently: {theme})">
			{theme === 'auto' ? '◐ Auto' : theme === 'light' ? '☀ Light' : '☾ Dark'}
		</button>
		<CitationGraph
			nodes={data.nodes}
			curated={data.curated}
			timeDomain={data.timeDomain}
			viewSpec={activeView}
			{theme}
		/>
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
	/* OS preference — loses to an explicit [data-theme] stamp either way. */
	@media (prefers-color-scheme: dark) {
		:global(:root:where(:not([data-theme='light']))) {
			color-scheme: dark;
			--surface-1: #1a1a19;
			--surface-2: #232322;
			--text-primary: #ffffff;
			--text-secondary: #c3c2b7;
			--text-muted: #898781;
			--accent: #3987e5;
		}
	}
	/* Explicit toggle/URL-param overrides — win in both directions. */
	:global(:root[data-theme='dark']) {
		color-scheme: dark;
		--surface-1: #1a1a19;
		--surface-2: #232322;
		--text-primary: #ffffff;
		--text-secondary: #c3c2b7;
		--text-muted: #898781;
		--accent: #3987e5;
	}
	:global(:root[data-theme='light']) {
		color-scheme: light;
		--surface-1: #fcfcfb;
		--surface-2: #f0efec;
		--text-primary: #0b0b0b;
		--text-secondary: #52514e;
		--text-muted: #898781;
		--accent: #2a78d6;
	}

	.layout {
		display: flex;
		align-items: flex-start;
	}
	.text-panel {
		width: min(34vw, 30rem);
		flex-shrink: 0;
		padding: 0 2.5rem;
		border-right: 1px solid var(--surface-2);
	}
	.topic-group {
		position: relative;
	}
	.topic-header {
		position: sticky;
		top: 0;
		z-index: 5;
		background: var(--surface-1);
		padding: 0.85rem 0;
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--accent);
		border-bottom: 1px solid var(--surface-2);
	}
	.graph-panel {
		position: sticky;
		top: 0;
		height: 100vh;
		flex: 1;
		min-width: 0;
	}
	.theme-toggle {
		position: absolute;
		top: 1.25rem;
		right: 1.25rem;
		z-index: 20;
		background: var(--surface-2);
		color: var(--text-secondary);
		border: 1px solid color-mix(in srgb, var(--text-primary) 14%, transparent);
		border-radius: 999px;
		padding: 0.35rem 0.85rem;
		font-size: 0.78rem;
		cursor: pointer;
	}
	.theme-toggle:hover {
		color: var(--text-primary);
	}

	@media (max-width: 900px) {
		.layout {
			flex-direction: column;
		}
		.text-panel {
			width: auto;
			border-right: none;
		}
		.graph-panel {
			position: static;
			height: 60vh;
		}
	}
</style>
