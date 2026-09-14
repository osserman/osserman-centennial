<script>
	// A compact list of curated papers for one field-level narrative step,
	// each collapsed behind a native <details>/<summary> — "scholarly
	// footpaths for readers who want to go deeper," not cards competing with
	// the field's own narrative above them (see stanza-iii-revision-brief.md).
	// Left uncontrolled (no bound `open`): <details> keeps its own state
	// natively, and since a field's ScrollyStep content is never unmounted as
	// the reader scrolls elsewhere (see ScrollyStep.svelte), that state
	// persists on its own with no extra wiring.
	//
	// `onToggle(paperId, isOpen)` fires on every open/close so the page can
	// spotlight whichever papers are currently expanded on the citation graph
	// (see beyond-mathematics/+page.svelte's expandedPaperIds). `onSelectPaper`
	// is the same callback StepText already threads through for the
	// click-to-open PaperDetail modal — "Full citation details" here reaches
	// the same richer view (abstract, DOI, citation stats), not a second one.
	let { papers = [], onToggle, onSelectPaper } = $props();

	// Same minimal convention as every other step-rendering component.
	function renderInline(text) {
		return text.replace(/\*\*(.+?)\*\*/g, '<strong class="stat">$1</strong>');
	}
</script>

<div class="paper-list">
	{#each papers as paper (paper.paperId)}
		<details ontoggle={(e) => onToggle?.(paper.paperId, e.currentTarget.open)}>
			<summary>
				<span class="paper-title">{paper.title}</span>
				{#if paper.year}<span class="paper-year">{paper.year}</span>{/if}
			</summary>
			<div class="paper-body">
				{#each paper.body as para}
					<p>{@html renderInline(para)}</p>
				{/each}
				{#if paper.openQuestion}
					<aside class="open-question">
						<span class="open-question-label">Open question</span>
						{paper.openQuestion}
					</aside>
				{/if}
				<button type="button" class="paper-more" onclick={() => onSelectPaper?.(paper.paperId)}>
					Full citation details ↗
				</button>
			</div>
		</details>
	{/each}
</div>

<style>
	.paper-list {
		margin-top: 1.1rem;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}
	details {
		border: 1px solid var(--surface-2);
		border-radius: 8px;
		background: var(--surface-2);
	}
	summary {
		display: flex;
		align-items: baseline;
		gap: 0.6rem;
		padding: 0.65rem 0.85rem;
		font-size: 0.92rem;
		font-weight: 600;
		color: var(--text-primary);
		cursor: pointer;
		list-style: none;
	}
	summary::-webkit-details-marker {
		display: none;
	}
	/* A quiet disclosure triangle of our own, since the native one is hidden
	   above — rotates open rather than swapping glyphs, so it doesn't jump. */
	summary::before {
		content: '▸';
		display: inline-block;
		flex-shrink: 0;
		color: var(--text-muted);
		transition: transform 0.15s ease;
	}
	details[open] > summary::before {
		transform: rotate(90deg);
	}
	.paper-title {
		flex: 1;
		min-width: 0;
	}
	.paper-year {
		flex-shrink: 0;
		font-weight: 400;
		font-size: 0.82rem;
		color: var(--text-muted);
	}
	.paper-body {
		padding: 0 0.85rem 0.9rem 2.1rem;
		font-size: 0.9rem;
		line-height: 1.55;
	}
	.paper-body p {
		margin: 0 0 0.75rem;
		color: var(--text-secondary);
	}
	.paper-body p:last-of-type {
		margin-bottom: 0.75rem;
	}
	.paper-body :global(.stat) {
		color: var(--accent);
		font-weight: 700;
	}
	.open-question {
		margin: 0 0 0.75rem;
		padding: 0.6rem 0.75rem;
		border-left: 3px solid var(--accent);
		background: var(--surface-1);
		border-radius: 0 6px 6px 0;
		font-size: 0.85rem;
		color: var(--text-secondary);
		line-height: 1.5;
	}
	.open-question-label {
		display: block;
		font-weight: 700;
		font-size: 0.68rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--text-muted);
		margin-bottom: 0.25rem;
	}
	.paper-more {
		background: none;
		border: none;
		padding: 0;
		font: inherit;
		font-size: 0.82rem;
		color: var(--accent);
		cursor: pointer;
	}
	.paper-more:hover,
	.paper-more:focus-visible {
		text-decoration: underline;
		text-underline-offset: 3px;
	}
</style>
