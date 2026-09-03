<script>
	// Aside off the non-Euclidean stanza. It used to be the closing beat of the
	// azimuthal sequence; the narrative now ends on the parallel postulate
	// instead, which is the argument it had been building toward all along.
	import CircleLimitScene from '$lib/components/CircleLimitScene.svelte';
</script>

<svelte:head>
	<title>Circle Limit — an aside</title>
	<meta
		name="description"
		content="The hyperbolic tiling underneath Escher's Circle Limit prints, drawn from true geodesics on the Poincaré disk."
	/>
</svelte:head>

<article class="aside-page">
	<header>
		<a class="back" href="/non-euclidean-geometry">← Non-Euclidean Geometry</a>
		<p class="kicker">An aside</p>
		<h1>The Grid Under Circle Limit</h1>
		<p class="lede">
			Escher's <em>Circle Limit</em> prints are the best-known pictures of the Poincaré disk. Under
			the fish is a tiling — and it is built from exactly the lines the last section drew.
		</p>
	</header>

	<div class="stage">
		<CircleLimitScene />
	</div>

	<section class="notes">
		<h2>What you're looking at</h2>
		<p>
			Every edge here is a geodesic segment: an arc meeting the boundary at a right angle, a
			straight line as far as anyone living in this space is concerned. The tiles are all the same
			size, for the same reason the circles in the last section were — the shrinking is the map's,
			not the world's.
		</p>
		<p>
			Drag the centre and the whole grid slides through itself without ever changing shape. That is
			the same move the narrative used to straighten a family of parallels, doing nothing more
			interesting here than showing that no tile is special and no place is the middle.
		</p>

		<h2>Escher's lines aren't straight</h2>
		<p>
			A detail worth the trip. The white spines running through the fish in <em>Circle Limit III</em
			> are not geodesics. Coxeter worked out that they meet the boundary at about 80°, not 90° —
			they are <strong>hypercycles</strong>, curves that hold a constant distance from a geodesic
			rather than being one.
		</p>
		<p>
			Escher believed he had drawn straight lines, and he had not. He had drawn something subtler,
			and arguably more beautiful, by eye. The tiling above — the one his fish are laid on — is
			built from the real thing.
		</p>
		<p class="caveat">
			The prints themselves are still in copyright, so they are not reproduced here. This is the
			construction underneath them, not the work.
		</p>

		<p class="return"><a href="/non-euclidean-geometry">← Back to the narrative</a></p>
	</section>
</article>

<style>
	.aside-page {
		max-width: 64rem;
		margin: 0 auto;
		padding: 3rem 1.5rem 5rem;
	}
	header {
		max-width: 40rem;
		margin-bottom: 2rem;
	}
	.back {
		font-size: 0.9rem;
		color: var(--text-secondary);
		text-decoration: none;
	}
	.back:hover {
		text-decoration: underline;
	}
	.kicker {
		margin: 1.5rem 0 0.25rem;
		font-size: 0.8rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--text-muted);
	}
	h1 {
		margin: 0 0 0.75rem;
		font-size: clamp(1.8rem, 4vw, 2.6rem);
		line-height: 1.15;
	}
	.lede {
		margin: 0;
		font-size: 1.1rem;
		line-height: 1.6;
		color: var(--text-secondary);
	}
	.stage {
		position: relative;
		height: min(78vh, 40rem);
		border-radius: 14px;
		overflow: hidden;
		background: var(--surface-1);
		border: 1px solid var(--surface-2);
	}
	.notes {
		max-width: 40rem;
		margin: 2.5rem 0 0;
	}
	.notes h2 {
		margin: 2rem 0 0.5rem;
		font-size: 1.15rem;
	}
	.notes h2:first-child {
		margin-top: 0;
	}
	.notes p {
		margin: 0 0 1rem;
		line-height: 1.65;
	}
	.caveat {
		font-size: 0.9rem;
		color: var(--text-secondary);
	}
	.return {
		margin-top: 2rem;
	}
	.return a {
		color: var(--accent);
	}
	@media (max-width: 700px) {
		.stage {
			height: 60vh;
		}
	}
</style>
