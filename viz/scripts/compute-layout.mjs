#!/usr/bin/env node
// Precompute a fixed temporal-beeswarm layout for the citation graph, once,
// at build time — not in the browser on every page load. Shipping baked-in
// x/y coordinates is what makes "object constancy" (nodes never jump between
// narrative sections, only recolor/fade — see scrollytelling-project-context.md)
// straightforward: every section reuses this identical layout.
//
// x = publication date (linear, hand-rolled — no need for d3-scale for a
// single linear mapping), pinned per-node via `fx` so it never moves. With
// x fixed, forceCollide can only resolve overlaps in y, which is exactly
// the standard d3-force technique for a beeswarm/dodge plot: a weak forceY
// toward a center baseline keeps the swarm compact; collide pushes
// same-date (or near-date) papers apart vertically.
//
// The Osserman seed itself is excluded from this layout entirely (not just
// hidden) — it isn't citing anything, so it has no natural position on a
// "when did this paper cite the Survey" axis. See CitationGraph.svelte for
// how the seed's old "hub" role is replaced with a static page caption.
//
// Usage: node scripts/compute-layout.mjs

import { forceSimulation, forceY, forceCollide } from 'd3-force';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'static', 'data');

const raw = JSON.parse(readFileSync(path.join(DATA_DIR, 'graph_raw.json'), 'utf-8'));

// Same sizing function used at render time (CitationGraph.svelte) so the
// collision footprint used for layout matches what's actually drawn.
// Paper-proportioned (~0.72 width:height, echoing a page), both dimensions
// scaled by sqrt(citedByCount) — a discrete "document" shape, not a value bar.
const ASPECT = 0.72;
function nodeSize(node) {
	const c = node.citedByCount || 0;
	const h = Math.min(42, 8 + Math.sqrt(c) * 2.6);
	return { width: h * ASPECT, height: h };
}

function fractionalYear(dateStr, fallbackYear) {
	if (!dateStr) return fallbackYear;
	const d = new Date(dateStr + 'T00:00:00Z');
	const startOfYear = Date.UTC(d.getUTCFullYear(), 0, 1);
	const startOfNextYear = Date.UTC(d.getUTCFullYear() + 1, 0, 1);
	const frac = (d.getTime() - startOfYear) / (startOfNextYear - startOfYear);
	return d.getUTCFullYear() + frac;
}

const citers = raw.nodes.filter((n) => !n.isSeed);
const yearValues = citers.map((n) => fractionalYear(n.publicationDate, n.year));
const minYear = Math.min(...yearValues);
const maxYear = Math.max(...yearValues);

const HALF_WIDTH = 650;
function timeToX(yearValue) {
	const t = (yearValue - minYear) / (maxYear - minYear || 1);
	return t * HALF_WIDTH * 2 - HALF_WIDTH;
}

const nodes = citers.map((n, i) => {
	const { width, height } = nodeSize(n);
	return {
		...n,
		width,
		height,
		fx: timeToX(yearValues[i]),
		y: 0
	};
});

const simulation = forceSimulation(nodes)
	.force('y', forceY(0).strength(0.06))
	.force(
		'collide',
		forceCollide()
			.radius((d) => Math.hypot(d.width, d.height) / 2 + 1)
			.iterations(3)
	)
	.stop();

const TICKS = 600;
for (let i = 0; i < TICKS; i++) simulation.tick();

const ys = nodes.map((n) => n.y);
console.log(
	`Layout bounds: x [${-HALF_WIDTH}, ${HALF_WIDTH}] (time ${minYear.toFixed(1)}-${maxYear.toFixed(1)}), ` +
		`y [${Math.min(...ys).toFixed(0)}, ${Math.max(...ys).toFixed(0)}]`
);
if (nodes.some((n) => !Number.isFinite(n.x ?? n.fx) || !Number.isFinite(n.y))) {
	throw new Error('Layout produced non-finite coordinates for at least one node.');
}

const out = {
	seedId: raw.seedId,
	timeDomain: [minYear, maxYear],
	nodes: nodes.map((n) => ({ ...n, x: n.fx, fx: undefined, vx: undefined, vy: undefined, index: undefined }))
};
writeFileSync(path.join(DATA_DIR, 'nodes.json'), JSON.stringify(out));
// Still generated as a data artifact (citer -> seed edges) even though the
// redesigned CitationGraph no longer draws them — nothing left to connect
// to visually once the seed isn't rendered, but the relationship itself
// stays available in raw form.
writeFileSync(path.join(DATA_DIR, 'edges.json'), JSON.stringify(raw.edges));

console.log(`Wrote ${path.join(DATA_DIR, 'nodes.json')}: ${out.nodes.length} nodes (seed excluded)`);
console.log(`Wrote ${path.join(DATA_DIR, 'edges.json')}: ${raw.edges.length} edges`);
