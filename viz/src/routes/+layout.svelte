<script>
	import { onMount } from 'svelte';
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/state';
	import { base } from '$app/paths';
	import GlobalNav from '$lib/components/GlobalNav.svelte';
	import MobileGate from '$lib/components/MobileGate.svelte';

	let { children } = $props();

	// --- Small-viewport gate ---------------------------------------------
	// Every stanza is a two-column layout (sticky scene + scrolling text)
	// whose scenes are scroll-scrubbed, and several of them hand the reader
	// drag control of the same canvas the scroll is driving. Touch can't
	// separate those two gestures the way a wheel plus a pointer can, so
	// there's no small-screen translation short of rebuilding the scenes'
	// interaction model. Until that exists, narrow viewports get MobileGate
	// instead of a stanza that would misbehave under a thumb.
	//
	// Gating here (rather than per page) means the gated routes' scenes never
	// mount at all on a phone -- no three.js contexts, no scroll listeners --
	// and that any route added later is gated by default. Only the two
	// prose-only routes, which read fine at any width, are exempt.
	const EXEMPT_PATHS = ['/', '/coda'];
	// Floors, not a device test. 900px is where the stanza pages' own
	// `@media (max-width: 899px)` blocks would otherwise stack the two
	// columns -- a half-finished responsive path whose scenes don't actually
	// render -- so the gate takes over at exactly the width that layout stops
	// working. That also puts every tablet below iPad-landscape size into the
	// gate in portrait, which is the intent: turn it sideways and read it.
	// (Keep this in step with those media queries: allowed is >= 900, stacked
	// is <= 899, and neither should claim the same width.)
	//
	// The height floor catches phones turned landscape -- the largest pass
	// the width test at ~932 but have nowhere near the vertical room a sticky
	// scene plus its text needs.
	const MIN_WIDTH = 900;
	const MIN_HEIGHT = 480;

	let innerWidth = $state(0);
	let innerHeight = $state(0);
	// Both bindings read 0 until the browser mounts, and 0 would gate every
	// route during prerender -- so the gate stays off until there's a real
	// measurement. Desktop therefore renders the page directly with no flash;
	// a phone shows the route for a frame before the gate replaces it.
	let measured = $state(false);
	onMount(() => {
		measured = true;
	});

	function normalize(path) {
		return path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
	}

	const gated = $derived.by(() => {
		if (!measured) return false;
		const here = normalize(page.url.pathname);
		if (EXEMPT_PATHS.some((p) => normalize(`${base}${p}`) === here)) return false;
		return innerWidth < MIN_WIDTH || innerHeight < MIN_HEIGHT;
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<svelte:window bind:innerWidth bind:innerHeight />

{#if gated}
	<MobileGate />
{:else}
	<GlobalNav />
	{@render children()}
{/if}

<style>
	/* Shared across every chapter/route — extracted from the citation
	   page's own <style> block (the only page that existed when this was
	   written) so new chapters inherit the same surfaces/text/accent
	   variables instead of redefining them. */
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
		--swatch-aqua: #1baf7a;
		--swatch-yellow: #eda100;
		--swatch-violet: #4a3aa7;
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
			--swatch-aqua: #199e70;
			--swatch-yellow: #c98500;
			--swatch-violet: #9085e9;
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
		--swatch-aqua: #199e70;
		--swatch-yellow: #c98500;
		--swatch-violet: #9085e9;
	}
	:global(:root[data-theme='light']) {
		color-scheme: light;
		--surface-1: #fcfcfb;
		--surface-2: #f0efec;
		--text-primary: #0b0b0b;
		--text-secondary: #52514e;
		--text-muted: #898781;
		--accent: #2a78d6;
		--swatch-aqua: #1baf7a;
		--swatch-yellow: #eda100;
		--swatch-violet: #4a3aa7;
	}
</style>
