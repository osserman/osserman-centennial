#!/usr/bin/env node
// Precompute a fixed force-directed layout for the citation graph, once, at
// build time — not in the browser on every page load. Shipping baked-in x/y
// coordinates is what makes "object constancy" (nodes never jump between
// narrative sections, only recolor/fade — see scrollytelling-project-context.md)
// straightforward: every section reuses this identical layout.
//
// All 1,032 citer edges point at the same single seed node (a star
// topology), so a plain forceLink-to-center layout would just collapse
// everything into a blob. Instead nodes are pulled toward a per-field
// cluster center arranged in a ring around the seed, which keeps the layout
// organized by field (useful both for the "by field" narrative section and
// for it to look coherent when field-based color/filter states are applied)
// without drawing on any edges for positioning.
//
// Usage: node scripts/compute-layout.mjs

import { forceSimulation, forceManyBody, forceX, forceY, forceCollide } from 'd3-force';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'static', 'data');

const raw = JSON.parse(readFileSync(path.join(DATA_DIR, 'graph_raw.json'), 'utf-8'));

// Same sizing function used at render time (CitationGraph.svelte) so the
// collision radius used for layout matches what's actually drawn.
function nodeRadius(node) {
	if (node.isSeed) return 22;
	const c = node.citedByCount || 0;
	return Math.min(14, 3 + Math.sqrt(c) * 0.9);
}

const fields = [...new Set(raw.nodes.filter((n) => !n.isSeed).map((n) => n.field))];
// Order by descending count so the largest cluster (Mathematics) anchors first;
// mostly cosmetic (affects which angle each field lands at), not load-bearing.
const fieldCounts = new Map();
for (const n of raw.nodes) if (!n.isSeed) fieldCounts.set(n.field, (fieldCounts.get(n.field) || 0) + 1);
fields.sort((a, b) => (fieldCounts.get(b) || 0) - (fieldCounts.get(a) || 0));

const RING_RADIUS = 420;
const clusterCenter = new Map();
fields.forEach((field, i) => {
	const angle = (i / fields.length) * 2 * Math.PI - Math.PI / 2;
	clusterCenter.set(field, {
		x: Math.cos(angle) * RING_RADIUS,
		y: Math.sin(angle) * RING_RADIUS
	});
});

const nodes = raw.nodes.map((n) => ({
	...n,
	radius: nodeRadius(n),
	// Seed pinned dead center — it's the one fixed point everything else is
	// arranged around, visually and narratively.
	...(n.isSeed ? { x: 0, y: 0, fx: 0, fy: 0 } : {})
}));

const simulation = forceSimulation(nodes)
	.force('charge', forceManyBody().strength(-6))
	.force('collide', forceCollide().radius((d) => d.radius + 1.5).iterations(2))
	.force(
		'x',
		forceX((d) => (d.isSeed ? 0 : clusterCenter.get(d.field).x)).strength((d) => (d.isSeed ? 0 : 0.12))
	)
	.force(
		'y',
		forceY((d) => (d.isSeed ? 0 : clusterCenter.get(d.field).y)).strength((d) => (d.isSeed ? 0 : 0.12))
	)
	.stop();

const TICKS = 400;
for (let i = 0; i < TICKS; i++) simulation.tick();

const xs = nodes.map((n) => n.x);
const ys = nodes.map((n) => n.y);
console.log(
	`Layout bounds: x [${Math.min(...xs).toFixed(0)}, ${Math.max(...xs).toFixed(0)}], ` +
		`y [${Math.min(...ys).toFixed(0)}, ${Math.max(...ys).toFixed(0)}]`
);
if (nodes.some((n) => !Number.isFinite(n.x) || !Number.isFinite(n.y))) {
	throw new Error('Layout produced non-finite coordinates for at least one node.');
}

const out = {
	seedId: raw.seedId,
	fields: fields.map((f) => ({ field: f, center: clusterCenter.get(f), count: fieldCounts.get(f) })),
	nodes: nodes.map(({ x, y, radius, fx, fy, ...rest }) => ({ ...rest, x, y, radius }))
};
writeFileSync(path.join(DATA_DIR, 'nodes.json'), JSON.stringify(out));
writeFileSync(path.join(DATA_DIR, 'edges.json'), JSON.stringify(raw.edges));

console.log(`Wrote ${path.join(DATA_DIR, 'nodes.json')}: ${out.nodes.length} nodes across ${fields.length} fields`);
console.log(`Wrote ${path.join(DATA_DIR, 'edges.json')}: ${raw.edges.length} edges`);
