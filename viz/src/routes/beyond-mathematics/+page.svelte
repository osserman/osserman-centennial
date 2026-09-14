<script>
	import { onMount } from 'svelte';
	import Scrolly from '$lib/components/Scrolly.svelte';
	import ScrollyStep from '$lib/components/ScrollyStep.svelte';
	import StepText from '$lib/components/StepText.svelte';
	import PaperList from '$lib/components/PaperList.svelte';
	import CitationGraph from '$lib/components/CitationGraph.svelte';
	import PaperDetail from '$lib/components/PaperDetail.svelte';
	import FilterPanel from '$lib/components/FilterPanel.svelte';
	import StanzaNav from '$lib/components/StanzaNav.svelte';
	import { steps, intro } from '$lib/content/narrative.js';

	let { data } = $props();
	const citerNodes = data.nodes.filter((n) => !n.isSeed);

	// Minimal inline-markdown support, same convention as the other two
	// stanza pages' own renderInline — **bold** only, plus *italic* (used for
	// book titles).
	function renderInline(text) {
		return text
			.replace(/\*\*(.+?)\*\*/g, '<strong class="stat">$1</strong>')
			.replace(/\*(.+?)\*/g, '<em>$1</em>');
	}

	// Same convention as the other two stanzas' own opening epigraph: the
	// quoted paragraph is one string ('"quote" - attribution'), split at the
	// dash right after the closing quote mark so the two get their own
	// distinct styling (see .epigraph below) instead of running together.
	function splitQuote(text) {
		const m = text.match(/^(.*?")\s*-\s*(.+)$/s);
		return m ? { quote: m[1], attribution: m[2] } : { quote: text, attribution: '' };
	}

	let activeIndex = $state(0);

	// The citation graph populates chronologically as the 'intro' step scrolls
	// by, rather than arriving already fully drawn -- see CitationGraph's own
	// `revealProgress` prop. Same arrival/settle-style progress calc every
	// stanza page uses, but measured against the intro ScrollyStep's own DOM
	// node (bound via ScrollyStep's `stepEl`) rather than a sticky text panel,
	// since this page's steps aren't sticky -- the graph panel is.
	//
	// REVEAL_FRACTION < 1 so the sweep finishes with room to spare before the
	// Scrolly trigger band would ever hand off to 'work-types': the intro
	// step's own text only starts fading (ScrollyStep's opacity transition)
	// once the reader has scrolled it essentially off-screen, well past where
	// this reaches 1 — so the graph is always fully populated before that text
	// fades, never after.
	let introStepEl = $state();
	let graphRevealProgress = $state(0);
	const REVEAL_FRACTION = 0.8;

	function updateGraphReveal() {
		if (!introStepEl) {
			graphRevealProgress = 0;
			return;
		}
		const rect = introStepEl.getBoundingClientRect();
		const line = window.innerHeight / 2; // matches Scrolly's own trigger line
		const traveled = line - rect.top;
		graphRevealProgress = Math.max(0, Math.min(1, traveled / (rect.height * REVEAL_FRACTION)));
	}

	onMount(() => {
		updateGraphReveal();
		window.addEventListener('scroll', updateGraphReveal, { passive: true });
		window.addEventListener('resize', updateGraphReveal);
		return () => {
			window.removeEventListener('scroll', updateGraphReveal);
			window.removeEventListener('resize', updateGraphReveal);
		};
	});

	// Filters (FilterPanel, rendered inside the free-exploration step) apply
	// from that step onward — index comparison, not a single-step id check,
	// so they stay active into the epilogue too rather than flickering off.
	// null = no filters active. Overrides the step's own view with the same
	// dim/highlight mechanism every narrative step already uses, rather than
	// a new code path.
	const freeExplorationIndex = steps.findIndex((s) => s.id === 'free-exploration');
	let filteredIds = $state(null);

	// Debug-only: spotlight papers missing citation_normalized_percentile
	// (the "Percentile" size metric) so it's visible which/how many papers
	// fall back to floor-size under that metric — a data-coverage check, not
	// a narrative view. Takes priority over everything else while active.
	const missingPercentileIds = citerNodes.filter((n) => n.citationPctile == null).map((n) => n.id);
	let highlightMissingPercentile = $state(false);

	// Which curated papers currently have their <details> expanded (see
	// PaperList.svelte's onToggle) — a field step's own `view` spotlights all
	// of its papers together, but expanding one narrows that down to just the
	// paper(s) currently open, a small confirmation that this dot on the graph
	// is the one just read about. Keyed by paperId directly rather than by
	// step, since ids are unique across every field's papers.
	let expandedPaperIds = $state(new Set());

	function togglePaper(paperId, isOpen) {
		const next = new Set(expandedPaperIds);
		if (isOpen) next.add(paperId);
		else next.delete(paperId);
		expandedPaperIds = next;
	}

	let activeView = $derived.by(() => {
		if (highlightMissingPercentile) {
			return { colorBy: 'none', highlightIds: missingPercentileIds, dimBackground: true };
		}
		if (activeIndex >= freeExplorationIndex && filteredIds !== null) {
			return { colorBy: 'filter', highlightIds: filteredIds, dimBackground: true };
		}
		// Narrow the current field's spotlight to just the paper(s) expanded
		// within it — filtered against this step's own papers so an id left
		// expanded in a field the reader has since scrolled away from can't
		// leak into an unrelated field's view.
		const currentStep = steps[activeIndex];
		if (currentStep?.papers?.length && expandedPaperIds.size) {
			const ids = currentStep.papers.map((p) => p.paperId).filter((id) => expandedPaperIds.has(id));
			if (ids.length) return { colorBy: 'none', highlightIds: ids, dimBackground: true };
		}
		return currentStep?.view ?? { colorBy: 'none', highlightIds: [], dimBackground: false };
	});

	// The filter panel lives over the graph (plenty of width there) rather
	// than cramped in the narrow text column — a collapsible panel toggled
	// from the controls row, not a modal, so the graph stays visible while
	// adjusting filters. Only offered from free-exploration onward, matching
	// when filtering actually has an effect; force-closed if the reader
	// scrolls back above that point so it can't get stuck open with its
	// toggle button hidden.
	let filtersOpen = $state(false);
	$effect(() => {
		if (activeIndex < freeExplorationIndex) filtersOpen = false;
	});

	// Wheel/scroll input inside the filter panel that isn't fully absorbed by
	// its own internal scrolling can chain to the page's scroll behind it —
	// which moves activeIndex back, which the effect above reads as "scrolled
	// away from free-exploration" and force-closes the panel. Locking the
	// page's own scroll while the panel is open stops that entirely; the
	// panel's own overflow-y:auto content still scrolls normally since this
	// only blocks the *document's* scroll position, not a descendant's.
	$effect(() => {
		if (typeof document === 'undefined' || !filtersOpen) return;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = '';
		};
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

	// Size-metric toggle and theme toggle are tuning/dev controls, not part of
	// the shared prototype's default UI — hidden unless ?debug=true is in the
	// URL, so casual visitors get a clean read-only view while we keep a way
	// to reach them for tuning.
	let showCustomParams = $state(false);

	onMount(() => {
		const params = new URLSearchParams(window.location.search);
		showCustomParams = params.get('debug') === 'true';
		const param = params.get('theme');
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
	let sizeMetric = $state('percentile');
</script>

<svelte:head>
	<title>Beyond Mathematics</title>
</svelte:head>

<section class="cover-section">
	<div class="cover-card">
		<p class="kicker">Stanza III</p>
		<h1>{intro.title}</h1>
		{#each intro.body as para}
			{#if para.startsWith('> ')}
				{@const { quote, attribution } = splitQuote(para.slice(2))}
				<blockquote class="epigraph">
					<p>{@html renderInline(quote)}</p>
					{#if attribution}<footer>{@html renderInline(attribution)}</footer>{/if}
				</blockquote>
			{:else}
				<p>{@html renderInline(para)}</p>
			{/if}
		{/each}
		<div class="scroll-cue">Scroll to begin ↓</div>
	</div>
</section>

<main class="layout">
	<div class="text-panel">
		<Scrolly bind:active={activeIndex}>
			{#each groups as group}
				<div class="topic-group">
					{#if group.kicker}
						<div class="topic-header">{group.kicker}</div>
					{/if}
					{#each group.items as { step, index }}
						{#if step.id === 'intro'}
							<ScrollyStep index={index} active={index === activeIndex} bind:stepEl={introStepEl}>
								<StepText {step} onSelectPaper={(id) => (selectedId = id)} />
							</ScrollyStep>
						{:else}
							<ScrollyStep index={index} active={index === activeIndex}>
								<!-- Single wrapper so ScrollyStep's own flex root (row,
								     align-items:center) sees one child, not two separately
								     flex-positioned siblings -- same bug class documented in
								     minimal-surfaces/+page.svelte's own .euler-flow. -->
								<div class="field-step">
									<StepText {step} onSelectPaper={(id) => (selectedId = id)} />
									{#if step.papers?.length}
										<PaperList
											papers={step.papers}
											onToggle={togglePaper}
											onSelectPaper={(id) => (selectedId = id)}
										/>
									{/if}
								</div>
							</ScrollyStep>
						{/if}
					{/each}
				</div>
			{/each}
		</Scrolly>
		<StanzaNav current="III" next={{ title: 'Coda', disabled: true }} />
	</div>

	<div class="graph-panel">
		<div class="controls">
			{#if showCustomParams}
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
				<button
					class="theme-toggle"
					class:active={highlightMissingPercentile}
					onclick={() => (highlightMissingPercentile = !highlightMissingPercentile)}
				>
					⚠ Missing %ile ({missingPercentileIds.length})
				</button>
			{/if}
			{#if activeIndex >= freeExplorationIndex}
				<button
					class="filters-toggle"
					class:active={filtersOpen}
					onclick={() => (filtersOpen = !filtersOpen)}
				>
					{filtersOpen ? '✕ Close' : '⚲ Filters'}
				</button>
			{/if}
		</div>
		{#if activeIndex >= freeExplorationIndex}
			<div class="filter-overlay" class:hidden={!filtersOpen}>
				<FilterPanel nodes={citerNodes} onFilterChange={(ids) => (filteredIds = ids)} onClose={() => (filtersOpen = false)} />
			</div>
		{/if}
		<CitationGraph
			nodes={data.nodes}
			curated={data.curated}
			timeDomain={data.timeDomain}
			viewSpec={activeView}
			{theme}
			{sizeMetric}
			revealProgress={graphRevealProgress}
			onSelectNode={(node) => (selectedId = node?.id ?? null)}
		/>
	</div>
</main>

{#if selectedNode}
	<PaperDetail node={selectedNode} curatedEntry={selectedCurated} onClose={() => (selectedId = null)} />
{/if}

<style>
	/* Same cover treatment as the other two stanzas' own .cover-section --
	   full-viewport, centred card the reader scrolls past before the
	   two-column layout (here, <main class="layout"> with the citation graph)
	   begins. This stanza had no cover at all before; ported verbatim rather
	   than reinvented so all three stanzas open the same way. */
	.cover-section {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		box-sizing: border-box;
	}
	.cover-card {
		max-width: 34rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.1rem;
		text-align: center;
		padding: 3rem 2.75rem;
		border: 1px solid var(--surface-2);
		border-radius: 16px;
		background: var(--surface-2);
	}
	.kicker {
		margin: 0;
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--accent);
	}
	.cover-card h1 {
		margin: 0;
		font-size: 2.2rem;
		font-weight: 700;
		line-height: 1.15;
		letter-spacing: -0.01em;
		color: var(--text-primary);
	}
	.cover-card p {
		margin: 0;
		font-size: 1.05rem;
		line-height: 1.6;
		color: var(--text-secondary);
	}
	.epigraph {
		position: relative;
		margin: 0.3rem 0;
		padding: 0.2rem 1.8rem;
	}
	.epigraph::before {
		content: '“';
		position: absolute;
		top: -1.6rem;
		left: -0.2rem;
		font-family: Georgia, 'Times New Roman', serif;
		font-size: 4.5rem;
		line-height: 1;
		color: var(--accent);
		opacity: 0.25;
	}
	.epigraph p {
		font-family: Georgia, 'Times New Roman', serif;
		font-size: 1.3rem;
		font-style: italic;
		line-height: 1.45;
		color: var(--text-primary);
	}
	.epigraph footer {
		margin-top: 0.6rem;
		font-size: 0.8rem;
		font-style: normal;
		letter-spacing: 0.03em;
		color: var(--text-muted);
	}
	.epigraph footer::before {
		content: '— ';
	}
	.scroll-cue {
		margin-top: 0.75rem;
		font-size: 0.8rem;
		letter-spacing: 0.04em;
		color: var(--text-muted);
	}
	:global(.stat) {
		color: var(--accent);
		font-weight: 700;
		font-style: normal;
	}
	.layout {
		display: flex;
		align-items: flex-start;
	}
	.text-panel {
		width: min(28vw, 24rem);
		flex-shrink: 0;
		padding: 0 2.5rem 3rem;
		border-right: 1px solid var(--surface-2);
	}
	.topic-group {
		position: relative;
	}
	.field-step {
		display: flex;
		flex-direction: column;
		width: 100%;
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
	.theme-toggle.active {
		background: var(--accent);
		color: var(--surface-1);
		border-color: var(--accent);
	}
	.filters-toggle {
		background: var(--surface-2);
		color: var(--text-secondary);
		border: 1px solid color-mix(in srgb, var(--text-primary) 14%, transparent);
		border-radius: 999px;
		padding: 0.35rem 0.85rem;
		font-size: 0.78rem;
		cursor: pointer;
	}
	.filters-toggle:hover {
		color: var(--text-primary);
	}
	.filters-toggle.active {
		background: var(--accent);
		color: var(--surface-1);
		border-color: var(--accent);
	}
	.filter-overlay {
		position: absolute;
		top: 4.5rem;
		right: 1.25rem;
		z-index: 20;
		width: min(30rem, calc(100% - 2.5rem));
		max-height: calc(100vh - 6rem);
		overflow-y: auto;
		/* Belt-and-suspenders alongside the body scroll lock: stops scroll
		   input from chaining to the page once this panel's own content hits
		   its scroll boundary. */
		overscroll-behavior: contain;
	}
	/* display:none (not #if) when closed, so FilterPanel stays mounted and
	   its selections survive close/reopen instead of resetting each time. */
	.filter-overlay.hidden {
		display: none;
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
