<script>
	// Generic scroll-step tracker: a thin horizontal band at the viewport
	// center acts as the "trigger line" (via IntersectionObserver rootMargin,
	// not scroll-position math), and `active` is the index of whichever
	// <ScrollyStep> currently crosses it. No scrollytelling library — this is
	// the whole mechanic, per the project's "restrained interaction, not
	// library-driven effects" design note.
	import { setContext } from 'svelte';

	let { active = $bindable(0), children } = $props();

	/** @type {Map<Element, number>} */
	const indexByNode = new Map();
	let observer;

	function ensureObserver() {
		if (observer) return observer;
		observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						const idx = indexByNode.get(entry.target);
						if (idx !== undefined) active = idx;
					}
				}
			},
			{ rootMargin: '-45% 0px -45% 0px', threshold: 0 }
		);
		return observer;
	}

	function registerStep(node, index) {
		indexByNode.set(node, index);
		ensureObserver().observe(node);
		return () => {
			observer?.unobserve(node);
			indexByNode.delete(node);
		};
	}

	setContext('scrolly', { registerStep });
</script>

<div class="scrolly-root">
	{@render children()}
</div>

<style>
	.scrolly-root {
		position: relative;
	}
</style>
