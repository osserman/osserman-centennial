<script>
	// A persistent way to jump between stanzas from anywhere in the piece --
	// mounted once in the root +layout.svelte, so it appears on every route
	// with no per-page wiring. Before this, the only way to move between
	// stanzas was scrolling all the way down to StanzaNav at the very end of
	// one, or an aside's single "back" link.
	//
	// Closed by default: the piece has no persistent chrome otherwise, and a
	// small corner icon (rather than an always-visible bar) keeps it that
	// way until a reader actually wants it. Same NAV_ITEMS list StanzaNav
	// uses, so this is never a second source of truth for what the piece's
	// main-sequence stops are.
	import { page } from '$app/state';
	import { base } from '$app/paths';
	import { NAV_ITEMS } from '$lib/navItems.js';

	let open = $state(false);

	// Trailing-slash-insensitive so '/non-euclidean-geometry/' (if it ever
	// arises) still matches. The root path is left alone -- stripping its
	// only '/' would make it empty, breaking the match instead of fixing it.
	function normalize(path) {
		return path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
	}

	const currentKey = $derived.by(() => {
		const here = normalize(page.url.pathname);
		return NAV_ITEMS.find((item) => item.path && normalize(`${base}${item.path}`) === here)?.key ?? null;
	});

	function close() {
		open = false;
	}

	function handleKeydown(evt) {
		if (open && evt.key === 'Escape') close();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<button
	class="nav-toggle"
	class:open
	aria-expanded={open}
	aria-label={open ? 'Close navigation' : 'Open navigation'}
	onclick={() => (open = !open)}
>
	{#if open}✕{:else}☰{/if}
</button>

{#if open}
	<!-- Transparent, not darkened -- this is a quick jump menu, not a modal
	     interrupting the piece; the backdrop exists only to catch an
	     outside click. -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="nav-backdrop" onclick={close} role="presentation"></div>
	<nav class="nav-menu" aria-label="Piece navigation">
		{#each NAV_ITEMS as item (item.key)}
			{#if item.key === currentKey}
				<span class="nav-current">{item.label}</span>
			{:else if item.path}
				<a href="{base}{item.path}" onclick={close}>{item.label}</a>
			{:else}
				<span class="nav-placeholder" title="Coming soon">{item.label}</span>
			{/if}
		{/each}
	</nav>
{/if}

<style>
	.nav-toggle {
		position: fixed;
		/* Kept small and close to the corner on purpose (see the file comment)
		   -- but every stanza's own sticky heading also pins flush to y:0, so
		   this and that heading's own top padding (bumped for this reason;
		   search "GlobalNav" in each stanza page) have to clear each other
		   between them. */
		top: 0.85rem;
		left: 0.85rem;
		z-index: 500;
		width: 2rem;
		height: 2rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 999px;
		border: 1px solid var(--surface-2);
		background: color-mix(in srgb, var(--surface-1) 90%, transparent);
		backdrop-filter: blur(6px);
		color: var(--text-primary);
		font-size: 1rem;
		line-height: 1;
		cursor: pointer;
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.14);
	}
	.nav-toggle:hover,
	.nav-toggle.open {
		border-color: var(--accent);
		color: var(--accent);
	}
	.nav-backdrop {
		position: fixed;
		inset: 0;
		z-index: 499;
	}
	.nav-menu {
		position: fixed;
		top: 3.6rem;
		left: 1rem;
		z-index: 500;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		min-width: 9rem;
		padding: 0.5rem;
		border-radius: 10px;
		border: 1px solid var(--surface-2);
		background: var(--surface-1);
		box-shadow: 0 10px 34px rgba(0, 0, 0, 0.2);
	}
	.nav-menu a,
	.nav-current,
	.nav-placeholder {
		padding: 0.4rem 0.6rem;
		border-radius: 6px;
		font-size: 0.82rem;
		font-weight: 600;
		letter-spacing: 0.02em;
	}
	.nav-menu a {
		color: var(--text-primary);
		text-decoration: none;
	}
	.nav-menu a:hover {
		background: var(--surface-2);
		color: var(--accent);
	}
	.nav-current {
		color: var(--accent);
		background: var(--surface-2);
	}
	.nav-placeholder {
		color: var(--text-muted);
		opacity: 0.6;
		cursor: default;
	}
</style>
