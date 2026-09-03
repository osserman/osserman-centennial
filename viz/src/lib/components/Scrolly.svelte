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
	/** Steps currently crossing the trigger band. */
	const crossing = new Set();
	let observer;

	function ensureObserver() {
		if (observer) return observer;
		observer = new IntersectionObserver(
			(entries) => {
				// Track the whole set, then RECOMPUTE. An earlier version set
				// `active` directly from any entry that was intersecting and
				// ignored the ones that had left, which could strand it on a step
				// that was no longer under the band:
				//
				//   scroll down  -> sphere enters, active = sphere. Correct.
				//   nudge up     -> parallel re-enters, active = parallel.
				//   scroll down  -> parallel leaves, and that was ignored --
				//                   while sphere never fired again, because it had
				//                   never stopped intersecting.
				//
				// Nothing left could move `active`, so the outgoing scene stayed on
				// screen for good. It needed a scroll reversal near the boundary to
				// trigger, which is exactly what dragging the triangle produces.
				for (const entry of entries) {
					if (entry.isIntersecting) crossing.add(entry.target);
					else crossing.delete(entry.target);
				}
				// Between steps (nothing crossing), hold the last one rather than
				// blanking the panel.
				if (crossing.size === 0) return;
				// Decide from geometry, not from event order: whichever crossing
				// step actually contains the trigger line wins.
				const line = window.innerHeight / 2;
				let bestIdx = null;
				let bestDist = Infinity;
				for (const node of crossing) {
					const idx = indexByNode.get(node);
					if (idx === undefined) continue;
					const r = node.getBoundingClientRect();
					const dist =
						r.top <= line && r.bottom >= line
							? 0
							: Math.min(Math.abs(r.top - line), Math.abs(r.bottom - line));
					if (dist < bestDist || (dist === bestDist && bestIdx !== null && idx > bestIdx)) {
						bestDist = dist;
						bestIdx = idx;
					}
				}
				if (bestIdx !== null) active = bestIdx;
			},
			{ rootMargin: '-45% 0px -45% 0px', threshold: 0 }
		);
		return observer;
	}

	function registerStep(node, index) {
		indexByNode.set(node, index);
		ensureObserver().observe(node);
		// Svelte actions take { destroy }, not a bare function — returning one
		// meant this never ran and nodes were never unobserved.
		return {
			destroy() {
				observer?.unobserve(node);
				indexByNode.delete(node);
				crossing.delete(node);
			}
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
