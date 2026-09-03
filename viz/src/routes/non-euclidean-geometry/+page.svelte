<script>
	// Stanza I — Non-Euclidean Geometry. Same two-column scrollytelling
	// shell as /minimal-surfaces (cover intro, sticky text-panel +
	// scene-panel scrolly flow, cover outro). Most slides are still generic
	// text-only — only the ones with a real visual (currently
	// parallel-postulate) get their own branch, the same way minimal-surfaces
	// grew CatenoidScene/CatenaryUnrollScene/MeanCurvatureScene out of
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { browser } from '$app/environment';
	import { base } from '$app/paths';
	import Scrolly from '$lib/components/Scrolly.svelte';
	import ScrollyStep from '$lib/components/ScrollyStep.svelte';
	import ParallelPostulateScene from '$lib/components/ParallelPostulateScene.svelte';
	import CurvatureExplorerScene from '$lib/components/CurvatureExplorerScene.svelte';
	import SphereGeometryScene from '$lib/components/SphereGeometryScene.svelte';
	import AzimuthalProjectionScene, {
		CAPTIONS as AZIMUTHAL_CAPTIONS,
		TOUR_END,
		DRAG_END,
		ESCHER_END
	} from '$lib/components/AzimuthalProjectionScene.svelte';
	import StanzaNav from '$lib/components/StanzaNav.svelte';
	import { slides } from '$lib/content/nonEuclideanGeometry.js';

	// Camera debugging aid for SphereGeometryScene/AzimuthalProjectionScene --
	// visit this page with ?debug=sphere or ?debug=azimuthal to get free-fly
	// OrbitControls and an on-screen readout of camera position/target,
	// instead of editing the component to flip a hardcoded flag every time.
	// See each component's own `debug` prop. `browser &&` short-circuits
	// before touching page.url.searchParams during prerendering (SvelteKit
	// disallows reading it then) -- debugSphere got away without this
	// before only because it happened to sit behind a branch SSR never
	// actually took (activeIndex starts on parallel-postulate, not sphere);
	// debugAzimuthal is read unconditionally (its scene isn't behind an
	// activeIndex branch at all), which is what surfaced this.
	const debugSphere = $derived(browser && page.url.searchParams.get('debug') === 'sphere');
	const debugAzimuthal = $derived(browser && page.url.searchParams.get('debug') === 'azimuthal');
	const debugCurvature = $derived(browser && page.url.searchParams.get('debug') === 'curvature');

	// Same split as minimal-surfaces: first/last slides are standalone
	// full-viewport cover screens (see .cover-section below), not part of
	// the two-column flow — everything in between shares the
	// text-panel/scene-panel layout.
	// azimuthal-projection is a *third* kind: it has a real scene-panel
	// visual, but it's the only slide in its own section (not sharing a
	// <Scrolly> with siblings the way parallel-postulate/sphere do), so it
	// gets its own dedicated <main> below with the same sticky-text +
	// trailing-spacer mechanism but no <Scrolly>/<ScrollyStep> wrapper --
	// negative-curvature below has the same shape.
	const introSlide = slides[0];
	const outroSlide = slides[slides.length - 1];
	const azimuthalSlide = slides.find((s) => s.id === 'azimuthal-projection');
	const curvatureSlide = slides.find((s) => s.id === 'negative-curvature');
	const scrollySlides = [slides.find((s) => s.id === 'parallel-postulate'), slides.find((s) => s.id === 'sphere')];

	let activeIndex = $state(0);
	const parallelIndex = scrollySlides.findIndex((s) => s.id === 'parallel-postulate');
	const sphereIndex = scrollySlides.findIndex((s) => s.id === 'sphere');

	// Minimal inline-markdown support, same convention as minimal-surfaces'
	// own renderInline — **bold** only, plus *italic* (used for book titles).
	function renderInline(text) {
		return text
			.replace(/\*\*(.+?)\*\*/g, '<strong class="stat">$1</strong>')
			.replace(/\*(.+?)\*/g, '<em>$1</em>');
	}

	// The opening epigraph is one plain string ('"quote" - attribution') --
	// split at the dash right after the closing quote mark so the quote and
	// its attribution can get their own distinct styling below, rather than
	// running together as one italic block.
	function splitQuote(text) {
		const m = text.match(/^(.*?")\s*-\s*(.+)$/s);
		return m ? { quote: m[1], attribution: m[2] } : { quote: text, attribution: '' };
	}

	// Arrival/settle scroll-progress pattern, same shape (and same caveats)
	// as minimal-surfaces' several copies of this — see that file's own
	// comments for the fuller rationale. Deliberately duplicated rather than
	// shared: this math has broken in subtle ways more than once over there,
	// and a shared helper is worth extracting only once both stanzas'
	// scroll-driven slides have settled, not preemptively.
	const STICKY_TOP_PX = 0;

	// Trailing-spacer sizing, derived rather than hand-tuned.
	//
	// The scene panel is `position: sticky; top: 0; height: 100vh`, so it
	// unsticks when its <main>'s bottom edge reaches 100vh from the viewport
	// top -- it starts scrolling away a FULL PANEL-HEIGHT before the trailing
	// spacer runs out. A spacer sized to the animation's span alone therefore
	// leaves zero pinned time at the end, and the last beat drifts off mid-
	// motion. Every spacer needs span + hold + one panel height.
	//
	// These were all hand-tuned before and all three came out under one
	// screen of hold (parallel 20vh, sphere 60vh, azimuthal 20vh), which is
	// what made the sphere's meridian growth scroll away before it finished.
	const PANEL_VH = 100; // must match .scene-panel's height below
	const HOLD_VH = 140; // a beat to rest on the finished frame
	// Slides whose interaction unlocks at the END of the scripted run need
	// materially more: the reader has to notice the handles and use them,
	// and every bit of that happens after progress hits 1.
	const DRAG_HOLD_VH = 260;
	const spacerVh = (spanVh, holdVh = HOLD_VH) => spanVh + holdVh + PANEL_VH;
	let parallelProgress = $state(0);
	let parallelTextEl = $state();
	// Tuned visually against the animation itself (most of this beat's
	// narration is on-canvas captions now, not scrolling prompts -- see
	// ParallelPostulateScene's CAPTIONS array -- so this no longer tracks
	// a left-panel prompt budget).
	const PARALLEL_SPAN_VH = 2.6;
	let parallelSettleScrollY = null;

	function PARALLEL_SPAN_PX() {
		return PARALLEL_SPAN_VH * window.innerHeight;
	}

	function updateParallelProgress() {
		if (!parallelTextEl) return;
		const rect = parallelTextEl.getBoundingClientRect();
		if (rect.top > STICKY_TOP_PX) {
			parallelProgress = 0;
			parallelSettleScrollY = null;
			return;
		}
		if (parallelSettleScrollY === null) parallelSettleScrollY = window.scrollY;
		const traveled = window.scrollY - parallelSettleScrollY;
		parallelProgress = Math.max(0, Math.min(1, traveled / PARALLEL_SPAN_PX()));
	}

	// Second, independent instance of the same arrival/settle pattern above,
	// driving SphereGeometryScene instead of ParallelPostulateScene.
	let sphereProgress = $state(0);
	let sphereTextEl = $state();
	const SPHERE_SPAN_VH = 5.6;
	let sphereSettleScrollY = null;

	function SPHERE_SPAN_PX() {
		return SPHERE_SPAN_VH * window.innerHeight;
	}

	function updateSphereProgress() {
		if (!sphereTextEl) return;
		const rect = sphereTextEl.getBoundingClientRect();
		if (rect.top > STICKY_TOP_PX) {
			sphereProgress = 0;
			sphereSettleScrollY = null;
			return;
		}
		if (sphereSettleScrollY === null) sphereSettleScrollY = window.scrollY;
		const traveled = window.scrollY - sphereSettleScrollY;
		sphereProgress = Math.max(0, Math.min(1, traveled / SPHERE_SPAN_PX()));
	}

	// Third, independent instance of the same arrival/settle pattern above,
	// driving AzimuthalProjectionScene, which runs one long scripted sequence
	// from a shaded globe through the gore peel and the stereographic morph to
	// Escher's Circle Limit tiling.
	let azimuthalProgress = $state(0);
	let azimuthalTextEl = $state();
	let azimuthalSettleScrollY = null;

	// Unlike the two scenes above, this one is NOT paced uniformly. Its stage
	// boundaries were tuned for choreography (the tour is a long slow rotation;
	// the peel is quick), while its captions vary from 51 to 389 characters --
	// so scroll-per-progress-unit and scroll-per-word disagree by about 9x. Flat
	// pacing either flashes the longest captions past unread or leaves the
	// shortest ones parked on screen for hundreds of vh.
	//
	// So each caption gets scroll of its own: a term for its text (reading time)
	// plus a term for its animation span (so a long dissolve is not rushed just
	// because it is captioned briefly), normalised to a fixed total page height.
	// Deriving this from CAPTIONS rather than hardcoding a table means editing
	// the narrative re-paces the scroll automatically.
	const AZIMUTHAL_TOTAL_VH = 2900;
	const VH_PER_CHAR = 1;
	const VH_PER_PROGRESS_UNIT = 300;
	// The drag beat is interactive: the reader has to notice the invitation and
	// act on it, which its 51 characters badly under-price.
	const DRAG_FLOOR_VH = 180;

	// Cumulative [progress, vh] breakpoints; scroll maps piecewise-linearly.
	const AZIMUTHAL_PACING = (() => {
		const weights = AZIMUTHAL_CAPTIONS.map(
			(c) => VH_PER_CHAR * c.text.length + VH_PER_PROGRESS_UNIT * (c.end - c.start)
		);
		const isDrag = AZIMUTHAL_CAPTIONS.map((c) => c.start === TOUR_END);
		const total = weights.reduce((a, b) => a + b, 0);
		let heights = weights.map((w) => (w / total) * AZIMUTHAL_TOTAL_VH);

		// Apply the drag floor in *final* vh, not to the raw weight -- raising a
		// weight before normalising just scales the increase back out again.
		// Whatever the floor adds is taken proportionally from the other beats so
		// the page keeps its budgeted total height.
		const dragIndex = isDrag.indexOf(true);
		if (dragIndex >= 0 && heights[dragIndex] < DRAG_FLOOR_VH) {
			const others = AZIMUTHAL_TOTAL_VH - heights[dragIndex];
			const shrink = (AZIMUTHAL_TOTAL_VH - DRAG_FLOOR_VH) / others;
			heights = heights.map((h, i) => (i === dragIndex ? DRAG_FLOOR_VH : h * shrink));
		}

		const stops = [{ progress: 0, vh: 0 }];
		let cum = 0;
		AZIMUTHAL_CAPTIONS.forEach((c, i) => {
			cum += heights[i];
			stops.push({ progress: c.end, vh: cum });
		});
		return stops;
	})();

	// Invert the table: scrolled distance -> progress.
	function azimuthalProgressAt(traveledVh) {
		const stops = AZIMUTHAL_PACING;
		if (traveledVh <= 0) return 0;
		const last = stops[stops.length - 1];
		if (traveledVh >= last.vh) return last.progress;
		let i = 1;
		while (i < stops.length - 1 && stops[i].vh < traveledVh) i++;
		const a = stops[i - 1];
		const b = stops[i];
		const t = b.vh === a.vh ? 0 : (traveledVh - a.vh) / (b.vh - a.vh);
		return a.progress + t * (b.progress - a.progress);
	}

	function updateAzimuthalProgress() {
		if (!azimuthalTextEl) return;
		const rect = azimuthalTextEl.getBoundingClientRect();
		if (rect.top > STICKY_TOP_PX) {
			azimuthalProgress = 0;
			azimuthalSettleScrollY = null;
			return;
		}
		if (azimuthalSettleScrollY === null) azimuthalSettleScrollY = window.scrollY;
		const traveled = window.scrollY - azimuthalSettleScrollY;
		const traveledVh = (traveled / window.innerHeight) * 100;
		azimuthalProgress = Math.max(0, Math.min(ESCHER_END, azimuthalProgressAt(traveledVh)));
	}

	// Fourth instance of the arrival/settle pattern above, driving
	// CurvatureExplorerScene. Uniform pacing (unlike the azimuthal scene's
	// caption-derived table) -- this scene's captions are close enough in
	// length that a flat span keeps reading density inside 3x on its own.
	let curvatureProgress = $state(0);
	let curvatureTextEl = $state();
	const CURVATURE_SPAN_VH = 10.0;
	let curvatureSettleScrollY = null;

	function CURVATURE_SPAN_PX() {
		return CURVATURE_SPAN_VH * window.innerHeight;
	}

	function updateCurvatureProgress() {
		if (!curvatureTextEl) return;
		const rect = curvatureTextEl.getBoundingClientRect();
		if (rect.top > STICKY_TOP_PX) {
			curvatureProgress = 0;
			curvatureSettleScrollY = null;
			return;
		}
		if (curvatureSettleScrollY === null) curvatureSettleScrollY = window.scrollY;
		const traveled = window.scrollY - curvatureSettleScrollY;
		curvatureProgress = Math.max(0, Math.min(1, traveled / CURVATURE_SPAN_PX()));
	}

	onMount(() => {
		updateParallelProgress();
		updateSphereProgress();
		updateAzimuthalProgress();
		updateCurvatureProgress();
		window.addEventListener('scroll', updateParallelProgress, { passive: true });
		window.addEventListener('scroll', updateSphereProgress, { passive: true });
		window.addEventListener('scroll', updateAzimuthalProgress, { passive: true });
		window.addEventListener('scroll', updateCurvatureProgress, { passive: true });
		window.addEventListener('resize', updateParallelProgress);
		window.addEventListener('resize', updateSphereProgress);
		window.addEventListener('resize', updateAzimuthalProgress);
		window.addEventListener('resize', updateCurvatureProgress);
		return () => {
			window.removeEventListener('scroll', updateParallelProgress);
			window.removeEventListener('scroll', updateSphereProgress);
			window.removeEventListener('scroll', updateAzimuthalProgress);
			window.removeEventListener('scroll', updateCurvatureProgress);
			window.removeEventListener('resize', updateParallelProgress);
			window.removeEventListener('resize', updateSphereProgress);
			window.removeEventListener('resize', updateAzimuthalProgress);
			window.removeEventListener('resize', updateCurvatureProgress);
		};
	});
</script>

<svelte:head>
	<title>Non-Euclidean Geometry</title>
</svelte:head>

<section class="cover-section">
	<div class="cover-card">
		<p class="kicker">Stanza I</p>
		<h1>{introSlide.title}</h1>
		{#each introSlide.body as para}
			{#if para.startsWith('> ')}
				{@const { quote, attribution } = splitQuote(para.slice(2))}
				<blockquote class="epigraph">
					<p>{@html renderInline(quote)}</p>
					{#if attribution}<footer>{@html renderInline(attribution)}</footer>{/if}
				</blockquote>
			{:else}
				<p>{@html renderInline(para)}</p>
			{/if}
		{/each}
		<div class="scroll-cue">Scroll to begin ↓</div>
	</div>
</section>

<main class="layout">
	<div class="text-panel">
		<Scrolly bind:active={activeIndex}>
			{#each scrollySlides as slide, i}
				<ScrollyStep index={i} active={i === activeIndex}>
					{#if slide.id === 'parallel-postulate'}
						<!-- Sticky title + subtitle, no scrolling stage prompts --
						     this whole scene's narration is on-canvas captions (see
						     ParallelPostulateScene's CAPTIONS array) now, so the left
						     panel just states the setup once and stays put while the
						     reader scrolls through the animation. -->
						<div class="euler-flow">
							<div class="intro-spacer-lead"></div>
							<div class="intro-sticky" bind:this={parallelTextEl}>
								<h2>{slide.title}</h2>
								<p class="subtitle">{@html renderInline(slide.subtitle)}</p>
							</div>
							<div class="trailing-spacer" style="height: {spacerVh(PARALLEL_SPAN_VH * 100, DRAG_HOLD_VH)}vh"></div>
						</div>
					{:else if slide.id === 'sphere'}
						<!-- Same shape as parallel-postulate above. -->
						<div class="euler-flow">
							<div class="intro-spacer-lead"></div>
							<div class="intro-sticky" bind:this={sphereTextEl}>
								<h2>{slide.title}</h2>
								<p class="subtitle">{@html renderInline(slide.subtitle)}</p>
							</div>
							<div class="trailing-spacer" style="height: {spacerVh(SPHERE_SPAN_VH * 100)}vh"></div>
						</div>
					{/if}
				</ScrollyStep>
			{/each}
		</Scrolly>
	</div>

	<div class="scene-panel">
		{#if activeIndex === parallelIndex}
			<ParallelPostulateScene progress={parallelProgress} dragEnabled={parallelProgress >= 1} />
		{:else if activeIndex === sphereIndex}
			<SphereGeometryScene progress={sphereProgress} debug={debugSphere} />
		{/if}
	</div>
</main>

<!-- azimuthal-projection: has a real scene-panel visual (AzimuthalProjectionScene),
     but is the only slide in its own section, so it gets its own dedicated
     sticky-text + trailing-spacer treatment directly rather than sharing
     the <Scrolly>/<ScrollyStep> machinery above with parallel-postulate/
     sphere (which exists specifically to arbitrate *between* multiple
     slides sharing one section) -- same reasoning negative-curvature below
     uses for skipping Scrolly entirely. -->
<main class="layout">
	<div class="text-panel">
		<div class="euler-flow">
			<div class="intro-spacer-lead"></div>
			<div class="intro-sticky" bind:this={azimuthalTextEl}>
				<h2>{azimuthalSlide.title}</h2>
				<p class="subtitle">{@html renderInline(azimuthalSlide.subtitle)}</p>
			</div>
			<div class="trailing-spacer" style="height: {spacerVh(AZIMUTHAL_TOTAL_VH)}vh"></div>
		</div>
	</div>
	<div class="scene-panel">
		<AzimuthalProjectionScene
			progress={azimuthalProgress}
			dragEnabled={azimuthalProgress >= TOUR_END && azimuthalProgress < DRAG_END}
			debug={debugAzimuthal}
		/>
	</div>
</main>

<!-- negative-curvature: same shape as azimuthal-projection above -- a real
     scene-panel visual, alone in its section, so it gets its own sticky-text
     + trailing-spacer treatment rather than <Scrolly>/<ScrollyStep>. -->
<main class="layout">
	<div class="text-panel">
		<div class="euler-flow">
			<div class="intro-spacer-lead"></div>
			<div class="intro-sticky" bind:this={curvatureTextEl}>
				<h2>{curvatureSlide.title}</h2>
				<p class="subtitle">{@html renderInline(curvatureSlide.subtitle)}</p>
			</div>
			<div class="trailing-spacer" style="height: {spacerVh(CURVATURE_SPAN_VH * 100)}vh"></div>
		</div>
	</div>
	<div class="scene-panel">
		<CurvatureExplorerScene progress={curvatureProgress} debug={debugCurvature} />
	</div>
</main>

<section class="cover-section">
	<div class="cover-card">
		<h1>{outroSlide.title}</h1>
		{#each outroSlide.body as para}
			<p>{@html renderInline(para)}</p>
		{/each}
		<StanzaNav current="I" next={{ href: `${base}/minimal-surfaces`, title: 'Stanza II — Minimal Surfaces' }} />
	</div>
</section>

<style>
	/* Shared by the intro and outro — both full-bleed centered cards
	   bookending the stanza, outside the two-column scrollytelling flow the
	   slides in between use. Same shape as minimal-surfaces' own
	   .cover-section/.cover-card — kept as a separate copy (not a shared
	   component) since each stanza page has ended up wanting its own small
	   overrides in practice. */
	.cover-section {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		box-sizing: border-box;
	}
	.cover-card {
		max-width: 34rem;
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
	.cover-card h1 {
		margin: 0;
		font-size: 2.2rem;
		font-weight: 700;
		line-height: 1.15;
		letter-spacing: -0.01em;
		color: var(--text-primary);
	}
	.cover-card p {
		margin: 0;
		font-size: 1.05rem;
		line-height: 1.6;
		color: var(--text-secondary);
	}
	.epigraph {
		position: relative;
		margin: 0.3rem 0;
		padding: 0.2rem 1.8rem;
	}
	.epigraph::before {
		content: '“';
		position: absolute;
		top: -1.6rem;
		left: -0.2rem;
		font-family: Georgia, 'Times New Roman', serif;
		font-size: 4.5rem;
		line-height: 1;
		color: var(--accent);
		opacity: 0.25;
	}
	.epigraph p {
		font-family: Georgia, 'Times New Roman', serif;
		font-size: 1.3rem;
		font-style: italic;
		line-height: 1.45;
		color: var(--text-primary);
	}
	.epigraph footer {
		margin-top: 0.6rem;
		font-size: 0.8rem;
		font-style: normal;
		letter-spacing: 0.03em;
		color: var(--text-muted);
	}
	.epigraph footer::before {
		content: '— ';
	}
	.scroll-cue {
		margin-top: 0.75rem;
		font-size: 0.8rem;
		letter-spacing: 0.04em;
		color: var(--text-muted);
	}
	.layout {
		display: flex;
		align-items: flex-start;
	}
	.text-panel {
		width: min(28vw, 24rem);
		flex-shrink: 0;
		padding: 0 2.5rem;
		border-right: 1px solid var(--surface-2);
	}
	h2 {
		font-size: 1.7rem;
		font-weight: 700;
		line-height: 1.2;
		letter-spacing: -0.01em;
		color: var(--text-primary);
		margin: 0;
	}
	p {
		font-size: 1.05rem;
		line-height: 1.6;
		color: var(--text-secondary);
		margin: 0;
	}
	.subtitle {
		color: var(--text-secondary);
	}
	blockquote {
		margin: 0;
		padding: 0.7rem 0.95rem;
		border-left: 3px solid var(--accent);
		background: var(--surface-2);
		border-radius: 0 6px 6px 0;
		font-size: 1.05rem;
		font-style: italic;
		color: var(--text-primary);
	}
	:global(.stat) {
		color: var(--accent);
		font-weight: 700;
		font-style: normal;
	}
	/* Same shape as minimal-surfaces' .euler-flow — a single wrapper so
	   ScrollyStep's own flex root sees one child, not several separately
	   flex-positioned siblings (see that file's comment on the same bug). */
	.euler-flow {
		display: flex;
		flex-direction: column;
		width: 100%;
	}
	.intro-spacer-lead {
		height: 15vh;
	}
	.intro-sticky {
		position: sticky;
		top: 0;
		z-index: 2;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		background: var(--surface-1);
		padding: 2rem 0 1.25rem;
		border-bottom: 1px solid var(--surface-2);
	}
	/* Slack after the sticky title+subtitle so the outer Scrolly (whose
	   trigger band sits at viewport center) doesn't move on to the next
	   slide before parallelProgress/sphereProgress can reach 1 — same
	   reasoning as minimal-surfaces' own trailing spacers. There are no
	   scrolling stage prompts anymore (both scenes carry their narration
	   as on-canvas captions instead — see each component's CAPTIONS
	   array), so this spacer is the *only* source of scroll height behind
	   each slide. Heights are set inline from spacerVh() in the script
	   above rather than here -- they have to stay tied to each slide's own
	   SPAN_VH and to .scene-panel's height, and a hardcoded number here
	   silently drifts out of step the moment either changes. */
	.scene-panel {
		flex: 1;
		min-width: 0;
		position: sticky;
		top: 0;
		height: 100vh;
	}
	@media (max-width: 900px) {
		.layout {
			flex-direction: column;
		}
		.text-panel {
			width: auto;
			border-right: none;
		}
		.scene-panel {
			position: relative;
			height: 60vh;
		}
	}
</style>
