<script>
	// Shown in place of a stanza on viewports too small for it -- see
	// +layout.svelte, which decides when to render this instead of the route
	// itself. Purely presentational; the breakpoint logic lives there so the
	// gated routes' scenes never mount at all on a phone (three.js contexts,
	// scroll listeners and all), rather than running invisibly behind a cover.
	//
	// Points at the two routes that are just prose and do work at any width,
	// so a phone reader isn't left at a dead end.
	import { base } from '$app/paths';
</script>

<main class="gate">
	<div class="card">
		<p class="kicker">Small screen</p>
		<h1>This one needs a bigger window</h1>
		<p>
			This piece is still a prototype, and its stanzas don't yet support mobile viewing — they lean
			on a side-by-side layout, and on visuals that respond to scrolling and dragging in ways that
			don't translate to a touch screen yet.
		</p>
		<p>Please visit on a tablet, or in a wider browser window.</p>
		<nav class="gate-links" aria-label="Pages that work at this size">
			<a href="{base}/">Read the introduction</a>
			<a href="{base}/coda">Read the coda</a>
		</nav>
	</div>
</main>

<style>
	.gate {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem 1.5rem;
		box-sizing: border-box;
		background: var(--surface-1);
	}
	.card {
		max-width: 26rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.kicker {
		margin: 0;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--accent);
	}
	h1 {
		margin: 0;
		font-size: 1.6rem;
		font-weight: 700;
		line-height: 1.2;
		letter-spacing: -0.01em;
		color: var(--text-primary);
	}
	p {
		margin: 0;
		font-size: 1rem;
		line-height: 1.6;
		color: var(--text-secondary);
	}
	.gate-links {
		margin-top: 0.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}
	.gate-links a {
		display: block;
		padding: 0.75rem 0.9rem;
		border: 1px solid var(--surface-2);
		border-radius: 8px;
		background: var(--surface-2);
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--text-primary);
		text-decoration: none;
	}
</style>
