<script>
	// Site home page — the essay from intro-text.md (the user's own draft,
	// kept at the repo root), plus card links into each stanza. This used to
	// be the citation-network page (now moved to /beyond-mathematics); this
	// is the first thing a reader sees.
	//
	// Hand-written markup rather than a data-driven `body` array + shared
	// renderInline (the convention every stanza page uses) — two of these
	// paragraphs need an <InfoTooltip> footnote marker embedded *inline*,
	// which a string-based {@html} renderer can't compose in. This page is
	// also a one-off (unlike the stanza pages, which repeat the same shape
	// across many slides), so the data-driven convention isn't buying
	// anything here anyway.
	import { base } from '$app/paths';
	import InfoTooltip from '$lib/components/InfoTooltip.svelte';

	// Cards without a built page yet render disabled with a "coming soon"
	// treatment (matching VisualPlaceholder's own wording elsewhere) rather
	// than a dead link or an omitted card — the reader can see the full
	// shape of the project even before every stanza exists.
	const cards = [
		{
			kicker: 'Stanza I',
			title: 'Imagination, Reality, and Hyperbolic Geometry',
			href: `${base}/non-euclidean-geometry`
		},
		{
			kicker: 'Stanza II',
			title: 'Minimal Surfaces, the Elegant Math of Soap Bubbles',
			href: `${base}/minimal-surfaces`
		},
		{
			kicker: 'Stanza III',
			title: 'Beyond Mathematics: The Expansion of Minimal Surfaces Beyond Mathematics',
			href: `${base}/beyond-mathematics`
		},
		{ kicker: 'Coda', title: 'Coda', href: null }
	];
</script>

<svelte:head>
	<title>Robert Osserman -- 100 Years</title>
</svelte:head>

<main class="page">
	<article class="essay">
		<p class="kicker">A mathematical ode to my father</p>
		<h1>A Mathematical Ode to My Father</h1>
		<p class="byline">Written for the centennial of Robert Osserman</p>

		<p>
			My father was a mathematician and a teacher. His most visible legacy is the book <em>Poetry of
				the Universe</em>, a Mathematical Exploration of the Cosmos. On the surface, it helps readers
			build an intuition for the curvature of space.<InfoTooltip
				superscript
				symbol="1"
				label="Footnote 1"
				message="While evidence has since mounted against the curvature of space, the book paints a concrete picture of what scientists mean by that when they try to determine the shape of the universe."
			/>
		</p>

		<p>
			Beneath the surface, it illuminates the interplay between imagination, creativity, observation,
			and measurement in the centuries-long evolution of scientific knowledge.
			<strong>Theoretical math connects</strong> here <strong>not just to applications</strong> it eventually
			enables, <strong>but also to poetry</strong> -- to the ability to theorize about what lies beyond
			what we can touch and observe.
		</p>

		<p>
			He teaches these themes in the book alongside the geometry of curved surfaces. This geometry's
			relevance extends far beyond the possible shape of the universe. It is also foundational to the
			field of math he dedicated his career to: <strong>minimal surfaces</strong>.
			<strong>He chose this field not because it was seen as useful or applicable</strong>, or even
			fashionable within Math, but <strong>because he found it beautiful and elegant</strong>, and
			because it required creativity and allowed for playfulness.<InfoTooltip
				superscript
				symbol="2"
				label="Footnote 2"
				message={'A search for "minimal surfaces" will quickly bring up soap bubbles, which I fondly remember my dad playing with for us, as he brought his work home.'}
			/>
		</p>

		<p>
			I do not have the depth of mathematical knowledge to understand the field and his research. But
			as I've tried to understand a little more about the problems he pondered, I felt more connected
			to him and the delight he took in intellectual and creative pursuits. It has also led me to a
			story that echoes those I loved reading in <em>Poetry of the Universe</em>. The story of how his
			own field, developed by a community of researchers across a centuries-long dialogue of theory and
			observation, has now made a leap to a fascinating and growing range of fields in science and
			engineering that never could have been anticipated.
		</p>

		<p class="lead-in">Here is that story.</p>
	</article>

	<div class="cards">
		{#each cards as card}
			{#if card.href}
				<a class="card" href={card.href}>
					<p class="card-kicker">{card.kicker}</p>
					<p class="card-title">{card.title}</p>
				</a>
			{:else}
				<div class="card card-disabled">
					<p class="card-kicker">{card.kicker}</p>
					<p class="card-title">{card.title}</p>
					<p class="card-soon">Coming soon</p>
				</div>
			{/if}
		{/each}
	</div>
</main>

<style>
	.page {
		max-width: 42rem;
		margin: 0 auto;
		padding: 5rem 2rem 6rem;
		box-sizing: border-box;
	}
	.essay {
		display: flex;
		flex-direction: column;
		gap: 1.2rem;
	}
	.kicker {
		margin: 0;
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--accent);
	}
	h1 {
		margin: 0;
		font-size: 2.4rem;
		font-weight: 700;
		line-height: 1.15;
		letter-spacing: -0.01em;
		color: var(--text-primary);
	}
	.byline {
		margin: -0.6rem 0 0.6rem;
		font-size: 1rem;
		font-style: italic;
		color: var(--text-muted);
	}
	.essay p {
		margin: 0;
		font-size: 1.08rem;
		line-height: 1.65;
		color: var(--text-secondary);
	}
	.essay em {
		color: var(--text-primary);
	}
	.essay strong {
		color: var(--text-primary);
		font-weight: 700;
	}
	.lead-in {
		margin-top: 0.6rem;
		font-weight: 700;
		color: var(--text-primary);
	}
	.cards {
		margin-top: 3rem;
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1rem;
	}
	.card {
		display: block;
		padding: 1.5rem;
		border: 1px solid var(--surface-2);
		border-radius: 12px;
		background: var(--surface-2);
		text-decoration: none;
		transition: border-color 0.15s ease;
	}
	.card:hover {
		border-color: var(--accent);
	}
	.card-kicker {
		margin: 0 0 0.4rem;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--accent);
	}
	.card-title {
		margin: 0;
		font-size: 1.05rem;
		font-weight: 600;
		line-height: 1.35;
		color: var(--text-primary);
	}
	.card-disabled {
		opacity: 0.55;
	}
	.card-soon {
		margin: 0.6rem 0 0;
		font-size: 0.72rem;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: var(--text-muted);
	}
	@media (max-width: 640px) {
		.cards {
			grid-template-columns: 1fr;
		}
	}
</style>
