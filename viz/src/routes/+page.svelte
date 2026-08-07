<script>
	import { onMount } from 'svelte';
	import Scrolly from '$lib/components/Scrolly.svelte';
	import ScrollyStep from '$lib/components/ScrollyStep.svelte';
	import StepText from '$lib/components/StepText.svelte';
	import CitationGraph from '$lib/components/CitationGraph.svelte';
	import PaperDetail from '$lib/components/PaperDetail.svelte';
	import FilterPanel from '$lib/components/FilterPanel.svelte';
	import { steps } from '$lib/content/narrative.js';

	let { data } = $props();
	const citerNodes = data.nodes.filter((n) => !n.isSeed);

	let activeIndex = $state(0);

	// Filters (FilterPanel, rendered inside the free-exploration step) apply
	// from that step onward — index comparison, not a single-step id check,
	// so they stay active into the epilogue too rather than flickering off.
	// null = no filters active. Overrides the step's own view with the same
	// dim/highlight mechanism every narrative step already uses, rather than
	// a new code path.
	const freeExplorationIndex = steps.findIndex((s) => s.id === 'free-exploration');
	let filteredIds = $state(null);
	let activeView = $derived.by(() => {
		if (activeIndex >= freeExplorationIndex && filteredIds !== null) {
			return { colorBy: 'none', highlightIds: filteredIds, dimBackground: true };
		}
		return steps[activeIndex]?.view ?? { colorBy: 'none', highlightIds: [], dimBackground: false };
	});

	// Paper-detail modal: state lives here (not inside CitationGraph) so both
	// the graph (canvas click) and the left-panel paper titles can open the
	// same modal. This also fixes a stacking-context bug: CitationGraph's
	// panel is `position: sticky`, which always creates a new stacking
	// context, so a modal nested inside it had its z-index evaluated only
	// *within* that context — the sticky topic-header (z-index:5, at the
	// page's root stacking context) could end up painting on top of it.
	// Rendering the modal here, as a sibling at the root level, avoids that.
	const nodeById = new Map(data.nodes.map((n) => [n.id, n]));
	const curatedById = new Map(data.curated.map((c) => [c.id, c]));
	let selectedId = $state(null);
	let selectedNode = $derived(selectedId ? nodeById.get(selectedId) : null);
	let selectedCurated = $derived(selectedNode ? (curatedById.get(selectedNode.id) ?? null) : null);

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

	// Node-size metric: a comparison toggle, not a narrative control — raw
	// citation count structurally favors older papers (more time to
	// accumulate citations), so field/year-normalized alternatives are
	// offered side by side rather than picking one.
	const SIZE_METRICS = [
		{ id: 'citations', label: 'Citations' },
		{ id: 'percentile', label: 'Percentile' },
		{ id: 'yearPercentile', label: 'Year %ile' }
	];
	let sizeMetric = $state('citations');
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
							<StepText {step} onSelectPaper={(id) => (selectedId = id)} />
							{#if step.id === 'free-exploration'}
								<FilterPanel nodes={citerNodes} onFilterChange={(ids) => (filteredIds = ids)} />
							{/if}
						</ScrollyStep>
					{/each}
				</div>
			{/each}
		</Scrolly>
	</div>

	<div class="graph-panel">
		<div class="controls">
			<div class="size-toggle" role="group" aria-label="Node size metric">
				{#each SIZE_METRICS as m}
					<button class:active={sizeMetric === m.id} onclick={() => (sizeMetric = m.id)}>
						{m.label}
					</button>
				{/each}
			</div>
			<button class="theme-toggle" onclick={cycleTheme} title="Toggle light/dark (currently: {theme})">
				{theme === 'auto' ? '◐ Auto' : theme === 'light' ? '☀ Light' : '☾ Dark'}
			</button>
		</div>
		<CitationGraph
			nodes={data.nodes}
			curated={data.curated}
			timeDomain={data.timeDomain}
			viewSpec={activeView}
			{theme}
			{sizeMetric}
			onSelectNode={(node) => (selectedId = node?.id ?? null)}
		/>
	</div>
</main>

{#if selectedNode}
	<PaperDetail node={selectedNode} curatedEntry={selectedCurated} onClose={() => (selectedId = null)} />
{/if}

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
	.controls {
		position: absolute;
		top: 1.25rem;
		right: 1.25rem;
		z-index: 20;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.size-toggle {
		display: flex;
		background: var(--surface-2);
		border: 1px solid color-mix(in srgb, var(--text-primary) 14%, transparent);
		border-radius: 999px;
		padding: 0.2rem;
		gap: 0.15rem;
	}
	.size-toggle button {
		background: none;
		border: none;
		color: var(--text-secondary);
		border-radius: 999px;
		padding: 0.3rem 0.7rem;
		font-size: 0.75rem;
		cursor: pointer;
	}
	.size-toggle button.active {
		background: var(--accent);
		color: var(--surface-1);
	}
	.theme-toggle {
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
