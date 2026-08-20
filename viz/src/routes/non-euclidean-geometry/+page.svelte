<script>
	// Stanza I — Non-Euclidean Geometry. Same two-column scrollytelling
	// shell as /minimal-surfaces (cover intro, sticky text-panel +
	// scene-panel scrolly flow, cover outro). Most slides are still generic
	// text+VisualPlaceholder — only the ones with a real visual (currently
	// parallel-postulate) get their own branch, the same way minimal-surfaces
	// grew CatenoidScene/CatenaryUnrollScene/MeanCurvatureScene out of
	// VisualPlaceholder one slide at a time.
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { base } from '$app/paths';
	import Scrolly from '$lib/components/Scrolly.svelte';
	import ScrollyStep from '$lib/components/ScrollyStep.svelte';
	import VisualPlaceholder from '$lib/components/VisualPlaceholder.svelte';
	import ParallelPostulateScene from '$lib/components/ParallelPostulateScene.svelte';
	import SphereGeometryScene from '$lib/components/SphereGeometryScene.svelte';
	import StanzaNav from '$lib/components/StanzaNav.svelte';
	import { slides } from '$lib/content/nonEuclideanGeometry.js';

	// Camera debugging aid for SphereGeometryScene -- visit this page with
	// ?debug=sphere to get free-fly OrbitControls and an on-screen readout
	// of camera position/target, instead of editing the component to flip
	// a hardcoded flag every time. See that component's own `debug` prop.
	const debugSphere = $derived(page.url.searchParams.get('debug') === 'sphere');

	// Same split as minimal-surfaces: first/last slides are standalone
	// full-viewport cover screens (see .cover-section below), not part of
	// the two-column flow — everything in between shares the
	// text-panel/scene-panel layout. gauss-survey is a *third* kind: it has
	// no scene-panel visual yet, so rather than sitting in the two-column
	// flow next to an empty VisualPlaceholder, it gets the same full-bleed
	// cover-card treatment as the intro/outro (see the standalone
	// <section> for it below) -- which is why it's excluded from
	// scrollySlides and the two-column <main> is split around it.
	const introSlide = slides[0];
	const outroSlide = slides[slides.length - 1];
	const gaussSlide = slides.find((s) => s.id === 'gauss-survey');
	const imaginarySlide = slides.find((s) => s.id === 'imaginary-curvature');
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

	onMount(() => {
		updateParallelProgress();
		updateSphereProgress();
		window.addEventListener('scroll', updateParallelProgress, { passive: true });
		window.addEventListener('scroll', updateSphereProgress, { passive: true });
		window.addEventListener('resize', updateParallelProgress);
		window.addEventListener('resize', updateSphereProgress);
		return () => {
			window.removeEventListener('scroll', updateParallelProgress);
			window.removeEventListener('scroll', updateSphereProgress);
			window.removeEventListener('resize', updateParallelProgress);
			window.removeEventListener('resize', updateSphereProgress);
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
							<div class="trailing-spacer trailing-spacer-parallel"></div>
						</div>
					{:else if slide.id === 'sphere'}
						<!-- Same shape as parallel-postulate above. -->
						<div class="euler-flow">
							<div class="intro-spacer-lead"></div>
							<div class="intro-sticky" bind:this={sphereTextEl}>
								<h2>{slide.title}</h2>
								<p class="subtitle">{@html renderInline(slide.subtitle)}</p>
							</div>
							<div class="trailing-spacer trailing-spacer-sphere"></div>
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

<!-- gauss-survey has no scene-panel visual yet, so it's a standalone
     full-bleed card (same shape as the intro/outro screens) rather than
     sitting in the two-column flow above next to an empty
     VisualPlaceholder. Once it gets a real visual, move it back into
     scrollySlides above instead. -->
<section class="cover-section">
	<div class="cover-card">
		<h1>{gaussSlide.title}</h1>
		{#each gaussSlide.body as para}
			<p>{@html renderInline(para)}</p>
		{/each}
	</div>
</section>

<!-- imaginary-curvature also has no scene-panel visual, but (unlike
     gauss-survey) keeps the two-column shell for now since a visual is
     more clearly planned for it -- just without Scrolly/ScrollyStep,
     since there's only one slide here and nothing to switch between. -->
<main class="layout">
	<div class="text-panel">
		<div class="slide-text solo-slide">
			<h2>{imaginarySlide.title}</h2>
			{#each imaginarySlide.body as para}
				{#if para.startsWith('> ')}
					<blockquote>{@html renderInline(para.slice(2))}</blockquote>
				{:else}
					<p>{@html renderInline(para)}</p>
				{/if}
			{/each}
		</div>
	</div>
	<div class="scene-panel">
		<VisualPlaceholder label={imaginarySlide.visualLabel ?? ''} />
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
	.slide-text {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		width: 100%;
	}
	/* Same min-height/centering ScrollyStep normally provides -- needed
	   here since imaginary-curvature's block isn't wrapped in one (it's
	   alone, no Scrolly/active-index switching to do), but the sticky
	   .scene-panel alongside it still needs the text column to be at
	   least a viewport tall to hold properly while scrolling past. */
	.solo-slide {
		min-height: 90vh;
		display: flex;
		flex-direction: column;
		justify-content: center;
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
	   each slide, sized per slide against its own SPAN_VH (sphere's is
	   more than double parallel's, so needs proportionally more). */
	.trailing-spacer-parallel {
		height: 380vh;
	}
	.trailing-spacer-sphere {
		height: 720vh;
	}
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
