<script>
	// A third kind of narrative space, distinct from the two the stanza pages
	// already use:
	//   - the sidebar: a title + one-line subtitle, sticky, paired to one scene
	//   - on-canvas captions: a sentence at a time, timed to an animation
	// An interstitial is neither. A few sentences of connective prose that
	// stand alone -- something to pause on, not glance at -- for beats that
	// need more room than a subtitle but describe no single frame of any
	// scene. Deliberately plain: no card, no border, no big display type. Just
	// a short rule to mark the pause and paragraphs set with room to read.
	//
	// This component only renders typography. WHERE it sits -- full-bleed
	// between two <main> sections, or confined to a scene's own text column
	// mid-sequence -- is the page's call, since that depends on layout details
	// (sticky scene panels, scroll pacing) this component has no business
	// knowing about. See non-euclidean-geometry/+page.svelte for both uses.
	let { body = [], kicker = '', standalone = true } = $props();

	// Same minimal convention as every stanza page's own renderInline.
	function renderInline(text) {
		return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>');
	}
</script>

<div class="interstitial" class:standalone>
	<div class="interstitial-inner">
		{#if kicker}
			<p class="interstitial-kicker">{kicker}</p>
		{/if}
		<span class="interstitial-rule" aria-hidden="true"></span>
		{#each body as para}
			<p>{@html renderInline(para)}</p>
		{/each}
	</div>
</div>

<style>
	.interstitial {
		width: 100%;
	}
	/* Standalone: a free-bleed pause between two sections, not paired to a
	   scene -- centred, with room above and below, but a fraction of a
	   cover-section's 100vh so it doesn't read as a chapter boundary. */
	.interstitial.standalone {
		display: flex;
		justify-content: center;
		padding: 4.5rem 2rem;
	}
	.interstitial.standalone .interstitial-inner {
		max-width: 30rem;
	}
	/* Embedded: fills whatever column it's placed in (a scene's own text
	   panel) with no extra centring -- see the mid-sequence use in
	   non-euclidean-geometry/+page.svelte. */
	.interstitial-rule {
		display: block;
		width: 2.25rem;
		height: 2px;
		background: var(--accent);
		opacity: 0.55;
		margin-bottom: 1.15rem;
	}
	.interstitial-kicker {
		margin: 0 0 0.6rem;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--text-muted);
	}
	.interstitial-inner p {
		margin: 0 0 1.05rem;
		font-size: 1.1rem;
		line-height: 1.7;
		color: var(--text-primary);
	}
	.interstitial-inner p:last-child {
		margin-bottom: 0;
	}
	.interstitial-inner :global(strong) {
		font-weight: 700;
	}
</style>
