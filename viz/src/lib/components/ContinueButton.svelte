<script>
	// A touch-only way out of a drag beat. While a scene is draggable its
	// canvas has to claim the touch gesture for itself (touch-action: none --
	// otherwise the browser steals a vertical drag to scroll the page), which
	// on a tablet leaves a reader with only the narrow text column to swipe.
	// This gives them the same fast-forward a mouse reader gets for free by
	// scrolling on: it calls the scene's existing skip-the-hold function, so
	// it lands exactly where grabbing a handle would have left them rather
	// than at a separately-maintained offset that could drift out of step.
	//
	// Coarse-pointer only, and measured after mount (matchMedia doesn't exist
	// during prerender). On a mouse/trackpad the hold is doing its job -- the
	// reader scrolls through it, wiggle and all -- and a visible skip control
	// would mostly invite skipping an interaction they can already reach.
	import { onMount } from 'svelte';

	let { visible = false, onclick, label = 'Continue ↓' } = $props();

	let coarsePointer = $state(false);
	onMount(() => {
		coarsePointer = window.matchMedia?.('(pointer: coarse)')?.matches ?? false;
	});
</script>

{#if visible && coarsePointer}
	<button type="button" class="continue" {onclick}>{label}</button>
{/if}

<style>
	.continue {
		/* No margin -- the panels this sits in are flex columns with their own
		   gap (see .intro-sticky in the stanza pages). */
		align-self: flex-start;
		padding: 0.7rem 1.1rem;
		border: 1px solid var(--accent);
		border-radius: 999px;
		background: var(--surface-1);
		font: inherit;
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--accent);
		cursor: pointer;
		/* The panel it sits in is sticky, and on a tablet the scene behind can
		   scroll under it -- an opaque pill keeps it legible either way. */
		box-shadow: 0 1px 6px rgba(0, 0, 0, 0.08);
	}
</style>
