<script>
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}

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
