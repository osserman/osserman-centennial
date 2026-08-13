<script>
	import CatenoidScene from '$lib/components/CatenoidScene.svelte';

	let t = $state(0);
	let area = $state(0);
</script>

<svelte:head>
	<title>Can you beat the cylinder?</title>
</svelte:head>

<main class="layout">
	<div class="text-panel">
		<h1>Can you beat the cylinder?</h1>
		<p class="prompt">
			Two rings, connected by the simplest possible surface — a cylinder. Is this the smallest
			possible surface connecting them?
		</p>

		<div class="control">
			<input type="range" min="0" max="1" step="0.001" bind:value={t} />
			<div class="area-readout">
				<span class="area-value">{area.toFixed(3)}</span>
				<span class="area-label">surface area</span>
			</div>
		</div>
	</div>

	<div class="scene-panel">
		<CatenoidScene {t} onAreaChange={(a) => (area = a)} />
	</div>
</main>

<style>
	.layout {
		display: flex;
		align-items: stretch;
		min-height: 100vh;
	}
	.text-panel {
		width: min(28vw, 24rem);
		flex-shrink: 0;
		padding: 3rem 2.5rem;
		border-right: 1px solid var(--surface-2);
	}
	h1 {
		font-size: 1.7rem;
		font-weight: 700;
		line-height: 1.2;
		letter-spacing: -0.01em;
		margin: 0 0 0.85rem;
	}
	.prompt {
		font-size: 1.05rem;
		line-height: 1.6;
		color: var(--text-secondary);
		margin: 0 0 2rem;
	}
	.control {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	input[type='range'] {
		width: 100%;
	}
	.area-readout {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
	}
	.area-value {
		font-size: 1.4rem;
		font-weight: 700;
		color: var(--text-primary);
	}
	.area-label {
		font-size: 0.78rem;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.03em;
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
			position: static;
			height: 60vh;
		}
	}
</style>
