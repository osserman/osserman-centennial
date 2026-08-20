<script>
	// Shared nav block for the end of every stanza: an optional prominent
	// "next" link (omitted on the last stanza, which has nowhere forward to
	// point), plus a subtle Intro/Stanza I/II/III/Coda row with the current
	// page shown as plain text instead of a link. Coda has no page yet (see
	// the home page's own "Coming soon" card) so it renders as a
	// non-clickable placeholder here too, not a link. A real shared
	// component (not each page's own copy, unlike the
	// deliberately-duplicated scroll math elsewhere) since this is
	// genuinely the same markup+behavior repeated verbatim on every stanza,
	// with no page-specific quirks to diverge on.
	import { base } from '$app/paths';

	let { current, next = null } = $props(); // current: 'intro' | 'I' | 'II' | 'III'; next: { href, title } | { title, disabled: true } | null

	const ITEMS = [
		{ key: 'intro', label: 'Intro', href: `${base}/` },
		{ key: 'I', label: 'Stanza I', href: `${base}/non-euclidean-geometry` },
		{ key: 'II', label: 'Stanza II', href: `${base}/minimal-surfaces` },
		{ key: 'III', label: 'Stanza III', href: `${base}/beyond-mathematics` },
		{ key: 'coda', label: 'Coda', href: null }
	];
</script>

<div class="stanza-nav">
	{#if next?.disabled}
		<span class="next-link disabled" aria-disabled="true">
			<span class="next-kicker">Next</span>
			<span class="next-title">{next.title} — coming soon</span>
		</span>
	{:else if next}
		<a class="next-link" href={next.href}>
			<span class="next-kicker">Next</span>
			<span class="next-title">{next.title} →</span>
		</a>
	{/if}
	<nav class="subtle-nav" aria-label="Stanza navigation">
		{#each ITEMS as item (item.key)}
			{#if item.key === current}
				<span class="nav-current">{item.label}</span>
			{:else if item.href}
				<a href={item.href}>{item.label}</a>
			{:else}
				<span class="nav-placeholder" title="Coming soon">{item.label}</span>
			{/if}
		{/each}
	</nav>
</div>

<style>
	.stanza-nav {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.1rem;
		margin-top: 1rem;
	}
	.next-link {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.2rem;
		padding: 0.9rem 1.8rem;
		border-radius: 10px;
		background: var(--accent);
		text-decoration: none;
		transition:
			transform 0.15s ease,
			opacity 0.15s ease;
	}
	.next-link:hover {
		opacity: 0.9;
		transform: translateY(-1px);
	}
	.next-link.disabled {
		background: var(--surface-2);
		border: 1px dashed var(--text-muted);
		cursor: not-allowed;
	}
	.next-link.disabled .next-kicker {
		color: var(--text-muted);
	}
	.next-link.disabled .next-title {
		color: var(--text-muted);
	}
	.next-kicker {
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: color-mix(in srgb, white 75%, transparent);
	}
	.next-title {
		font-size: 1.05rem;
		font-weight: 700;
		color: white;
	}
	.subtle-nav {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.4rem 1rem;
	}
	.subtle-nav a,
	.nav-current {
		font-size: 0.78rem;
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}
	.subtle-nav a {
		color: var(--text-muted);
		text-decoration: none;
	}
	.subtle-nav a:hover {
		color: var(--accent);
	}
	.nav-current {
		color: var(--text-primary);
	}
	.nav-placeholder {
		color: var(--text-muted);
		opacity: 0.5;
		cursor: default;
	}
</style>
