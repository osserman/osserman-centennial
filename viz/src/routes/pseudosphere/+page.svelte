<script>
	// An aside off the non-Euclidean stanza, not part of its scroll flow. Linked
	// from the negative-curvature slide for readers who want the surface behind
	// the saddle; the narrative stands without it.
	import { base } from '$app/paths';
	import PseudosphereScene from '$lib/components/PseudosphereScene.svelte';
</script>

<svelte:head>
	<title>The Pseudosphere — an aside</title>
	<meta
		name="description"
		content="The surface the saddle is a piece of: a pseudosphere, where two principal curvatures vary wildly while their product never moves."
	/>
</svelte:head>

<article class="aside-page">
	<header>
		<a class="back" href="{base}/non-euclidean-geometry">← Non-Euclidean Geometry</a>
		<p class="kicker">An aside</p>
		<h1>The Surface That Saddle Sits On</h1>
		<p class="lede">
			The saddle at the end of the last section wasn't a shape chosen to look like negative
			curvature. It was a piece of a specific surface — and here is the rest of it.
		</p>
	</header>

	<div class="stage">
		<PseudosphereScene />
	</div>

	<section class="notes">
		<h2>What changes, and what doesn't</h2>
		<p>
			This horn is a <strong>pseudosphere</strong>. Every point on it has the same Gaussian
			curvature, <strong>−0.49</strong> — the exact value the saddle was built with.
		</p>
		<p>
			Move the point and watch the two readouts. Near the wide rim the blue curve bends hard while
			the orange one is nearly flat; near the narrow end they trade places, and the orange ring
			becomes the tightly curved one. Across the range you can reach, each number changes by more
			than a factor of twelve. <strong>Their product never moves.</strong>
		</p>
		<p>
			That is what constant negative curvature means, and it is why the saddle earlier was a fair
			picture of it. That saddle sits at the one ring where the two magnitudes happen to be equal,
			at 0.70 and −0.70. It is not a special place on the surface — it just looks tidiest there.
		</p>

		<h2>Why it stops</h2>
		<p>
			The surface is cut off at both ends, and not for convenience. Toward the wide end one
			curvature runs away to infinity; toward the narrow end the surface itself spikes off to
			infinity. There is no way to continue it past either.
		</p>
		<p>
			This is the concrete version of a claim the main narrative makes in passing. The Poincaré disk
			maps a hyperbolic plane that is negatively curved <em>everywhere and forever</em>. A
			pseudosphere manages constant negative curvature over a patch, and then runs out. Hilbert
			proved in 1901 that this is unavoidable: no complete surface of constant negative curvature
			can sit in ordinary three-dimensional space at all.
		</p>
		<p>
			So the disk is not a picture of a horn you could build. It is a map of something that has no
			model in the space we live in — which is precisely why it had to be drawn as a map.
		</p>

		<p class="return"><a href="{base}/non-euclidean-geometry">← Back to the narrative</a></p>
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
