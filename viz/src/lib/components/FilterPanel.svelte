<script>
	// Free-exploration filters: keyword search + 4 searchable multi-select
	// facets (topic/venue/institution/country). Reports the matching node-id
	// set up via onFilterChange(idsOrNull) — null means "no filters active,"
	// distinct from an empty-but-active result set, so the caller can tell
	// "show everything" from "nothing matched."
	import FacetSelect from './FacetSelect.svelte';

	let { nodes = [], onFilterChange } = $props();

	function distinct(getValues) {
		const set = new Set();
		for (const n of nodes) {
			for (const v of getValues(n)) {
				const trimmed = (v || '').trim();
				if (trimmed) set.add(trimmed);
			}
		}
		return [...set].sort((a, b) => a.localeCompare(b));
	}

	const topicOptions = distinct((n) => [n.topic]);
	const venueOptions = distinct((n) => [n.venue]);
	const institutionOptions = distinct((n) => n.institutions || []);
	const countryOptions = distinct((n) => n.countries || []);

	let keyword = $state('');
	let selectedTopics = $state([]);
	let selectedVenues = $state([]);
	let selectedInstitutions = $state([]);
	let selectedCountries = $state([]);

	let hasActiveFilters = $derived(
		keyword.trim().length > 0 ||
			selectedTopics.length > 0 ||
			selectedVenues.length > 0 ||
			selectedInstitutions.length > 0 ||
			selectedCountries.length > 0
	);

	function matches(n) {
		if (keyword.trim()) {
			const kw = keyword.trim().toLowerCase();
			const hay = `${n.title || ''} ${n.authors || ''} ${n.abstract || ''}`.toLowerCase();
			if (!hay.includes(kw)) return false;
		}
		if (selectedTopics.length && !selectedTopics.includes(n.topic)) return false;
		if (selectedVenues.length && !selectedVenues.includes(n.venue)) return false;
		if (
			selectedInstitutions.length &&
			!(n.institutions || []).some((i) => selectedInstitutions.includes(i.trim()))
		)
			return false;
		if (selectedCountries.length && !(n.countries || []).some((c) => selectedCountries.includes(c.trim())))
			return false;
		return true;
	}

	let matchCount = $state(0);

	$effect(() => {
		if (!hasActiveFilters) {
			matchCount = nodes.length;
			onFilterChange?.(null);
			return;
		}
		const ids = nodes.filter(matches).map((n) => n.id);
		matchCount = ids.length;
		onFilterChange?.(ids);
	});

	function clearAll() {
		keyword = '';
		selectedTopics = [];
		selectedVenues = [];
		selectedInstitutions = [];
		selectedCountries = [];
	}
</script>

<div class="filter-panel">
	<div class="filter-header">
		<span>Explore the papers</span>
		{#if hasActiveFilters}
			<button type="button" class="clear" onclick={clearAll}>Clear ({matchCount} matching)</button>
		{/if}
	</div>

	<input class="keyword" type="text" placeholder="Search titles, authors, abstracts…" bind:value={keyword} />

	<div class="facets">
		<FacetSelect label="Topic" options={topicOptions} bind:selected={selectedTopics} placeholder="e.g. Minimal Surfaces" />
		<FacetSelect label="Journal / venue" options={venueOptions} bind:selected={selectedVenues} placeholder="e.g. Nature" />
		<FacetSelect label="Institution" options={institutionOptions} bind:selected={selectedInstitutions} placeholder="e.g. MIT" />
		<FacetSelect label="Country" options={countryOptions} bind:selected={selectedCountries} placeholder="e.g. US" />
	</div>
</div>

<style>
	.filter-panel {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
		background: var(--surface-2);
		border: 1px solid color-mix(in srgb, var(--text-primary) 12%, transparent);
		border-radius: 10px;
		padding: 1.1rem 1.25rem;
		margin-bottom: 1.5rem;
	}
	.filter-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 0.8rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--text-secondary);
	}
	.clear {
		background: none;
		border: none;
		color: var(--accent);
		font-size: 0.76rem;
		font-weight: 600;
		text-transform: none;
		letter-spacing: normal;
		cursor: pointer;
		padding: 0;
	}
	.clear:hover {
		text-decoration: underline;
	}
	.keyword {
		width: 100%;
		box-sizing: border-box;
		background: var(--surface-1);
		color: var(--text-primary);
		border: 1px solid color-mix(in srgb, var(--text-primary) 16%, transparent);
		border-radius: 6px;
		padding: 0.5rem 0.7rem;
		font-size: 0.9rem;
	}
	.keyword:focus {
		outline: none;
		border-color: var(--accent);
	}
	.facets {
		display: grid;
		grid-template-columns: 1fr;
		gap: 0.85rem;
	}
</style>
