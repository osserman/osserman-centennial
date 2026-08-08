<script>
	// Free-exploration filters: keyword search + 4 searchable multi-select
	// facets (topic/venue/institution/country). Reports the matching node-id
	// set up via onFilterChange(idsOrNull) — null means "no filters active,"
	// distinct from an empty-but-active result set, so the caller can tell
	// "show everything" from "nothing matched."
	import FacetSelect from './FacetSelect.svelte';

	let { nodes = [], onFilterChange, onClose } = $props();

	// [{value, count}], sorted most-frequent-first — FacetSelect shows this
	// order as "most common" when its search box is empty, so there's
	// something real to browse instead of a blind text box (a placeholder
	// like "e.g. Nature" is a bad hint if nothing in the actual dataset
	// matches it).
	function distinctWithCounts(getValues) {
		const counts = new Map();
		for (const n of nodes) {
			for (const v of getValues(n)) {
				const trimmed = (v || '').trim();
				if (trimmed) counts.set(trimmed, (counts.get(trimmed) || 0) + 1);
			}
		}
		return [...counts.entries()].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count);
	}

	const fieldOptions = distinctWithCounts((n) => [n.field]);
	const subfieldOptions = distinctWithCounts((n) => [n.subfield]);
	const topicOptions = distinctWithCounts((n) => [n.topic]);
	const venueOptions = distinctWithCounts((n) => [n.venue]);
	const institutionOptions = distinctWithCounts((n) => n.institutions || []);
	const countryOptions = distinctWithCounts((n) => n.countries || []);
	const typeOptions = distinctWithCounts((n) => [n.workType]);

	let keyword = $state('');
	let selectedFields = $state([]);
	let selectedSubfields = $state([]);
	let selectedTopics = $state([]);
	let selectedVenues = $state([]);
	let selectedInstitutions = $state([]);
	let selectedCountries = $state([]);
	let selectedTypes = $state([]);

	let hasActiveFilters = $derived(
		keyword.trim().length > 0 ||
			selectedFields.length > 0 ||
			selectedSubfields.length > 0 ||
			selectedTopics.length > 0 ||
			selectedVenues.length > 0 ||
			selectedInstitutions.length > 0 ||
			selectedCountries.length > 0 ||
			selectedTypes.length > 0
	);

	function matches(n) {
		if (keyword.trim()) {
			const kw = keyword.trim().toLowerCase();
			const hay = `${n.title || ''} ${n.authors || ''} ${n.abstract || ''}`.toLowerCase();
			if (!hay.includes(kw)) return false;
		}
		if (selectedFields.length && !selectedFields.includes(n.field)) return false;
		if (selectedSubfields.length && !selectedSubfields.includes(n.subfield)) return false;
		if (selectedTopics.length && !selectedTopics.includes(n.topic)) return false;
		if (selectedVenues.length && !selectedVenues.includes(n.venue)) return false;
		if (
			selectedInstitutions.length &&
			!(n.institutions || []).some((i) => selectedInstitutions.includes(i.trim()))
		)
			return false;
		if (selectedCountries.length && !(n.countries || []).some((c) => selectedCountries.includes(c.trim())))
			return false;
		if (selectedTypes.length && !selectedTypes.includes(n.workType)) return false;
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
		selectedFields = [];
		selectedSubfields = [];
		selectedTopics = [];
		selectedVenues = [];
		selectedInstitutions = [];
		selectedCountries = [];
		selectedTypes = [];
	}
</script>

<div class="filter-panel">
	<div class="filter-header">
		<span>Explore the papers</span>
		<div class="header-actions">
			{#if hasActiveFilters}
				<button type="button" class="clear" onclick={clearAll}>Clear ({matchCount} matching)</button>
			{/if}
			{#if onClose}
				<button type="button" class="close" onclick={onClose} aria-label="Close filters">&times;</button>
			{/if}
		</div>
	</div>

	<input class="keyword" type="text" placeholder="Search titles, authors, abstracts…" bind:value={keyword} />

	<div class="facets">
		<FacetSelect label="Field" options={fieldOptions} bind:selected={selectedFields} placeholder="e.g. Mathematics" />
		<FacetSelect label="Subfield" options={subfieldOptions} bind:selected={selectedSubfields} placeholder="e.g. Geometry and Topology" />
		<FacetSelect label="Topic" options={topicOptions} bind:selected={selectedTopics} placeholder="e.g. Geometric Analysis" />
		<FacetSelect label="Journal / venue" options={venueOptions} bind:selected={selectedVenues} placeholder="e.g. arXiv" />
		<FacetSelect label="Institution" options={institutionOptions} bind:selected={selectedInstitutions} placeholder="e.g. Stanford" />
		<FacetSelect label="Country" options={countryOptions} bind:selected={selectedCountries} placeholder="e.g. US" />
		<FacetSelect label="Type of work" options={typeOptions} bind:selected={selectedTypes} placeholder="e.g. article" />
	</div>
</div>

<style>
	.filter-panel {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
		background: var(--surface-1);
		border: 1px solid color-mix(in srgb, var(--text-primary) 14%, transparent);
		border-radius: 10px;
		padding: 1.1rem 1.25rem;
		box-shadow: 0 16px 40px rgba(0, 0, 0, 0.25);
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
	.header-actions {
		display: flex;
		align-items: center;
		gap: 0.75rem;
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
		white-space: nowrap;
	}
	.clear:hover {
		text-decoration: underline;
	}
	.close {
		background: none;
		border: none;
		color: var(--text-secondary);
		font-size: 1.2rem;
		line-height: 1;
		cursor: pointer;
		padding: 0;
	}
	.close:hover {
		color: var(--text-primary);
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
		grid-template-columns: 1fr 1fr;
		gap: 0.85rem 1rem;
	}
</style>
