<script>
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import { base } from '$app/paths';
	import Scrolly from '$lib/components/Scrolly.svelte';
	import ScrollyStep from '$lib/components/ScrollyStep.svelte';
	import VisualPlaceholder from '$lib/components/VisualPlaceholder.svelte';
	import CatenoidScene from '$lib/components/CatenoidScene.svelte';
	import CatenaryUnrollScene from '$lib/components/CatenaryUnrollScene.svelte';
	import MeanCurvatureScene from '$lib/components/MeanCurvatureScene.svelte';
	import MinimalSurfaceExplorer from '$lib/components/MinimalSurfaceExplorer.svelte';
	import ProfileEditor from '$lib/components/ProfileEditor.svelte';
	import SurfaceAreaBars from '$lib/components/SurfaceAreaBars.svelte';
	import StanzaNav from '$lib/components/StanzaNav.svelte';
	import {
		DEFAULT_R,
		DEFAULT_L,
		vProfile,
		curveProfile,
		cylinderProfile,
		catenaryProfile,
		maxPossibleArea,
		surfaceArea
	} from '$lib/catenoidProfile.js';
	import { slides } from '$lib/content/minimalSurfaces.js';

	// First and last slides are standalone full-viewport cover screens (see
	// .cover-section below) bookending the stanza, not part of the
	// two-column scrollytelling flow — everything in between shares the
	// text-panel/scene-panel layout. The outro doesn't have (or need) a
	// built visual, unlike every slide in the middle.
	const introSlide = slides[0];
	const outroSlide = slides[slides.length - 1];
	const scrollySlides = slides.slice(1, -1);

	let activeIndex = $state(0);
	const eulerIndex = scrollySlides.findIndex((s) => s.id === 'euler-question');
	const catenaryAnswerIndex = scrollySlides.findIndex((s) => s.id === 'euler-answer');
	const curvatureIndex = scrollySlides.findIndex((s) => s.id === 'defining-property');
	const explorerIndex = scrollySlides.findIndex((s) => s.id === 'surface-explorer');
	// The euler-question slide's copy has two extra fields (`stages`) the
	// generic slides don't — see the comment on it in minimalSurfaces.js.
	// Pulled out here since the scene-panel section below needs it too, but
	// isn't inside the `{#each scrollySlides as slide}` loop that would
	// otherwise put `slide` in scope.
	const eulerSlide = scrollySlides[eulerIndex];

	// Minimal inline-markdown support, same convention as StepText.svelte —
	// **bold** only, plus *italic* (used for book titles in this copy).
	function renderInline(text) {
		return text
			.replace(/\*\*(.+?)\*\*/g, '<strong class="stat">$1</strong>')
			.replace(/\*(.+?)\*/g, '<em>$1</em>');
	}

	// --- Everything below (through updateScrollProgress) started as a port
	// of viz/src/routes/catenoid/+page.svelte (which stays as its own
	// standalone sandbox route), then diverged substantially — see the
	// comments on `stage`/`profile` and `updateScrollProgress` below.

	const ringR = DEFAULT_R;
	const ringL = DEFAULT_L;
	const chartMaxVal = maxPossibleArea(ringR, ringL) * 1.1;
	// Known analytically (2*pi*R*2L) rather than captured from a live
	// callback — the "Cylinder" bar's value never changes, so there's no
	// reason it should depend on the mesh having rendered at least once.
	const cylinderArea = surfaceArea(cylinderProfile(ringR, ringL));

	let midR = $state(DEFAULT_R);
	const INITIAL_SPREAD = DEFAULT_L * 0.12;
	let spread = $state(INITIAL_SPREAD);

	// Nudge: if the reader hasn't touched the cinch control point within a
	// bit of scrolling after the sandbox (V-shape bar + editor) appears,
	// ease midR down a little on their behalf — enough to show a visible V,
	// not the full answer — as a hint that the point is draggable.
	//
	// Originally checked the cinch prompt's own on-screen position ("halfway
	// up the viewport"), matching how the request was phrased, but measuring
	// against a live DOM rect turned out to give almost no grace period in
	// practice: by the time sandboxVisible flips true, the cinch prompt
	// (see the recent spacer retune) is *already* ~38% of the way down the
	// viewport — past the "halfway up" line before a single further scroll
	// event fires. Using scroll distance since sandboxVisible instead gives
	// an actual, tunable grace window, and is more robust to future
	// retuning of the surrounding spacer heights than a raw viewport
	// position would be. Fires at most once per page load (autoNudged), and
	// only if midR is still at its untouched default when the threshold is
	// crossed.
	let autoNudged = false;
	const NUDGE_TARGET_FRAC = 0.85; // how far in from the untouched (R) default
	const NUDGE_DURATION_MS = 700;
	const NUDGE_GRACE_PX = 350; // ~half the cinch step's own ~650px dwell window

	function maybeAutoNudge() {
		if (autoNudged || stage !== 'cinch' || !sandboxVisible || settleScrollY === null) return;
		if (midR !== DEFAULT_R) {
			// Already touched — don't nudge, and stop checking.
			autoNudged = true;
			return;
		}
		const scrollSinceSandbox = window.scrollY - settleScrollY - REVEAL_SPAN_PX();
		if (scrollSinceSandbox < NUDGE_GRACE_PX) return;
		autoNudged = true;
		const start = midR;
		const target = DEFAULT_R * NUDGE_TARGET_FRAC;
		const startTime = performance.now();
		function tick(now) {
			const t = Math.min(1, (now - startTime) / NUDGE_DURATION_MS);
			const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
			midR = start + (target - start) * eased;
			if (t < 1) requestAnimationFrame(tick);
		}
		requestAnimationFrame(tick);
	}

	let area = $state(0);
	let cinchRange = $state({ min: Infinity, max: -Infinity });
	let curveRange = $state({ min: Infinity, max: -Infinity });
	let catenaryArea = $state(null);

	// stageIndex is driven by a *nested* <Scrolly> (see the template) — the
	// same IntersectionObserver-based mechanism the rest of this page and
	// the citation chapter already use, applied to the three per-stage
	// prompt paragraphs. An earlier version derived it from a hand-rolled
	// scrollY-distance formula instead, with the prompt text stuck fixed in
	// place — the stage would silently snap the moment some arbitrary pixel
	// threshold was crossed, with nothing on screen to signal "you're about
	// to move on." Reusing <Scrolly> instead means the prompt for the next
	// stage visibly scrolls up from underneath the pinned title/editor
	// before it takes over — the same legible pattern as every other slide
	// in this document, not a separate mechanism.
	//
	const STAGE_NAMES = ['cinch', 'curve', 'catenary'];
	let stageIndex = $state(0);
	let stage = $derived(STAGE_NAMES[stageIndex]);

	// Per-stage drag instructions live as stationary text next to the
	// editor (not in the scrolling prompt) so they're always paired with
	// the control they describe, regardless of how far the reader has
	// scrolled past the prompt that introduced it. Pulled from the same
	// eulerSlide.stages entry the scrolling prompt below comes from.
	let dragCaption = $derived(eulerSlide.stages[stageIndex]?.caption ?? '');

	let profile = $derived(
		stage === 'catenary'
			? (catenaryProfile(ringR, ringL) ?? cylinderProfile(ringR, ringL))
			: stage === 'curve'
				? curveProfile(ringR, ringL, midR, spread)
				: vProfile(ringR, ringL, midR)
	);

	function handleAreaChange(a) {
		area = a;
		if (stage === 'cinch') {
			cinchRange = { min: Math.min(cinchRange.min, a), max: Math.max(cinchRange.max, a) };
		} else if (stage === 'curve') {
			curveRange = { min: Math.min(curveRange.min, a), max: Math.max(curveRange.max, a) };
		} else if (stage === 'catenary') {
			catenaryArea = a;
		}
	}

	// Wherever the reader last left CatenoidScene's camera (only updates on
	// actual OrbitControls rotation — see its onCameraChange) — so if Slide
	// 3's CatenaryUnrollScene mounts after they've rotated the shape, it can
	// start its own rotate-to-face-on animation from that same orientation
	// instead of snapping to a fixed default they never saw.
	let catenoidCameraPos = $state(null);

	function finite(v) {
		return Number.isFinite(v) ? v : undefined;
	}

	// cinchRange/curveRange only accumulate while `stage` matches (see
	// handleAreaChange), so their .min naturally holds "the best you found"
	// forever after you scroll on to a later step — no separate frozen
	// "best" snapshot needed, and no explicit hand-off moment required
	// (unlike the old Continue-button version) to capture it.
	// The *active* stage's own bar always shows its current live value, full
	// stop -- a range there would mean "here's what dragging has achieved so
	// far," competing with the number actually moving under your thumb.
	// Once a stage is behind you, its bar switches to the min-max range you
	// explored while it was active (via SurfaceAreaBars' hasRange check) --
	// nothing to drag anymore, so the range *is* the useful summary.
	let bars = $derived.by(() => {
		const list = [{ label: 'Cylinder', value: cylinderArea, isStatic: true }];
		if (stage === 'cinch') {
			list.push({ label: 'V-shape', value: area });
		} else if (stage === 'curve') {
			list.push({
				label: 'V-shape',
				value: finite(cinchRange.min) ?? cylinderArea,
				min: finite(cinchRange.min),
				max: finite(cinchRange.max)
			});
			list.push({ label: 'Smooth curve', value: area });
		} else if (stage === 'catenary') {
			list.push({
				label: 'V-shape',
				value: finite(cinchRange.min) ?? cylinderArea,
				min: finite(cinchRange.min),
				max: finite(cinchRange.max)
			});
			list.push({
				label: 'Smooth curve',
				value: finite(curveRange.min) ?? cylinderArea,
				min: finite(curveRange.min),
				max: finite(curveRange.max)
			});
			if (catenaryArea != null) list.push({ label: 'Catenary', value: catenaryArea, isAnswer: true });
		}
		return list;
	});

	let comparisonNote = $derived.by(() => {
		if (stage !== 'catenary' || catenaryArea == null) return '';
		const best = finite(curveRange.min);
		if (best == null) return '';
		const pct = ((best - catenaryArea) / catenaryArea) * 100;
		return pct < 0.05
			? 'Your best smooth curve matched the true minimum almost exactly.'
			: `Your best smooth curve was ${pct.toFixed(1)}% above the true minimum.`;
	});

	// Two scroll phases, not one. The old version measured reveal progress
	// against the text's *own* travel from off-screen to its sticky resting
	// spot — but that travel happens largely before the reader can even see
	// the mesh (it's still sliding up from below the fold), so the reveal
	// was effectively over by the time it came into view. Now:
	//
	// Phase 1 — arrival: rect.top > stickyTop, the panel is still sliding up
	// toward its sticky position. revealProgress stays at 0 the whole time
	// (mesh unswept, phiLength 0) — no animation happens off-screen.
	//
	// Phase 2 — settled: once rect.top reaches stickyTop the panel is
	// pinned, so rect.top can't tell us anything further (it stays put
	// regardless of more scrolling). From here, additional scroll is
	// measured directly via window.scrollY *relative to the scrollY at the
	// moment of settling* (settleScrollY) — that delta drives revealProgress
	// 0->1 over REVEAL_SPAN_PX. This only ever drives the mesh's sweep
	// animation now (see CatenoidScene's `revealProgress` prop) — which
	// stage/prompt is showing is entirely the nested <Scrolly>'s concern
	// (see its comment above), a separate, independent scroll region.
	//
	// Re-evaluated every scroll event in both directions — scrolling back up
	// out of phase 2 drops back to phase 1 (revealProgress toward 0, the
	// mesh sweeps closed again), matching the bidirectional scrub this was
	// built for.
	let revealProgress = $state(0);
	// The editor + chart stay hidden until the reveal finishes — shown right
	// as the "cinch the middle" prompt is about to scroll into view, not
	// from the very start of the section. revealProgress is a reasonable
	// proxy for "has the reader reached that point": .reveal-narrative's
	// min-height is deliberately sized to REVEAL_VH below, so the reveal
	// finishes right around when the reader scrolls past it into
	// .stage-steps' territory.
	let sandboxVisible = $derived(revealProgress >= 1);
	let introTextEl = $state();
	// .intro-sticky sticks flush at the very top (top:0, see its CSS) with
	// its own padding-top providing the visual inset — not `top: 2rem` with
	// a matching offset here. That combination briefly let a sliver of
	// whatever was scrolling past underneath peek out *above* the sticky
	// panel once stuck (the negative-margin background-bleed trick and the
	// `top` offset were fighting each other) — flush + internal padding has
	// no such gap by construction. This constant stays 0 unless that CSS
	// `top` value changes too.
	const STICKY_TOP_PX = 0;
	const REVEAL_VH = 0.9;
	let settleScrollY = null;

	function REVEAL_SPAN_PX() {
		return REVEAL_VH * window.innerHeight;
	}

	function updateScrollProgress() {
		if (!introTextEl) return;
		const rect = introTextEl.getBoundingClientRect();
		const stickyTop = STICKY_TOP_PX;

		if (rect.top > stickyTop) {
			// Still arriving (or scrolled back above the settle point).
			revealProgress = 0;
			settleScrollY = null;
			return;
		}

		if (settleScrollY === null) settleScrollY = window.scrollY;
		const traveled = window.scrollY - settleScrollY;
		revealProgress = Math.max(0, Math.min(1, traveled / REVEAL_SPAN_PX()));
	}

	// Second, independent instance of the exact same arrival/settle pattern
	// above, driving Slide 3's unroll-to-catenary animation instead of
	// Slide 2's reveal. Duplicated rather than shared — this makes two
	// occurrences in this one file; if a third scroll-scrubbed animation
	// shows up later (e.g. the curvature or soap-film slides), that's the
	// point to extract a small shared helper, not before.
	let catenaryProgress = $state(0);
	let catenaryTextEl = $state();
	const CATENARY_SPAN_VH = 2.5;
	let catenarySettleScrollY = null;

	function CATENARY_SPAN_PX() {
		return CATENARY_SPAN_VH * window.innerHeight;
	}

	function updateCatenaryProgress() {
		if (!catenaryTextEl) return;
		const rect = catenaryTextEl.getBoundingClientRect();

		if (rect.top > STICKY_TOP_PX) {
			catenaryProgress = 0;
			catenarySettleScrollY = null;
			return;
		}

		if (catenarySettleScrollY === null) catenarySettleScrollY = window.scrollY;
		const traveled = window.scrollY - catenarySettleScrollY;
		catenaryProgress = Math.max(0, Math.min(1, traveled / CATENARY_SPAN_PX()));
	}

	// Third, independent instance of the same arrival/settle pattern above,
	// driving Slide 4's zero-mean-curvature demonstration. Deliberately
	// duplicated again rather than extracted into a shared helper — this
	// scroll math has had several real, subtle bugs shaken out of it already
	// this session, and bundling a refactor with a new complex animation in
	// the same pass was judged too risky. Worth extracting once things settle.
	let curvatureProgress = $state(0);
	let curvatureTextEl = $state();
	// Roughly matches the 5 ScrollyStep prompts' own scroll budget below
	// (90+70+70+70+90 = 390vh) so curvatureProgress finishes right around
	// when the last prompt has scrolled through — tuned visually, same as
	// every other span/spacer pairing in this file.
	const CURVATURE_SPAN_VH = 3.6;
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

	// Which of defining-property's 5 stage prompts is showing — bound from
	// its own nested <Scrolly> (see the template), same mechanism/precedent
	// as eulerSlide's stageIndex: a separate, independently-paced
	// IntersectionObserver-driven index, not mathematically locked to
	// curvatureProgress (which keeps driving MeanCurvatureScene's continuous
	// animation on its own). The two are kept *roughly* in step by tuning
	// this slide's total scroll height against CURVATURE_SPAN_VH, the same
	// "eyeball and tune" approach used for eulerSlide's own two mechanisms.
	let curvatureStageIndex = $state(0);

	// Which of surface-explorer's 3 per-family sentences is the furthest
	// one reached so far -- same nested-<Scrolly> mechanism as
	// curvatureStageIndex above, but the template renders every sentence up
	// to and including this index (not just this one), so each stays
	// visible ("sticks") once its own trigger has been scrolled past
	// instead of being replaced by the next. Order matches
	// MinimalSurfaceExplorer's own FAMILIES array (catenoid-helicoid,
	// enneper, scherk) and slide.body's own [intro, catenoid, enneper,
	// scherk] order (index i here <-> slide.body[i + 1]) -- both need to
	// stay in that order for EXPLORER_FAMILY_ORDER below to line up.
	let explorerFamilyIndex = $state(0);
	const EXPLORER_FAMILY_ORDER = ['catenoid-helicoid', 'enneper', 'scherk'];
	// Two-way bound into MinimalSurfaceExplorer's own selectedFamilyId --
	// scrolling past a sentence's trigger sets it (via the effect below),
	// and picking the dropdown inside the explorer sets it right back, so
	// either input works without the two fighting (whichever happens most
	// recently just wins, same as any two-way binding).
	let explorerFamilyId = $state(EXPLORER_FAMILY_ORDER[0]);
	$effect(() => {
		explorerFamilyId = EXPLORER_FAMILY_ORDER[explorerFamilyIndex];
	});

	onMount(() => {
		updateScrollProgress();
		updateCatenaryProgress();
		updateCurvatureProgress();
		window.addEventListener('scroll', updateScrollProgress, { passive: true });
		window.addEventListener('scroll', updateCatenaryProgress, { passive: true });
		window.addEventListener('scroll', updateCurvatureProgress, { passive: true });
		window.addEventListener('scroll', maybeAutoNudge, { passive: true });
		window.addEventListener('resize', updateScrollProgress);
		window.addEventListener('resize', updateCatenaryProgress);
		window.addEventListener('resize', updateCurvatureProgress);
		return () => {
			window.removeEventListener('scroll', updateScrollProgress);
			window.removeEventListener('scroll', updateCatenaryProgress);
			window.removeEventListener('scroll', updateCurvatureProgress);
			window.removeEventListener('scroll', maybeAutoNudge);
			window.removeEventListener('resize', updateScrollProgress);
			window.removeEventListener('resize', updateCatenaryProgress);
			window.removeEventListener('resize', updateCurvatureProgress);
		};
	});
