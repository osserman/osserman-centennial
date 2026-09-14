<script>
	// One narrative text block inside <Scrolly>. Registers itself with the
	// parent's IntersectionObserver via context; unregisters on destroy.
	import { getContext } from 'svelte';

	// `stepEl` is optional and bindable — most callers don't need the DOM node,
	// but a caller that wants to derive its own scroll progress through one
	// specific step (rather than just its boolean active/inactive state) needs
	// a ref to measure, same idea as every stanza page's own bound sticky-text
	// elements. See beyond-mathematics/+page.svelte's graph-reveal progress.
	let { index, active = false, stepEl = $bindable(), children } = $props();

	const { registerStep } = getContext('scrolly');

	function register(node) {
		return registerStep(node, index);
	}
</script>

<div class="scrolly-step" class:active bind:this={stepEl} use:register>
	{@render children()}
</div>

<style>
	.scrolly-step {
		min-height: 70vh;
		display: flex;
		align-items: center;
		padding: 2rem 0;
		opacity: 0.35;
		transition: opacity 0.35s ease;
	}
	.scrolly-step.active {
		opacity: 1;
	}
	.scrolly-step:first-child {
		min-height: 90vh;
	}
	.scrolly-step:last-child {
		min-height: 90vh;
	}
</style>
