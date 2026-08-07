<script>
	let { step } = $props();

	// Minimal **bold** support — the draft text uses it sparingly for the
	// headline numbers ("1,000", "300"). Not a full markdown parser on purpose.
	function renderInline(text) {
		return text.replace(/\*\*(.+?)\*\*/g, '<strong class="stat">$1</strong>');
	}
</script>

<div class="step-text">
	{#if step.kind === 'paper'}
		<h3 class="paper-title">{step.heading}</h3>
	{:else}
		<h2>{step.heading}</h2>
	{/if}
	{#if step.subheading}
		<p class="subheading">{step.subheading}</p>
	{/if}
	{#each step.body as para}
		<p>{@html renderInline(para)}</p>
	{/each}
	{#if step.list?.length}
		<ul>
			{#each step.list as item}
				<li>{item}</li>
			{/each}
		</ul>
	{/if}
	{#if step.openQuestion}
		<aside class="open-question">
			<span class="open-question-label">Open question</span>
			{step.openQuestion}
		</aside>
	{/if}
</div>

<style>
	.step-text {
		max-width: 34ch;
		font-size: 1.05rem;
		line-height: 1.6;
	}
	h2 {
		font-size: 1.7rem;
		font-weight: 700;
		line-height: 1.2;
		letter-spacing: -0.01em;
		color: var(--text-primary);
		margin: 0 0 0.85rem;
	}
	.paper-title {
		font-size: 1.2rem;
		font-weight: 600;
		font-style: italic;
		line-height: 1.35;
		color: var(--text-primary);
		border-left: 3px solid var(--accent);
		padding-left: 0.75rem;
		margin: 0 0 0.85rem;
	}
	.subheading {
		color: var(--text-secondary);
		font-size: 1.05rem;
		font-style: italic;
		margin-top: -0.5rem;
	}
	p {
		margin: 0 0 0.9rem;
		color: var(--text-primary);
	}
	.stat {
		color: var(--accent);
		font-weight: 700;
	}
	ul {
		margin: 0 0 0.9rem;
		padding-left: 1.2rem;
		color: var(--text-primary);
	}
	li {
		margin-bottom: 0.35rem;
	}
	li::marker {
		color: var(--accent);
	}
	.open-question {
		margin-top: 1rem;
		padding: 0.7rem 0.85rem;
		border-left: 3px solid var(--accent);
		background: var(--surface-2);
		border-radius: 0 6px 6px 0;
		font-size: 0.88rem;
		color: var(--text-secondary);
		line-height: 1.5;
	}
	.open-question-label {
		display: block;
		font-weight: 700;
		font-size: 0.72rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--text-muted);
		margin-bottom: 0.3rem;
	}
</style>
