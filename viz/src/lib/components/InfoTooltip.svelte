<script>
	// Small "ⓘ" hover/focus-triggered tooltip. Custom rather than a native
	// title="" attribute — title is unreliable to notice (no visual affordance
	// beyond the cursor, slow OS-controlled delay) and impossible to verify
	// in an automated screenshot pass.
	// placement 'top' (default) opens upward from the icon; 'bottom' opens
	// downward — needed wherever the icon sits close to the top edge of its
	// scroll container (e.g. the graph caption), where an upward tooltip has
	// nowhere to go and clips off-screen.
	let { message, label = 'More information', placement = 'top' } = $props();
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<span class="info-icon" tabindex="0" role="button" aria-label={label}>
	ⓘ
	<span class="info-tooltip placement-{placement}" role="tooltip">{message}</span>
</span>

<style>
	.info-icon {
		position: relative;
		display: inline-flex;
		cursor: help;
		color: var(--text-muted);
		font-size: 0.85rem;
		outline: none;
	}
	.info-tooltip {
		position: absolute;
		left: 50%;
		transform: translateX(-50%);
		width: 15rem;
		background: var(--text-primary);
		color: var(--surface-1);
		font-size: 0.75rem;
		line-height: 1.4;
		font-weight: 400;
		text-transform: none;
		letter-spacing: normal;
		padding: 0.55rem 0.7rem;
		border-radius: 6px;
		box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
		opacity: 0;
		visibility: hidden;
		transition: opacity 0.15s ease;
		pointer-events: none;
		z-index: 30;
	}
	.placement-top {
		bottom: calc(100% + 8px);
	}
	.placement-bottom {
		top: calc(100% + 8px);
	}
	.placement-top::after,
	.placement-bottom::after {
		content: '';
		position: absolute;
		left: 50%;
		transform: translateX(-50%);
		border: 5px solid transparent;
	}
	.placement-top::after {
		top: 100%;
		border-top-color: var(--text-primary);
	}
	.placement-bottom::after {
		bottom: 100%;
		border-bottom-color: var(--text-primary);
	}
	.info-icon:hover .info-tooltip,
	.info-icon:focus .info-tooltip,
	.info-icon:focus-visible .info-tooltip {
		opacity: 1;
		visibility: visible;
	}
</style>
