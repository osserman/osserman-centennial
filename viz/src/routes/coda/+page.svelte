<script>
	// The piece's closing note — same hand-written-essay shape as the front
	// door (viz/src/routes/+page.svelte): no scene, no scrollytelling, just
	// prose. A StanzaNav at the end (current="coda", no `next`) for the
	// subtle Intro/I/II/III/Coda row — there's nowhere further to point.
	import StanzaNav from '$lib/components/StanzaNav.svelte';
</script>

<svelte:head>
	<title>Coda</title>
</svelte:head>

<main class="page">
	<article class="essay">
		<h1>Coda</h1>

		<p>
			In 2011, the same year my father died, Mike Bostock — a CS graduate student at Stanford and
			soon-to-be graphics editor at the New York Times — released <strong><em>d3</em></strong>, a
			JavaScript library that would transform how people told stories with data on the web. It was
			the first tool I learned on my journey into interactive web visualization, which would
			unexpectedly lead me to one of my father's passions:
			<strong>communicating complex concepts in ways that make them not just intuitive, but also enjoyable</strong>.
		</p>

		<p>
			The closing sentence of <em>Poetry of the Universe</em> speaks to the "dual nature of
			mathematics – its internal beauty and its power to reveal the hidden structure of the
			external world…" Much of our final stanza focused squarely on the latter — how the abstract
			math of minimal surfaces reverberates through the world beyond math.
		</p>

		<p>
			While my father's textbook may have aided in this spread, his own contributions to minimal
			surfaces research have mainly remained within the realm of theoretical math. In another 50 or
			100 years, external applications may blossom from them. But I don't think he would mind if
			they don't. <strong>He valued curiosity, delight in the elegance of a solution, and beauty of
				the language of math for their own sake.</strong>
		</p>

		<p>
			Much of my career is focused on the immediate utility of my work. I've relished this pause
			this project has offered: a chance to learn, to share, and to spend a bit more time in the
			mathematical world my father loved.
		</p>

		<StanzaNav current="coda" />
	</article>
</main>

<style>
	/* Same essay shape as the front door -- deliberately duplicated (not a
	   shared component) since it's the only other page with this shape, and
	   the front door's own comment already explains why this convention
	   doesn't reach for a data-driven body array here either. */
	.page {
		max-width: 48rem;
		margin: 0 auto;
		padding: 5rem 2rem 6rem;
		box-sizing: border-box;
	}
	.essay {
		display: flex;
		flex-direction: column;
		gap: 1.2rem;
	}
	h1 {
		margin: 0;
		font-size: 2.4rem;
		font-weight: 700;
		line-height: 1.15;
		letter-spacing: -0.01em;
		color: var(--text-primary);
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
	:global(.essay .stanza-nav) {
		margin-top: 1.5rem;
	}
</style>
