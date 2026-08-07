<script>
	// Click-to-open paper detail modal. Hover (in CitationGraph) stays a
	// lightweight tooltip; this is the fuller view — abstract, DOI, impact
	// metrics, and (when applicable) which narrative section/pathway the
	// paper was curated into.
	import { onMount } from 'svelte';
	import InfoTooltip from './InfoTooltip.svelte';

	let { node, curatedEntry = null, onClose } = $props();

	function humanize(slug) {
		return slug.replace(/_/g, ' ');
	}

	function handleKeydown(evt) {
		if (evt.key === 'Escape') onClose();
	}

	onMount(() => {
		window.addEventListener('keydown', handleKeydown);
		return () => window.removeEventListener('keydown', handleKeydown);
	});
</script>

<!-- Backdrop-click is a supplementary dismiss for mouse users; Escape (handled
     above via the window listener) is the keyboard-accessible path. -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="backdrop" onclick={onClose} role="presentation">
	<div
		class="panel"
		role="dialog"
		aria-modal="true"
		aria-labelledby="paper-detail-title"
		onclick={(e) => e.stopPropagation()}
	>
		<button class="close" onclick={onClose} aria-label="Close">&times;</button>

		{#if curatedEntry}
			<div class="curated-tags">
				<span class="tag">{humanize(curatedEntry.section)}</span>
				<span class="tag">{humanize(curatedEntry.pathway)}</span>
			</div>
		{/if}

		<h3 id="paper-detail-title">{node.title}</h3>
		<div class="meta">
			{node.authors ? node.authors + ' · ' : ''}{node.year}
			{#if node.field}· {node.field}{#if node.subfield} ({node.subfield}){/if}{/if}
		</div>

		{#if node.topic}
			<div class="topic-row">
				<span class="topic-label">OpenAlex topic</span>
				<span class="topic-value">{node.topic}</span>
				<InfoTooltip
					label="About OpenAlex topics"
					message="OpenAlex's automated topic classification is not always accurate, especially for older or interdisciplinary papers — treat this as a hint, not ground truth."
				/>
			</div>
		{/if}

		<div class="stats">
			<div class="stat"><span class="stat-value">{node.citedByCount ?? '—'}</span><span class="stat-label">citations</span></div>
			<div class="stat">
				<span class="stat-value">{node.fwci != null ? node.fwci.toFixed(2) : '—'}</span>
				<span class="stat-label">FWCI{node.top10Percent ? ' · top 10%' : ''}</span>
			</div>
		</div>

		{#if node.abstract}
			<p class="abstract">{node.abstract}</p>
		{:else}
			<p class="abstract muted">No abstract available.</p>
		{/if}

		{#if node.doi}
			<a class="doi-link" href="https://doi.org/{node.doi}" target="_blank" rel="noopener noreferrer">
				View at doi.org/{node.doi} ↗
			</a>
		{/if}
	</div>
</div>

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.45);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 1.5rem;
	}
	.panel {
		position: relative;
		background: var(--surface-1);
		color: var(--text-primary);
		border-radius: 12px;
		max-width: 32rem;
		width: 100%;
		max-height: 80vh;
		overflow-y: auto;
		padding: 2rem;
		box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
	}
	.close {
		position: absolute;
		top: 0.75rem;
		right: 0.9rem;
		background: none;
		border: none;
		font-size: 1.5rem;
		line-height: 1;
		color: var(--text-secondary);
		cursor: pointer;
		padding: 0.25rem;
	}
	.close:hover {
		color: var(--text-primary);
	}
	.curated-tags {
		display: flex;
		gap: 0.4rem;
		margin-bottom: 0.75rem;
	}
	.tag {
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--accent);
		border: 1px solid var(--accent);
		border-radius: 999px;
		padding: 0.15rem 0.55rem;
	}
	h3 {
		font-size: 1.3rem;
		line-height: 1.3;
		margin: 0 0 0.5rem;
		padding-right: 1.5rem;
	}
	.meta {
		color: var(--text-secondary);
		font-size: 0.9rem;
		margin-bottom: 0.6rem;
	}
	.topic-row {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.82rem;
		color: var(--text-secondary);
		margin-bottom: 1.25rem;
	}
	.topic-label {
		text-transform: uppercase;
		letter-spacing: 0.04em;
		font-size: 0.68rem;
		font-weight: 700;
		color: var(--text-muted);
	}
	.topic-value {
		color: var(--text-primary);
	}
	.stats {
		display: flex;
		gap: 1.75rem;
		margin-bottom: 1.25rem;
		padding-bottom: 1.25rem;
		border-bottom: 1px solid var(--surface-2);
	}
	.stat {
		display: flex;
		flex-direction: column;
	}
	.stat-value {
		font-size: 1.4rem;
		font-weight: 700;
	}
	.stat-label {
		font-size: 0.75rem;
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}
	.abstract {
		font-size: 0.92rem;
		line-height: 1.55;
		color: var(--text-primary);
	}
	.abstract.muted {
		color: var(--text-secondary);
		font-style: italic;
	}
	.doi-link {
		display: inline-block;
		margin-top: 0.75rem;
		font-size: 0.85rem;
		color: var(--accent);
		text-decoration: none;
		word-break: break-all;
	}
	.doi-link:hover {
		text-decoration: underline;
	}
</style>
