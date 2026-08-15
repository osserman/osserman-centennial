<script>
	// Bars accumulate as the reader unlocks stages (cylinder -> V-shape ->
	// smooth curve), replacing what was a plain numeric readout. Each
	// non-static bar shows a live value plus a persistent lighter band
	// spanning the min/max area explored so far while dragging — "the
	// range of surface areas you've uncovered," not just the current one.
	// maxVal is a FIXED axis ceiling the caller computes once up front (see
	// maxPossibleArea in catenoidProfile.js) — deliberately not derived from
	// `bars` here. Rescaling the axis reactively to whatever's currently
	// on screen was actively misleading: a bar whose value was genuinely
	// growing could appear to hold the same height (axis silently
	// stretching under it), and a bar that never changes at all (the
	// cylinder) could appear to shrink, purely because the axis grew to
	// fit something else. A fixed ceiling keeps height trustworthy for
	// direct comparison throughout the whole interaction.
	let { bars = [], maxVal = 1 } = $props(); // [{ label, value, min?, max?, isStatic?, isAnswer? }]

	const BAR_W = 46;
	const GAP = 28;
	const HEIGHT = 150;
	const PAD_TOP = 22;
	const PAD_BOTTOM = 26;
	const PLOT_H = HEIGHT - PAD_TOP - PAD_BOTTOM;

	let width = $derived(bars.length * (BAR_W + GAP) + GAP);

	function barH(v) {
		return v == null ? 0 : (v / maxVal) * PLOT_H;
	}

	// Rounded top corners only, square bottom (anchored to the baseline) —
	// a plain <rect rx> rounds all four corners, which reads as a pill
	// rather than a bar anchored to its axis.
	function topRoundedPath(x, yTop, w, h, radius) {
		const r = Math.min(radius, w / 2, Math.max(h, 0.01));
		const yBottom = yTop + h;
		if (h <= 0) return '';
		return `M ${x} ${yBottom}
			L ${x} ${yTop + r}
			Q ${x} ${yTop} ${x + r} ${yTop}
			L ${x + w - r} ${yTop}
			Q ${x + w} ${yTop} ${x + w} ${yTop + r}
			L ${x + w} ${yBottom}
			Z`;
	}
</script>

<p class="chart-title">Surface area</p>
<svg class="bar-chart" viewBox="0 0 {width} {HEIGHT}" role="img" aria-label="Surface area comparison">
	<line x1="0" x2={width} y1={HEIGHT - PAD_BOTTOM} y2={HEIGHT - PAD_BOTTOM} class="baseline" />
	{#each bars as bar, i (bar.label)}
		{@const x = GAP + i * (BAR_W + GAP)}
		{@const valueH = barH(bar.value)}
		{#if bar.min != null && bar.max != null && bar.max > bar.min}
			{@const bandTop = HEIGHT - PAD_BOTTOM - barH(bar.max)}
			{@const bandH = barH(bar.max) - barH(bar.min)}
			<path d={topRoundedPath(x, bandTop, BAR_W, bandH, 4)} class="range-band" />
		{/if}
		<path
			d={topRoundedPath(x, HEIGHT - PAD_BOTTOM - valueH, BAR_W, valueH, 4)}
			class="bar"
			class:static={bar.isStatic}
			class:answer={bar.isAnswer}
		/>
		<text x={x + BAR_W / 2} y={HEIGHT - PAD_BOTTOM - valueH - 8} class="value-label" text-anchor="middle">
			{bar.value.toFixed(2)}
		</text>
		<text x={x + BAR_W / 2} y={HEIGHT - PAD_BOTTOM + 18} class="cat-label" text-anchor="middle">{bar.label}</text>
	{/each}
</svg>

<style>
	.chart-title {
		margin: 0 0 0.35rem;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--text-muted);
	}
	.bar-chart {
		width: 100%;
		height: auto;
	}
	.baseline {
		stroke: var(--text-muted);
		stroke-width: 1;
		opacity: 0.4;
	}
	.bar {
		fill: var(--accent);
	}
	.bar.static {
		fill: var(--text-muted);
	}
	.bar.answer {
		fill: var(--swatch-aqua);
	}
	.range-band {
		fill: var(--accent);
		opacity: 0.18;
	}
	.value-label {
		font-size: 11px;
		font-weight: 700;
		fill: var(--text-primary);
	}
	.cat-label {
		font-size: 10px;
		fill: var(--text-secondary);
	}
</style>
