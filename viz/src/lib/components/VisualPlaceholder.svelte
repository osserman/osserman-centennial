<script>
	// Generic stand-in for a slide's not-yet-built visual — keeps the
	// scrollytelling structure and pacing complete end to end while the real
	// visuals (chain animation, curvature viz, soap film, gallery/timeline)
	// get built out slide by slide. Swapped into the shared sticky
	// .scene-panel by the parent page based on the active slide.
	let { label = '' } = $props();
</script>

<div class="placeholder">
	<div class="mark" aria-hidden="true"></div>
	<p class="label">{label}</p>
	<p class="coming-soon">Visual coming soon</p>
</div>

<style>
	.placeholder {
		box-sizing: border-box;
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		text-align: center;
		padding: 2rem;
	}
	.mark {
		width: 3rem;
		height: 3rem;
		border-radius: 999px;
		border: 2px dashed color-mix(in srgb, var(--text-primary) 25%, transparent);
	}
	.label {
		max-width: 22rem;
		font-size: 1.05rem;
		font-weight: 600;
		color: var(--text-secondary);
		margin: 0;
	}
	.coming-soon {
		font-size: 0.78rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--text-muted);
		margin: 0;
	}
</style>
