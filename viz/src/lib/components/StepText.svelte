<script>
	let { step } = $props();

	// Minimal **bold** support — the draft text uses it sparingly for the
	// headline numbers ("1,000", "300"). Not a full markdown parser on purpose.
	function renderInline(text) {
		return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
	}
</script>

<div class="step-text">
	{#if step.kicker}
		<div class="kicker">{step.kicker}</div>
	{/if}
	<h2>{step.heading}</h2>
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
	.kicker {
		font-size: 0.78rem;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--text-secondary);
		margin-bottom: 0.5rem;
	}
	h2 {
		font-size: 1.5rem;
		line-height: 1.25;
		margin: 0 0 0.75rem;
	}
	.subheading {
		color: var(--text-secondary);
		font-size: 1.05rem;
		margin-top: -0.4rem;
	}
	p {
		margin: 0 0 0.9rem;
		color: var(--text-primary);
	}
	ul {
		margin: 0 0 0.9rem;
		padding-left: 1.2rem;
	}
	li {
		margin-bottom: 0.35rem;
	}
	.open-question {
		margin-top: 1rem;
		padding: 0.7rem 0.85rem;
		border-left: 2px solid var(--text-secondary);
		background: rgba(0, 0, 0, 0.03);
		font-size: 0.88rem;
		color: var(--text-secondary);
		line-height: 1.5;
	}
	.open-question-label {
		display: block;
		font-weight: 600;
		font-size: 0.72rem;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		margin-bottom: 0.2rem;
	}
</style>
