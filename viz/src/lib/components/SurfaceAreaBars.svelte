<script>
	// Horizontal counterpart to AreaBarChart.svelte, built for the
	// minimal-surfaces page specifically (AreaBarChart itself stays as-is —
	// the standalone /catenoid sandbox still uses its vertical layout).
	// Full-width, thin tracks instead of chunky vertical columns, so
	// label + bar + range sit on one line each and are easy to scan
	// top-to-bottom rather than compared side-by-side.
	//
	// For V-shape/Smooth curve, whichever stage is still being dragged shows
	// its live current value; once that stage is behind you, its bar
	// switches to the range you explored (min-max) instead — a single point
	// number would understate what dragging already ruled out. Cylinder and
	// Catenary never have a range (nothing to explore), so they just show
	// their one fixed value.
	let { bars = [], maxVal = 1 } = $props(); // [{ label, value, min?, max?, isStatic?, isAnswer? }]

	function pct(v) {
		return Math.max(0, Math.min(100, (v / maxVal) * 100));
	}

	function hasRange(bar) {
		return bar.min != null && bar.max != null && bar.max > bar.min;
	}
</script>

<div class="bars">
	<p class="chart-title">Surface area</p>
	{#each bars as bar (bar.label)}
		<div class="row">
			<div class="row-header">
				<span class="label">{bar.label}</span>
				<span class="value">
					{#if hasRange(bar)}
						{bar.min.toFixed(2)}&ndash;{bar.max.toFixed(2)}
					{:else}
						{bar.value.toFixed(2)}
					{/if}
				</span>
			</div>
			<div class="track">
				{#if hasRange(bar)}
					{@const left = pct(bar.min)}
					{@const width = pct(bar.max) - left}
					<div class="band" style="left:{left}%; width:{width}%"></div>
				{/if}
				<div
					class="fill"
					class:static={bar.isStatic}
					class:answer={bar.isAnswer}
					style="width:{pct(bar.value)}%"
				></div>
			</div>
		</div>
	{/each}
</div>

<style>
	.bars {
		width: 100%;
	}
	.chart-title {
		margin: 0 0 0.6rem;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--text-muted);
	}
	.row {
		margin-bottom: 0.6rem;
	}
	.row-header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.5rem;
		margin-bottom: 0.25rem;
	}
	.label {
		font-size: 0.85rem;
		color: var(--text-secondary);
	}
	.value {
		font-size: 0.85rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		color: var(--text-primary);
		white-space: nowrap;
	}
	.track {
		position: relative;
		width: 100%;
		height: 8px;
		border-radius: 4px;
		background: var(--surface-2);
		overflow: hidden;
	}
	.fill {
		position: absolute;
		inset: 0 auto 0 0;
		border-radius: 4px;
		background: var(--accent);
	}
	.fill.static {
		background: var(--text-muted);
	}
	.fill.answer {
		background: var(--swatch-aqua);
	}
	.band {
		position: absolute;
		inset: 0 auto 0 auto;
		background: var(--accent);
		opacity: 0.25;
	}
</style>
