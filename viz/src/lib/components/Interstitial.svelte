<script>
	// A third kind of narrative space, distinct from the two the stanza pages
	// already use:
	//   - the sidebar: a title + one-line subtitle, sticky, paired to one scene
	//   - on-canvas captions: a sentence at a time, timed to an animation
	// An interstitial is neither. A few sentences of connective prose that
	// stand alone -- something to pause on, not glance at -- for beats that
	// need more room than a subtitle but describe no single frame of any
	// scene. Styled to match the stanza's own opening/closing cover cards
	// (see .cover-card in each stanza page) rather than invent a fourth look:
	// same border/radius/background, same centred text, no separate accent
	// device -- just a card you stop and read, the way the intro and outro
	// already ask you to.
	//
	// This component only renders typography. WHERE it sits -- full-bleed
	// between two <main> sections, or riding over a held scene mid-sequence --
	// is the page's call, since that depends on layout details (sticky scene
	// panels, scroll pacing) this component has no business knowing about. See
	// non-euclidean-geometry/+page.svelte for both uses.
	let { body = [], kicker = '', standalone = true } = $props();

	// Same minimal convention as every stanza page's own renderInline.
	function renderInline(text) {
		return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>');
	}
</script>

<div class="interstitial" class:standalone>
	<div class="interstitial-inner">
		{#if kicker}
			<p class="kicker">{kicker}</p>
		{/if}
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
	/* Same card as .cover-card in every stanza page: solid surface, no blur or
	   shadow needed since (unlike the old translucent version) it fully
	   occludes whatever's behind it -- including a held scene mid-sequence. */
	.interstitial-inner {
		max-width: 34rem;
		/* Centres the card in the embedded placement, where .interstitial is a
		   full-width block rather than a flex parent. */
		margin-inline: auto;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.1rem;
		text-align: center;
		padding: 3rem 2.75rem;
		border: 1px solid var(--surface-2);
		border-radius: 16px;
		background: var(--surface-2);
	}
	.kicker {
		margin: 0;
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--accent);
	}
	.interstitial-inner p {
		margin: 0;
		font-size: 1.05rem;
		line-height: 1.6;
		color: var(--text-secondary);
	}
	.interstitial-inner :global(strong) {
		font-weight: 700;
		color: var(--text-primary);
	}
</style>
