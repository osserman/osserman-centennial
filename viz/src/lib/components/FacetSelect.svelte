<script>
	// One searchable multi-select facet (type to filter, click to add a chip).
	// Used for topic/venue/institution/country/type in FilterPanel — flat
	// checkbox lists don't work at 100+ distinct values per facet.
	//
	// `options` is [{value, count}], pre-sorted by count descending (most
	// frequent first) by the parent. With an empty query the dropdown shows
	// the most popular values — so there's something to browse before typing
	// anything, not just a search box that returns nothing until you already
	// know an exact value that exists in the data.
	import { onMount } from 'svelte';

	let { label, options = [], selected = $bindable([]), placeholder = 'Search…' } = $props();

	let query = $state('');
	let open = $state(false);
	let wrapEl;
	let dropdownStyle = $state('');

	let matches = $derived.by(() => {
		const pool = options.filter((o) => !selected.includes(o.value));
		const q = query.trim().toLowerCase();
		const filtered = q ? pool.filter((o) => o.value.toLowerCase().includes(q)) : pool;
		return filtered.slice(0, 8);
	});

	// The dropdown is `position: fixed`, computed here from the input's
	// actual screen position, rather than `position: absolute` off its
	// parent. The panel this lives in (FilterPanel's overlay) scrolls
	// (overflow-y: auto) once there are enough facets to overflow it, and a
	// scrolling ancestor clips any absolutely-positioned descendant that
	// extends past its bounds regardless of z-index — that clipping was
	// exactly the bug (the last facet's dropdown got cut off, only visible
	// by scrolling the whole panel). `position: fixed` escapes that
	// clipping entirely since none of the ancestors set transform/filter/
	// contain (which would otherwise create a containing block for it).
	const DROPDOWN_MAX_H = 192; // matches --dropdown-max-h below (12rem @ 16px root)

	function positionDropdown() {
		if (!wrapEl) return;
		const rect = wrapEl.getBoundingClientRect();
		const spaceBelow = window.innerHeight - rect.bottom;
		const spaceAbove = rect.top;
		const openUp = spaceBelow < DROPDOWN_MAX_H + 12 && spaceAbove > spaceBelow;
		dropdownStyle = openUp
			? `left:${rect.left}px; width:${rect.width}px; bottom:${window.innerHeight - rect.top + 4}px;`
			: `left:${rect.left}px; width:${rect.width}px; top:${rect.bottom + 4}px;`;
	}

	function handleFocus() {
		open = true;
		positionDropdown();
	}

	// A fixed-position dropdown doesn't move with the input if an ancestor
	// scrolls (there's no live link between them) — closing on scroll is
	// simpler and more robust than repositioning on every scroll event.
	onMount(() => {
		const closeOnScroll = () => {
			if (open) open = false;
		};
		window.addEventListener('scroll', closeOnScroll, true);
		window.addEventListener('resize', closeOnScroll);
		return () => {
			window.removeEventListener('scroll', closeOnScroll, true);
			window.removeEventListener('resize', closeOnScroll);
		};
	});

	function add(value) {
		selected = [...selected, value];
		query = '';
	}
	function remove(value) {
		selected = selected.filter((s) => s !== value);
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
	<div class="input-wrap" bind:this={wrapEl}>
		<input
			type="text"
			{placeholder}
			bind:value={query}
			onfocus={handleFocus}
			onblur={() => setTimeout(() => (open = false), 150)}
		/>
		{#if open && matches.length}
			<ul class="dropdown" style={dropdownStyle}>
				{#if !query.trim()}
					<li class="dropdown-hint">Most common</li>
				{/if}
				{#each matches as m (m.value)}
					<li>
						<button type="button" onclick={() => add(m.value)}>
							<span class="option-value" title={m.value}>{m.value}</span>
							<span class="option-count">{m.count}</span>
						</button>
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
		position: fixed;
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
	.dropdown-hint {
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: var(--text-muted);
		padding: 0.3rem 0.5rem 0.15rem;
	}
	.dropdown li button {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
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
	.option-value {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.option-count {
		flex-shrink: 0;
		color: var(--text-muted);
		font-size: 0.72rem;
	}
</style>
