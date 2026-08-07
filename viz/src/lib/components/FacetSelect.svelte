<script>
	// One searchable multi-select facet (type to filter, click to add a chip).
	// Used for topic/venue/institution/country in FilterPanel — flat checkbox
	// lists don't work at 100+ distinct values per facet.
	let { label, options = [], selected = $bindable([]), placeholder = 'Search…' } = $props();

	let query = $state('');
	let open = $state(false);

	let matches = $derived(
		query.trim()
			? options
					.filter((o) => o.toLowerCase().includes(query.trim().toLowerCase()) && !selected.includes(o))
					.slice(0, 8)
			: []
	);

	function add(o) {
		selected = [...selected, o];
		query = '';
	}
	function remove(o) {
		selected = selected.filter((s) => s !== o);
	}
</script>

<div class="facet">
	<div class="facet-label">{label}</div>
	{#if selected.length}
		<div class="chips">
			{#each selected as s (s)}
				<span class="chip">
					{s}
					<button type="button" onclick={() => remove(s)} aria-label="Remove {s}">&times;</button>
				</span>
			{/each}
		</div>
	{/if}
	<div class="input-wrap">
		<input
			type="text"
			{placeholder}
			bind:value={query}
			onfocus={() => (open = true)}
			onblur={() => setTimeout(() => (open = false), 150)}
		/>
		{#if open && matches.length}
			<ul class="dropdown">
				{#each matches as m (m)}
					<li>
						<button type="button" onclick={() => add(m)}>{m}</button>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>

<style>
	.facet {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}
	.facet-label {
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: var(--text-muted);
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem;
	}
	.chip {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		background: var(--accent);
		color: var(--surface-1);
		border-radius: 999px;
		padding: 0.2rem 0.5rem 0.2rem 0.65rem;
		font-size: 0.76rem;
	}
	.chip button {
		background: none;
		border: none;
		color: inherit;
		font-size: 0.9rem;
		line-height: 1;
		cursor: pointer;
		padding: 0;
		opacity: 0.85;
	}
	.chip button:hover {
		opacity: 1;
	}
	.input-wrap {
		position: relative;
	}
	input {
		width: 100%;
		box-sizing: border-box;
		background: var(--surface-1);
		color: var(--text-primary);
		border: 1px solid color-mix(in srgb, var(--text-primary) 16%, transparent);
		border-radius: 6px;
		padding: 0.4rem 0.6rem;
		font-size: 0.85rem;
	}
	input:focus {
		outline: none;
		border-color: var(--accent);
	}
	.dropdown {
		position: absolute;
		top: calc(100% + 4px);
		left: 0;
		right: 0;
		z-index: 25;
		background: var(--surface-1);
		border: 1px solid color-mix(in srgb, var(--text-primary) 16%, transparent);
		border-radius: 6px;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
		max-height: 12rem;
		overflow-y: auto;
		margin: 0;
		padding: 0.25rem;
		list-style: none;
	}
	.dropdown li button {
		display: block;
		width: 100%;
		text-align: left;
		background: none;
		border: none;
		color: var(--text-primary);
		font-size: 0.82rem;
		padding: 0.35rem 0.5rem;
		border-radius: 4px;
		cursor: pointer;
	}
	.dropdown li button:hover {
		background: var(--surface-2);
	}
</style>
