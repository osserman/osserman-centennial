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
	// Route ids (as in page.route.id), not hrefs: deliberately NOT built from
	// `base`. With the static adapter's relative paths, `base` is "." while
	// prerendering, so comparing `${base}${path}` against a pathname silently
	// never matches -- which matters because the legacy notice below is
	// decided at prerender time. Route ids carry no base at all.
	const EXEMPT_ROUTE_IDS = ['/', '/coda'];
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

	// Route-only half of the test, and the only half that survives without
	// JavaScript -- see the legacy notice below, which is rendered into the
	// prerendered HTML and shown by CSS alone.
	const isExempt = $derived(EXEMPT_ROUTE_IDS.includes(page.route.id ?? ''));

	const gated = $derived.by(() => {
		if (!measured) return false;
		if (isExempt) return false;
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

<!-- MobileGate's counterpart for a browser too old to run the bundle at all.
     It can't be a component rendered on a condition the way MobileGate is,
     because on those browsers no component ever renders: this has to be in
     the prerendered markup and shown by CSS alone. app.html's probe adds the
     .legacy-browser class (and its <noscript> covers scripting being off).
     `isExempt` is route-only, so it resolves during prerender too -- the
     intro and the coda stay readable, since both are plain prose that
     survives having no JavaScript. -->
{#if !isExempt}
	<div class="legacy-notice">
		<div class="legacy-card">
			<p class="legacy-kicker">Unsupported browser</p>
			<h1>This stanza needs a newer browser</h1>
			<p class="legacy-body">
				It's built on web features this browser doesn't support, so its visuals can't run here.
				You'll need Safari 16.4, Chrome 111, Edge 111, or Firefox 114 — or anything more recent.
			</p>
			<p class="legacy-body">The written pieces read fine here, though:</p>
			<a class="legacy-link" href="{base}/">Read the introduction</a>
			<a class="legacy-link" href="{base}/coda">Read the coda</a>
		</div>
	</div>
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
	/* Hidden unless app.html's probe flagged the document (or its <noscript>
	   overrode this with !important). Everything below sticks to CSS the
	   browsers this is FOR can actually render: no flex `gap` (Safari 14.1),
	   no `inset` (14.1), no `min()` (11.1) -- margins and explicit offsets
	   instead. Custom properties are fine: Safari 9.1. */
	.legacy-notice {
		display: none;
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 9999; /* over GlobalNav's 500, over everything */
		align-items: center;
		justify-content: center;
		padding: 2rem 1.5rem;
		box-sizing: border-box;
		background: var(--surface-1);
		overflow-y: auto;
	}
	:global(html.legacy-browser) .legacy-notice {
		display: flex;
	}
	.legacy-card {
		max-width: 30rem;
	}
	.legacy-kicker {
		margin: 0 0 0.5rem;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--accent);
	}
	.legacy-card h1 {
		margin: 0 0 1rem;
		font-size: 1.6rem;
		font-weight: 700;
		line-height: 1.2;
		color: var(--text-primary);
	}
	.legacy-body {
		margin: 0 0 1rem;
		font-size: 1rem;
		line-height: 1.6;
		color: var(--text-secondary);
	}
	.legacy-link {
		display: block;
		margin-top: 0.6rem;
		padding: 0.75rem 0.9rem;
		border: 1px solid var(--surface-2);
		border-radius: 8px;
		background: var(--surface-2);
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--text-primary);
		text-decoration: none;
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
