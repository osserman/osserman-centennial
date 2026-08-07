<script>
	// One narrative text block inside <Scrolly>. Registers itself with the
	// parent's IntersectionObserver via context; unregisters on destroy.
	import { getContext } from 'svelte';

	let { index, active = false, children } = $props();

	const { registerStep } = getContext('scrolly');

	function register(node) {
		return registerStep(node, index);
	}
</script>

<div class="scrolly-step" class:active use:register>
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
