<script>
	import { onMount } from 'svelte';
	import Scrolly from '$lib/components/Scrolly.svelte';
	import ScrollyStep from '$lib/components/ScrollyStep.svelte';
	import VisualPlaceholder from '$lib/components/VisualPlaceholder.svelte';
	import CatenoidScene from '$lib/components/CatenoidScene.svelte';
	import CatenaryUnrollScene from '$lib/components/CatenaryUnrollScene.svelte';
	import ProfileEditor from '$lib/components/ProfileEditor.svelte';
	import AreaBarChart from '$lib/components/AreaBarChart.svelte';
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

	// Slide 1 is a standalone full-viewport intro screen (see .intro-hero
	// below), not part of the two-column scrollytelling flow — everything
	// from Slide 2 on shares the text-panel/scene-panel layout.
	const introSlide = slides[0];
	const scrollySlides = slides.slice(1);

	let activeIndex = $state(0);
	const eulerIndex = scrollySlides.findIndex((s) => s.id === 'euler-question');
	const catenaryAnswerIndex = scrollySlides.findIndex((s) => s.id === 'euler-answer');

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
	// scrolled past the prompt that introduced it.
	let dragCaption = $derived(
		stage === 'cinch'
			? 'Drag the point up and down.'
			: stage === 'curve'
				? 'Drag the second point sideways to soften the curve.'
				: ''
	);

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

	function finite(v) {
		return Number.isFinite(v) ? v : undefined;
	}

	// cinchRange/curveRange only accumulate while `stage` matches (see
	// handleAreaChange), so their .min naturally holds "the best you found"
	// forever after you scroll on to a later step — no separate frozen
	// "best" snapshot needed, and no explicit hand-off moment required
	// (unlike the old Continue-button version) to capture it.
	let bars = $derived.by(() => {
		const list = [{ label: 'Cylinder', value: cylinderArea, isStatic: true }];
		if (stage === 'cinch') {
			list.push({ label: 'V-shape', value: area, min: finite(cinchRange.min), max: finite(cinchRange.max) });
		} else if (stage === 'curve') {
			list.push({
				label: 'V-shape',
				value: finite(cinchRange.min) ?? cylinderArea,
				min: finite(cinchRange.min),
				max: finite(cinchRange.max)
			});
			list.push({ label: 'Smooth curve', value: area, min: finite(curveRange.min), max: finite(curveRange.max) });
		} else if (stage === 'catenary') {
			list.push({ label: 'V-shape', value: finite(cinchRange.min) ?? cylinderArea });
			list.push({ label: 'Smooth curve', value: finite(curveRange.min) ?? cylinderArea });
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

	onMount(() => {
		updateScrollProgress();
		updateCatenaryProgress();
		window.addEventListener('scroll', updateScrollProgress, { passive: true });
		window.addEventListener('scroll', updateCatenaryProgress, { passive: true });
		window.addEventListener('resize', updateScrollProgress);
		window.addEventListener('resize', updateCatenaryProgress);
		return () => {
			window.removeEventListener('scroll', updateScrollProgress);
			window.removeEventListener('scroll', updateCatenaryProgress);
			window.removeEventListener('resize', updateScrollProgress);
			window.removeEventListener('resize', updateCatenaryProgress);
		};
	});
</script>

<svelte:head>
	<title>Minimal Surfaces</title>
</svelte:head>

<section class="intro-hero">
	<div class="intro-card">
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

							<!-- Title always here; editor + drag caption wait for
							     sandboxVisible (see its declaration) — shown right as the
							     "cinch the middle" prompt is about to appear, not from the
							     very start. z-index matters here (not just for visual
							     layering): .stage-steps below wraps a <Scrolly>, whose own
							     root is `position:relative` — a *positioned* sibling with
							     no z-index paints in DOM order among other positioned
							     elements, regardless of who's "sticky" — so without this,
							     the later, unrelated .stage-steps content silently
							     painted over this panel (and ate its pointer events,
							     making the editor's drag handles unclickable) once
							     scrolled far enough that the two visually overlapped. -->
							<div class="intro-sticky" bind:this={introTextEl}>
								<h2>{slide.title}</h2>
								{#if sandboxVisible}
									<div class="editor-row">
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
										{#if dragCaption}
											<p class="drag-caption">{dragCaption}</p>
										{/if}
									</div>
								{/if}
							</div>

							<!-- Reveal narrative: plain scrolling text (not sticky, not
							     tracked by any Scrolly) — nothing here needs to know
							     which paragraph is "active," it's just flavor text
							     accompanying the sweep-open animation. min-height gives
							     the reveal (REVEAL_VH of scroll) room to finish before
							     .stage-steps' first trigger zone becomes reachable —
							     without it, a reader scrolling straight through lands on
							     "curve" the instant the sandbox appears, skipping
							     "cinch" entirely (this happened for real building it). -->
							<div class="reveal-narrative">
								<p class="prompt">In 1744, Leonhard Euler asked a deceptively simple question:</p>
								<blockquote>What surface of revolution connects two rings using the least possible area?</blockquote>
								<p class="prompt">
									A good place to start would be rotating a straight line around the rings to
									make a cylinder.
								</p>
							</div>

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
									<ScrollyStep index={0} active={stageIndex === 0}>
										<p class="prompt">But we can do better if we cinch the middle.</p>
									</ScrollyStep>
									<ScrollyStep index={1} active={stageIndex === 1}>
										<p class="prompt">What if the transition were smooth instead of sharp?</p>
									</ScrollyStep>
									<ScrollyStep index={2} active={stageIndex === 2}>
										<p class="prompt">
											In 1744, Leonhard Euler proved this exact curve — the catenary —
											produces the smallest possible surface. Rotated, it's called a
											catenoid.
										</p>
									</ScrollyStep>
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
			<CatenoidScene {profile} R={ringR} L={ringL} {revealProgress} onAreaChange={handleAreaChange} />
			{#if sandboxVisible}
				<div class="chart-overlay">
					<AreaBarChart {bars} maxVal={chartMaxVal} />
					{#if comparisonNote}
						<p class="comparison-note">{comparisonNote}</p>
					{/if}
				</div>
			{/if}
		{:else if activeIndex === catenaryAnswerIndex}
			<CatenaryUnrollScene R={ringR} L={ringL} progress={catenaryProgress} />
		{:else}
			<VisualPlaceholder label={scrollySlides[activeIndex]?.visualLabel ?? ''} />
		{/if}
	</div>
</main>

<style>
	.intro-hero {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		box-sizing: border-box;
	}
	.intro-card {
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
	.intro-card h1 {
		margin: 0;
		font-size: 2.2rem;
		font-weight: 700;
		line-height: 1.15;
		letter-spacing: -0.01em;
		color: var(--text-primary);
	}
	.intro-card p {
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
	.editor-row {
		display: flex;
		align-items: center;
		gap: 1rem;
	}
	.editor-row :global(.profile-editor) {
		flex-shrink: 0;
	}
	.drag-caption {
		margin: 0;
		font-size: 0.9rem;
		font-style: italic;
		color: var(--text-secondary);
	}
	/* min-height matches REVEAL_VH in the script — see the template comment
	   on this element for why. Centered like ScrollyStep's own content, for
	   a consistent reading position with the rest of the page. */
	.reveal-narrative {
		min-height: 90vh;
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 1rem;
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
	.scene-panel {
		flex: 1;
		min-width: 0;
		position: sticky;
		top: 0;
		height: 100vh;
	}
	/* Floats over the 3D view rather than stacking in the (already sticky,
	   already tall) left column — keeps that column short enough to leave
	   room for the surrounding narrative text to keep scrolling normally,
	   and puts the numbers next to the shape they describe. */
	.chart-overlay {
		position: absolute;
		left: 1.5rem;
		bottom: 1.5rem;
		z-index: 5;
		width: min(20rem, calc(100% - 3rem));
		padding: 1rem 1.1rem 0.85rem;
		border-radius: 12px;
		border: 1px solid color-mix(in srgb, var(--text-primary) 10%, transparent);
		background: color-mix(in srgb, var(--surface-1) 88%, transparent);
		backdrop-filter: blur(6px);
		box-shadow: 0 4px 18px color-mix(in srgb, var(--text-primary) 12%, transparent);
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
			/* Not `static` — .chart-overlay is absolutely positioned against
			   this element, which requires it to stay a positioned ancestor
			   even once it's no longer sticky-pinned on narrow layouts. */
			position: relative;
			height: 60vh;
		}
	}
</style>