</script>

<svelte:head>
	<title>Minimal Surfaces</title>
</svelte:head>

<section class="cover-section">
	<div class="cover-card">
		<p class="kicker">Stanza II</p>
		<h1>{introSlide.title}</h1>
		{#each introSlide.body as para}
			<p>{@html renderInline(para)}</p>
		{/each}
		<div class="scroll-cue">Scroll to begin ↓</div>
	</div>
</section>

<main class="layout">
	<div class="text-panel">
		<Scrolly bind:active={activeIndex}>
			{#each scrollySlides as slide, i}
				<ScrollyStep index={i} active={i === activeIndex}>
					{#if slide.id === 'euler-question'}
						<!-- ScrollyStep's own container is `display:flex` (row) with
						     align-items:center — a single wrapper here (instead of
						     multiple sibling divs) keeps it seeing just one flex item,
						     same as every other slide's `.slide-text`. Without this,
						     the divs below become separate row items, vertically
						     centered within the tallest one — which silently pushed
						     the real content far down from where it visually needs
						     to be (a real bug hit earlier building this). -->
						<div class="euler-flow">
							<div class="intro-spacer-lead"></div>

							<!-- Title always here; the area bars wait for sandboxVisible
							     (see its declaration) — shown right as the "cinch the
							     middle" prompt is about to appear, not from the very
							     start. The draggable editor itself now lives over the 3D
							     scene instead (see .editor-overlay below), not in this
							     column. z-index still matters here: .stage-steps below
							     wraps a <Scrolly>, whose own root is `position:relative` —
							     a *positioned* sibling with no z-index paints in DOM order
							     among other positioned elements regardless of who's
							     "sticky", so without this the scrolling prompt text
							     painted over this panel once scrolled far enough to
							     overlap it (a real bug hit building the earlier version of
							     this section, before the editor moved out). -->
							<div class="intro-sticky" bind:this={introTextEl}>
								<h2>{slide.title}</h2>
								{#if sandboxVisible}
									<SurfaceAreaBars {bars} maxVal={chartMaxVal} />
									{#if comparisonNote}
										<p class="comparison-note">{comparisonNote}</p>
									{/if}
								{/if}
							</div>

							<!-- Reveal narrative: plain scrolling text (not sticky, not
							     tracked by any Scrolly) — nothing here needs to know
							     which paragraph is "active," it's just flavor text
							     accompanying the sweep-open animation. Text and buffer
							     are two separate elements on purpose (see their CSS) —
							     an earlier version centered the text inside one big
							     (200vh) box to keep .stage-steps from peeking in before
							     the reveal finished, but that meant the text itself sat
							     around the box's *middle*, well past where
							     `sandboxVisible` (tied to a fixed 90vh scroll budget)
							     actually flips — so the editor/chart appeared while this
							     text was still front and center. Splitting them lets the
							     text settle early (readable while the reveal plays) and
							     the plain spacer underneath carry the rest of the "don't
							     let the next block peek in yet" buffer on its own. -->
							<div class="reveal-narrative">
								{#each eulerSlide.body as para}
									{#if para.startsWith('> ')}
										<blockquote>{@html renderInline(para.slice(2))}</blockquote>
									{:else}
										<p class="prompt">{@html renderInline(para)}</p>
									{/if}
								{/each}
							</div>
							<div class="reveal-narrative-spacer"></div>

							<!-- Per-stage prompts: normal document flow (not sticky), so
							     each one visibly scrolls up from underneath the pinned
							     title/editor above — a nested <Scrolly>, same mechanism
							     as the outer slide navigation, driving stageIndex from
							     whichever prompt is nearest the trigger line. This is
							     what actually shows something happening as you scroll,
							     instead of a silent snap at an arbitrary threshold.

							     Always mounted — its height (plus .reveal-narrative's
							     above) is most of what makes this whole section as tall
							     as it is; gating it on scroll state was a real bug (see
							     git history for details). -->
							<div class="stage-steps">
								<Scrolly bind:active={stageIndex}>
									{#each eulerSlide.stages as s, i}
										<ScrollyStep index={i} active={stageIndex === i}>
											<p class="prompt">{s.prompt}</p>
										</ScrollyStep>
									{/each}
								</Scrolly>
							</div>
						</div>
					{:else if slide.id === 'euler-answer'}
						<!-- Same "text arrives, locks at top, further scroll drives an
						     animation" shape as the euler-question section above, but
						     simpler — no nested Scrolly, since there's no set of
						     discrete per-stage prompts here, just the slide's existing
						     copy sitting still once it locks while catenaryProgress
						     drives CatenaryUnrollScene continuously. -->
						<div class="euler-flow">
							<div class="intro-spacer-lead"></div>
							<div class="intro-sticky" bind:this={catenaryTextEl}>
								<h2>{slide.title}</h2>
								{#each slide.body as para}
									<p>{@html renderInline(para)}</p>
								{/each}
							</div>
							<div class="catenary-spacer-trail"></div>
						</div>
					{:else if slide.id === 'defining-property'}
						<!-- Same shape as euler-question above (sticky title, then a
						     nested <Scrolly> of per-stage prompts that physically
						     scroll up from underneath it), not euler-answer's
						     single-static-block version — matches feedback that a
						     stationary swapped caption read as less "scrolling
						     through the steps" than eulerSlide's own prompts do.
						     curvatureStageIndex (this nested Scrolly's own bound
						     index) only drives which prompt is highlighted;
						     curvatureProgress (a separate, continuous arrival/settle
						     calc below) keeps driving MeanCurvatureScene itself —
						     same two-mechanisms-loosely-paced-together approach as
						     eulerSlide's revealProgress/stageIndex pair. -->
						<div class="euler-flow">
							<div class="intro-spacer-lead"></div>
							<div class="intro-sticky" bind:this={curvatureTextEl}>
								<h2>{slide.title}</h2>
							</div>
							<div class="stage-steps">
								<Scrolly bind:active={curvatureStageIndex}>
									{#each slide.stages as s, i}
										<ScrollyStep index={i} active={curvatureStageIndex === i}>
											<p class="prompt">{@html renderInline(s.prompt)}</p>
										</ScrollyStep>
									{/each}
								</Scrolly>
							</div>
							<div class="curvature-spacer-trail"></div>
						</div>
					{:else if slide.id === 'surface-explorer'}
						<!-- Same shape as defining-property above (sticky intro, then a
						     nested <Scrolly> of per-stage triggers), but the sticky
						     panel accumulates every sentence reached so far instead of
						     swapping to just the current one — each family's sentence
						     scrolls in and then stays put ("sticks"), building a list,
						     rather than replacing the one before it. explorerFamilyIndex
						     (this nested Scrolly's own bound index) both decides how
						     many sentences show and, via the $effect near its
						     declaration, drives which family MinimalSurfaceExplorer has
						     selected -- so scrolling through these sentences and using
						     the explorer's own dropdown are two inputs to the same
						     state, matching how curvatureStageIndex/curvatureProgress
						     are two loosely-paced mechanisms for defining-property. -->
						<div class="euler-flow">
							<div class="intro-spacer-lead"></div>
							<div class="intro-sticky">
								<h2>{slide.title}</h2>
								<p>{@html renderInline(slide.body[0])}</p>
								{#each slide.body.slice(1) as para, i}
									{#if i <= explorerFamilyIndex}
										<p class="family-line" in:fly={{ y: 28, duration: 550, easing: quintOut }}>{@html renderInline(para)}</p>
									{/if}
								{/each}
							</div>
							<div class="stage-steps">
								<Scrolly bind:active={explorerFamilyIndex}>
									{#each slide.body.slice(1) as para, i}
										<ScrollyStep index={i} active={explorerFamilyIndex === i}>
											<!-- Blank on purpose -- this trigger's job is purely
											     to mark where its sentence should "land" in the
											     sticky panel above, not to show its own copy of
											     the text. ScrollyStep still needs *some* child
											     content to render, hence the empty div. -->
											<div class="explorer-trigger"></div>
										</ScrollyStep>
									{/each}
								</Scrolly>
							</div>
							<div class="explorer-spacer-trail"></div>
						</div>
					{:else}
						<div class="slide-text">
							<h2>{slide.title}</h2>
							{#each slide.body as para}
								{#if para.startsWith('> ')}
									<blockquote>{@html renderInline(para.slice(2))}</blockquote>
								{:else}
									<p>{@html renderInline(para)}</p>
								{/if}
							{/each}
						</div>
					{/if}
				</ScrollyStep>
			{/each}
		</Scrolly>
	</div>

	<div class="scene-panel">
		{#if activeIndex === eulerIndex}
			<CatenoidScene
				{profile}
				R={ringR}
				L={ringL}
				{revealProgress}
				onAreaChange={handleAreaChange}
				onCameraChange={(pos) => (catenoidCameraPos = pos)}
			/>
			{#if sandboxVisible}
				<!-- No card/border on purpose — sits directly over the 3D view
				     rather than in a boxed-off container, per explicit request.
				     ProfileEditor itself lost its own reference-line "frame" (the
				     ring-guide/axis ticks) at the same time — those read as an
				     unwanted little chart-within-a-chart once this moved onto the
				     open scene rather than sitting in the narrow text column. -->
				<div class="editor-overlay">
					{#if dragCaption}
						<p class="drag-caption">{dragCaption}</p>
					{/if}
					<ProfileEditor
						R={ringR}
						L={ringL}
						bind:midR
						bind:spread
						mode={stage === 'cinch' ? 'v' : 'curve'}
						showSpreadHandle={stage === 'curve'}
						frozen={stage === 'catenary'}
						overlayProfile={stage === 'catenary' ? profile : null}
					/>
				</div>
			{/if}
		{:else if activeIndex === catenaryAnswerIndex}
			<CatenaryUnrollScene
				R={ringR}
				L={ringL}
				progress={catenaryProgress}
				startCameraPos={catenoidCameraPos}
			/>
		{:else if activeIndex === curvatureIndex}
			<MeanCurvatureScene R={ringR} L={ringL} progress={curvatureProgress} />
		{:else if activeIndex === explorerIndex}
			<MinimalSurfaceExplorer bind:selectedFamilyId={explorerFamilyId} />
		{:else}
			<VisualPlaceholder label={scrollySlides[activeIndex]?.visualLabel ?? ''} />
		{/if}
	</div>
</main>

<section class="cover-section">
	<div class="cover-card">
		<h1>{outroSlide.title}</h1>
		{#each outroSlide.body as para}
			<p>{@html renderInline(para)}</p>
		{/each}
		<StanzaNav current="II" next={{ href: `${base}/beyond-mathematics`, title: 'Stanza III — Beyond Mathematics' }} />
	</div>
</section>

<style>
	/* Shared by the intro (Slide 1) and outro (last slide) — both are
	   full-bleed centered cards bookending the stanza, outside the
	   two-column scrollytelling flow the slides in between use. */
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
	.prompt {
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
	/* Short on purpose — this used to be 90vh, which meant the rings (in the
	   already-sticky scene-panel, visible as soon as this section begins)
	   sat alone on screen for a long stretch of scroll before the title and
	   prompt text caught up (it sits this much further down the *same*
	   text-panel column). Now they arrive together: rings and "A Simple
	   Question" both become visible right as the reader scrolls into this
	   section, with just enough spacer left for a brief settle-in motion. */
	.intro-spacer-lead {
		height: 15vh;
	}
	.intro-sticky {
		position: sticky;
		/* Flush at the very top, not `top: 2rem` — the visual inset comes
		   from padding-top instead (see below). That used to be `top: 2rem`
		   with a matching *negative* margin (to bleed the background past
		   the text), and the two fought each other: once stuck, there was a
		   real gap above the panel's background where whatever was
		   scrolling past underneath could peek through. Flush + internal
		   padding has no such gap — nothing can render above y=0 in the
		   viewport by definition. Matches STICKY_TOP_PX (0) in the script,
		   which has to agree with this value to correctly detect "settled"
		   vs "still arriving". */
		top: 0;
		/* See the template comment on this element — without an explicit
		   z-index, .stage-steps' nested <Scrolly> (also `position:relative`)
		   painted over this panel once scrolled far enough to overlap it,
		   silently eating clicks meant for the editor's drag handles. */
		z-index: 2;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		/* z-index alone only fixed click-through — visually, the scrolling
		   narrative/prompt text still showed straight through this panel
		   (no fill behind it), overlapping the title and controls into an
		   illegible mess. A solid background occludes whatever's scrolling
		   past underneath; the border gives the transition a visible edge
		   instead of text just vanishing mid-air beneath it. */
		background: var(--surface-1);
		padding: 2rem 0 1.25rem;
		border-bottom: 1px solid var(--surface-2);
	}
	/* Text settles within roughly one viewport (90vh, centered like
	   ScrollyStep's own content) — comparable to REVEAL_SPAN_PX (90vh), so
	   the text has genuinely scrolled past by the time `sandboxVisible`
	   flips and the editor/chart appear, rather than still sitting front
	   and center (a real bug: an earlier version stretched this box to
	   200vh to solve a *different* problem — see .reveal-narrative-spacer
	   below — which meant the text sat around the box's middle, well past
	   when sandboxVisible actually flips). */
	.reveal-narrative {
		min-height: 60vh;
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 1rem;
	}
	/* Pure buffer, no content. A much larger version of this (~105vh) was
	   here previously, sized to stop the "cinch" ScrollyStep from
	   triggering (stageIndex -> 0) before revealProgress hit 1 — but the
	   only thing that combination actually breaks is dragCaption/the
	   editor overlay, and those are already separately gated on
	   sandboxVisible (see the {#if sandboxVisible} around the editor
	   overlay below), not on stageIndex. The "cinch" *prompt* text itself
	   isn't gated on sandboxVisible at all, so there's no real hazard in
	   letting it become active a little before the editor appears — it
	   reads as scene-setting narrative either way. That old height was
	   creating a long dead scroll (mesh done, editor/chart already
	   showing, nothing happening) between the sandbox appearing and the
	   "cinch" prompt finally arriving (reported directly against a
	   screenshot). Tried shrinking this all the way to ~20vh first, which
	   fixed the gap but overcorrected the other way — "cinch" then only
	   stayed active for ~150px before the next prompt took over, barely
	   readable. 70vh lands the "cinch" prompt right as the sandbox
	   appears (no gap) while still giving it a real dwell window
	   (~650px) before "curve" takes over — checked via a scroll trace,
	   not just eyeballed. */
	.reveal-narrative-spacer {
		height: 70vh;
	}
	/* Each prompt below gets ScrollyStep's normal 70vh (90vh for the
	   first/last, since this is its own nested <Scrolly> root) — the same
	   pacing as every other slide, rather than a bespoke fixed-height
	   spacer standing in for "room to interact." */
	.stage-steps {
		width: 100%;
	}
	/* CATENARY_SPAN_VH (250vh, matching the script) worth of scroll drives
	   the animation itself, plus ~100vh of slack afterward — needed because
	   the *outer* Scrolly's trigger line sits at viewport center (see
	   Scrolly.svelte's rootMargin), so it stops treating this block as
	   "active" once its bottom edge scrolls up past the middle of the
	   screen, not once it fully leaves the viewport. Without the extra
	   slack, the outer nav moved on to Slide 4 — swapping the scene panel
	   away from CatenaryUnrollScene — before catenaryProgress could reach 1
	   and show the finished extended curve (a real bug hit building this). */
	.catenary-spacer-trail {
		height: 350vh;
	}
	/* Same "outer Scrolly's trigger line sits at viewport center" slack
	   reasoning as .catenary-spacer-trail above, sized against the smaller
	   scroll budget here (.stage-steps' own ~390vh, not a bespoke fixed
	   height) since the 5 ScrollyStep prompts already carry most of the load. */
	.curvature-spacer-trail {
		height: 100vh;
	}
	/* Same "outer Scrolly's trigger line sits at viewport center" slack
	   reasoning as .curvature-spacer-trail above -- 3 ScrollyStep triggers
	   carry the scroll budget here, this is just the tail end of it. */
	.explorer-spacer-trail {
		height: 100vh;
	}
	/* Purely a scroll target -- see the template comment on the empty
	   <ScrollyStep> content above. */
	.explorer-trigger {
		height: 1px;
	}
	.family-line {
		color: var(--text-secondary);
	}
	.scene-panel {
		flex: 1;
		min-width: 0;
		position: sticky;
		top: 0;
		height: 100vh;
	}
	/* Top-left of the 3D view, no card/border (see the template comment on
	   this element) — just the caption and the bare line. */
	.editor-overlay {
		position: absolute;
		top: 1.5rem;
		left: 1.5rem;
		z-index: 5;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.drag-caption {
		margin: 0;
		font-size: 0.9rem;
		font-style: italic;
		color: var(--text-secondary);
	}
	.comparison-note {
		margin-top: 0.6rem;
		font-size: 0.8rem;
		color: var(--text-secondary);
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
			/* Not `static` — .editor-overlay is absolutely positioned against
			   this element, which requires it to stay a positioned ancestor
			   even once it's no longer sticky-pinned on narrow layouts. */
			position: relative;
			height: 60vh;
		}
	}
</style>
