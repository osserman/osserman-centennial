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
		ZOOM_END,
		DISC_END,
		RECENTRE_END
	} from '$lib/components/AzimuthalProjectionScene.svelte';
	import StanzaNav from '$lib/components/StanzaNav.svelte';
	import Interstitial from '$lib/components/Interstitial.svelte';
	import { slides, interstitials } from '$lib/content/nonEuclideanGeometry.js';

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
	const discSlide = slides.find((s) => s.id === 'a-different-kind-of-map');
	const curvatureSlide = slides.find((s) => s.id === 'negative-curvature');
	const interstitialStraight = interstitials.find((s) => s.id === 'straight-in-curved-geometry');
	const interstitialImaginary = interstitials.find((s) => s.id === 'imaginary-geometry');
	const interstitialCurvature = interstitials.find((s) => s.id === 'curvature-is-measurable');
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
	// Raised from 2.6. At that span the opening caption got 20vh per 100
	// characters -- against 95-353 across the azimuthal stanza and 80-235 in the
	// curvature explorer. It was the tightest text in the piece by a factor of
	// four, and splitting the opening in two would have made it worse. The
	// trailing spacer is derived from this, so it follows automatically.
	const PARALLEL_SPAN_VH = 5.5;
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

	// Handover between the two scenes that share one panel. This is a
	// CROSSFADE, not a switch: activeIndex flips at the trigger line, which is
	// the right moment for the text highlight but makes the visual cut over in
	// a single frame while the incoming text is still halfway up the screen.
	//
	// Tied to the sphere heading's own arrival rather than to the step boundary,
	// so the sphere really does come in with its text: 0 while that heading is
	// still low on screen, 1 exactly as it reaches its sticky position and
	// sphereProgress starts running.
	let sceneHandover = $state(0);
	const HANDOVER_START_FRAC = 0.8; // viewport fraction where the crossfade begins

	function updateSceneHandover() {
		if (!sphereTextEl) return;
		const top = sphereTextEl.getBoundingClientRect().top;
		const from = window.innerHeight * HANDOVER_START_FRAC;
		sceneHandover = Math.max(0, Math.min(1, (from - top) / (from - STICKY_TOP_PX)));
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

	// AzimuthalProjectionScene renders as a pure function of its `progress`
	// prop, so it is mounted TWICE. Instance A runs 0..ZOOM_END (globe -> gore
	// peel -> flat map -> stereographic zoom-out) in the first <main>; instance
	// B runs DISC_END..RECENTRE_END (the Poincare disc and the parallel-
	// postulate beat) in a second <main>. The ZOOM_END..DISC_END morph between
	// them is deliberately dropped -- the map fades out behind the interstitial
	// that sits between the two sections instead of compressing into the disc.
	// Each instance gets its own copy of the arrival/settle pattern above.
	let azimuthalProgress = $state(0);
	let azimuthalTextEl = $state();
	let azimuthalSettleScrollY = null;

	let discProgress = $state(DISC_END);
	let discTextEl = $state();
	let discSettleScrollY = null;

	// Opacity of instance A's panel. Driven down as the interstitial that
	// follows it (inside the same <main>) scrolls off the top, so the finished
	// flat map holds behind the interstitial and then fades as the reader
	// clears it -- rather than the disc cutting in over a live map.
	let mapFade = $state(1);
	let interludeEl = $state();

	// Neither instance is paced uniformly. The stage boundaries were tuned for
	// choreography (the tour is a long slow rotation; the peel is quick), while
	// the captions vary from ~20 to ~390 characters -- so scroll-per-progress
	// and scroll-per-word disagree by ~9x. Flat pacing either flashes the long
	// captions past unread or parks the short ones for hundreds of vh.
	//
	// So each caption gets its own scroll: a reading-time term (text length) +
	// an animation-span term, then FLOORED so even a very short caption gets
	// enough scroll to be noticed, then normalised to a fixed total. Deriving
	// this from CAPTIONS means editing the narrative re-paces the scroll.
	const VH_PER_CHAR = 1;
	const VH_PER_PROGRESS_UNIT = 300;
	// No caption gets less than this, however short its text. Below roughly a
	// screen and a bit, a brief caption flicks past between two scroll notches
	// before it registers. Applied in FINAL vh (after normalising), like the
	// drag floor, so it isn't just scaled straight back out.
	const MIN_CAPTION_VH = 120;
	// The drag beat is interactive: the reader has to notice the invitation and
	// act on it, which its ~40 characters badly under-price.
	const DRAG_FLOOR_VH = 180;
	// Scroll budgeted to each scene's caption run.
	const AZIMUTHAL_A_TOTAL_VH = 2100;
	const DISC_TOTAL_VH = 1100;
	// Reading hold for the 'imaginary-geometry' interstitial inside instance
	// A's <main> -- set as .interlude's min-height below. Instance A's progress
	// is clamped at ZOOM_END, so this scroll is free: it just holds the
	// finished map on screen while the card rides past, tied to no pacing table
	// (that coupling is what splitting the scene into two <main>s removed).
	const INTERLUDE_HOLD_VH = 170;

	// Build a [progress, vh] breakpoint table from {start, end, text} beats;
	// scroll maps piecewise-linearly between stops. `floorFor` optionally
	// returns an extra per-beat floor (used for the drag beat).
	function buildPacing(beats, totalVh, floorFor) {
		const weights = beats.map(
			(c) => VH_PER_CHAR * c.text.length + VH_PER_PROGRESS_UNIT * (c.end - c.start)
		);
		const total = weights.reduce((a, b) => a + b, 0);
		let heights = weights.map((w) => (w / total) * totalVh);

		// Floors applied in final vh. Whatever a floor adds is taken
		// proportionally from the beats still above their own floor, so the
		// table keeps its budgeted total. Iterated, since lifting several short
		// beats at once can push a fourth under -- converges in a pass or two.
		const floors = beats.map((c, i) =>
			Math.max(MIN_CAPTION_VH, floorFor ? floorFor(c, i) : 0)
		);
		for (let pass = 0; pass < 6; pass++) {
			const deficit = heights.reduce((s, h, i) => s + Math.max(0, floors[i] - h), 0);
			if (deficit < 0.5) break;
			const slack = heights.reduce((s, h, i) => s + Math.max(0, h - floors[i]), 0);
			if (slack <= deficit) {
				heights = floors.slice();
				break;
			}
			const shrink = (slack - deficit) / slack;
			heights = heights.map((h, i) =>
				h <= floors[i] ? floors[i] : floors[i] + (h - floors[i]) * shrink
			);
		}

		const stops = [{ progress: beats[0].start, vh: 0 }];
		let cum = 0;
		beats.forEach((c, i) => {
			cum += heights[i];
			stops.push({ progress: c.end, vh: cum });
		});
		return stops;
	}

	// Invert a pacing table: scrolled vh -> progress.
	function progressAtVh(stops, traveledVh) {
		if (traveledVh <= 0) return stops[0].progress;
		const last = stops[stops.length - 1];
		if (traveledVh >= last.vh) return last.progress;
		let i = 1;
		while (i < stops.length - 1 && stops[i].vh < traveledVh) i++;
		const a = stops[i - 1];
		const b = stops[i];
		const t = b.vh === a.vh ? 0 : (traveledVh - a.vh) / (b.vh - a.vh);
		return a.progress + t * (b.progress - a.progress);
	}

	const AZIMUTHAL_A_PACING = buildPacing(
		AZIMUTHAL_CAPTIONS.filter((c) => c.end <= ZOOM_END + 1e-6),
		AZIMUTHAL_A_TOTAL_VH,
		(c) => (c.start === TOUR_END ? DRAG_FLOOR_VH : 0)
	);
	const DISC_PACING = buildPacing(
		AZIMUTHAL_CAPTIONS.filter((c) => c.start >= DISC_END - 1e-6),
		DISC_TOTAL_VH
	);
	const AZIMUTHAL_A_SPACER_VH = AZIMUTHAL_A_PACING[AZIMUTHAL_A_PACING.length - 1].vh;
	const DISC_SPACER_VH = DISC_PACING[DISC_PACING.length - 1].vh;

	function updateAzimuthalProgress() {
		if (!azimuthalTextEl) return;
		const rect = azimuthalTextEl.getBoundingClientRect();
		if (rect.top > STICKY_TOP_PX) {
			azimuthalProgress = 0;
			azimuthalSettleScrollY = null;
			return;
		}
		if (azimuthalSettleScrollY === null) azimuthalSettleScrollY = window.scrollY;
		const traveledVh = ((window.scrollY - azimuthalSettleScrollY) / window.innerHeight) * 100;
		azimuthalProgress = Math.max(0, Math.min(ZOOM_END, progressAtVh(AZIMUTHAL_A_PACING, traveledVh)));
	}

	function updateDiscProgress() {
		if (!discTextEl) return;
		const rect = discTextEl.getBoundingClientRect();
		if (rect.top > STICKY_TOP_PX) {
			discProgress = DISC_END;
			discSettleScrollY = null;
			return;
		}
		if (discSettleScrollY === null) discSettleScrollY = window.scrollY;
		const traveledVh = ((window.scrollY - discSettleScrollY) / window.innerHeight) * 100;
		discProgress = Math.max(DISC_END, Math.min(RECENTRE_END, progressAtVh(DISC_PACING, traveledVh)));
	}

	// As the interstitial's bottom edge rises past the top of the viewport,
	// fade the still-pinned instance-A map out under it; once it's gone the map
	// stays hidden and the disc section takes over.
	function updateMapFade() {
		if (!interludeEl) {
			mapFade = 1;
			return;
		}
		const bottom = interludeEl.getBoundingClientRect().bottom;
		mapFade = Math.max(0, Math.min(1, bottom / window.innerHeight));
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
		updateDiscProgress();
		updateMapFade();
		updateCurvatureProgress();
		updateSceneHandover();
		const passive = { passive: true };
		const updates = [
			updateParallelProgress,
			updateSphereProgress,
			updateAzimuthalProgress,
			updateDiscProgress,
			updateMapFade,
			updateCurvatureProgress,
			updateSceneHandover
		];
		for (const fn of updates) {
			window.addEventListener('scroll', fn, passive);
			window.addEventListener('resize', fn);
		}
		return () => {
			for (const fn of updates) {
				window.removeEventListener('scroll', fn);
				window.removeEventListener('resize', fn);
			}
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

	<!-- Two scenes, one panel, crossfaded rather than switched. The sphere is
	     three.js with a live render loop, so it is NOT mounted at page load --
	     but it IS mounted the moment the reader enters the parallel scene
	     (parallelProgress > 0), a good five viewports of scroll before the
	     crossfade starts. That warm-up window is the fix for the old bug where
	     the sphere's context was created only as the handover began and raced
	     the scroll, popping in half-animated. Pointer events go to whichever
	     scene is in front, so the triangle's drag handles stop responding once
	     it is more than half faded out. -->
	<div class="scene-panel">
		{#if sceneHandover < 1}
			<div
				class="scene-layer"
				style="opacity: {1 - sceneHandover}; pointer-events: {sceneHandover < 0.5 ? 'auto' : 'none'}"
			>
				<ParallelPostulateScene
					progress={parallelProgress}
					dragEnabled={parallelProgress >= 1 && sceneHandover < 0.5}
				/>
			</div>
		{/if}
		{#if parallelProgress > 0 || sceneHandover > 0}
			<div
				class="scene-layer"
				style="opacity: {sceneHandover}; pointer-events: {sceneHandover >= 0.5 ? 'auto' : 'none'}"
			>
				<SphereGeometryScene progress={sphereProgress} debug={debugSphere} />
			</div>
		{/if}
	</div>
</main>

<!-- An interstitial: plain connective prose, not paired to any scene, sitting
     in ordinary document flow between the two <main> sections. Nothing tracks
     its height or position -- it just scrolls past once, like a paragraph on
     any page, which is the whole point of using this kind of space here
     rather than stretching either scene to cover the gap. -->
<section class="interstitial-standalone">
	<Interstitial body={interstitialStraight.body} />
</section>

<!-- azimuthal-projection: instance A of AzimuthalProjectionScene, 0..ZOOM_END
     (globe -> gore peel -> flat map -> stereographic zoom-out). A custom grid
     rather than .layout so the scene panel can span BOTH grid rows and stay
     pinned through row 2 -- the 'imaginary-geometry' interstitial, which rides
     full-width over the held map as a card and then fades it out (mapFade) as it
     clears the top. Instance A's progress is clamped at ZOOM_END, so the
     interstitial's scroll costs nothing in any pacing table -- the coupling the
     old single-<main> version needed is gone. -->
<main class="azimuthal-a">
	<div class="text-panel">
		<div class="euler-flow">
			<div class="intro-spacer-lead"></div>
			<div class="intro-sticky" bind:this={azimuthalTextEl}>
				<h2>{azimuthalSlide.title}</h2>
				<p class="subtitle">{@html renderInline(azimuthalSlide.subtitle)}</p>
			</div>
			<div class="trailing-spacer" style="height: {spacerVh(AZIMUTHAL_A_SPACER_VH)}vh"></div>
		</div>
	</div>
	<div class="scene-panel" style="opacity: {mapFade}">
		<AzimuthalProjectionScene
			progress={azimuthalProgress}
			dragEnabled={azimuthalProgress >= TOUR_END && azimuthalProgress < DRAG_END}
			debug={debugAzimuthal}
		/>
	</div>
	<section
		class="interlude"
		bind:this={interludeEl}
		style="min-height: {INTERLUDE_HOLD_VH}vh"
	>
		<Interstitial body={interstitialImaginary.body} standalone={false} />
	</section>
</main>

<!-- a-different-kind-of-map: instance B, DISC_END..RECENTRE_END. A second,
     independent AzimuthalProjectionScene in its own <main> -- the disc just
     appears, no morph from the flat map (dropped deliberately). Same shape as
     the negative-curvature section below. -->
<main class="layout">
	<div class="text-panel">
		<div class="euler-flow">
			<div class="intro-spacer-lead"></div>
			<div class="intro-sticky" bind:this={discTextEl}>
				<h2>{discSlide.title}</h2>
				<p class="subtitle">{@html renderInline(discSlide.subtitle)}</p>
			</div>
			<div class="trailing-spacer" style="height: {spacerVh(DISC_SPACER_VH)}vh"></div>
		</div>
	</div>
	<div class="scene-panel">
		<AzimuthalProjectionScene progress={discProgress} dragEnabled={false} debug={debugAzimuthal} />
	</div>
</main>

<!-- Standalone interstitial between the disc sequence and the curvature scene --
     same placement as the 'straight-in-curved-geometry' one above: ordinary
     document flow between two <main> sections, nothing tracking its height. -->
<section class="interstitial-standalone">
	<Interstitial body={interstitialCurvature.body} />
</section>

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
				{#if curvatureSlide.aside}
					<a class="aside-link" href="{base}{curvatureSlide.aside.href}">{curvatureSlide.aside.label} →</a>
				{/if}
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
	.aside-link {
		align-self: flex-start;
		font-size: 0.85rem;
		color: var(--accent);
		text-decoration: none;
		border-bottom: 1px solid color-mix(in srgb, var(--accent) 35%, transparent);
	}
	.aside-link:hover {
		border-bottom-color: var(--accent);
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
	/* The standalone placement, used between two <main> sections rather than
	   inside either one's sticky flow -- see Interstitial.svelte for what's
	   shared between the two placements and why. */
	.interstitial-standalone {
		display: flex;
		justify-content: center;
	}
	/* azimuthal-projection's <main> (instance A). Two columns like .layout, but
	   a grid so the scene panel can be told to span both rows -- row 1 is the
	   sidebar heading + spacer, row 2 is the full-width interstitial interlude.
	   Spanning both rows is what lets the panel stay position:sticky straight
	   through the interlude (a grid item's sticky range is its grid area). */
	.azimuthal-a {
		display: grid;
		grid-template-columns: min(28vw, 24rem) 1fr;
		align-items: start;
	}
	.azimuthal-a > .text-panel {
		grid-column: 1;
		grid-row: 1;
	}
	.azimuthal-a > .scene-panel {
		grid-column: 2;
		grid-row: 1 / -1;
	}
	/* The 'imaginary-geometry' interstitial, full width beneath both columns,
	   riding OVER the still-pinned map (hence z-index and the card's own
	   surface in Interstitial.svelte). Its min-height -- the reading hold -- is
	   set inline from INTERLUDE_HOLD_VH in the script. */
	.azimuthal-a > .interlude {
		grid-column: 1 / -1;
		grid-row: 2;
		position: relative;
		z-index: 3;
		display: flex;
		justify-content: center;
		align-items: flex-start;
		padding: 12vh 2rem 0;
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
	/* Stacked so the two can overlap during the handover. */
	.scene-layer {
		position: absolute;
		inset: 0;
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
		.azimuthal-a {
			grid-template-columns: 1fr;
		}
		.azimuthal-a > .scene-panel {
			grid-column: 1;
			grid-row: auto;
		}
		.azimuthal-a > .interlude {
			grid-column: 1;
			grid-row: auto;
			min-height: 0;
			padding: 4.5rem 1rem;
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
