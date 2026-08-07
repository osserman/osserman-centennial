#!/usr/bin/env node
// Precompute fixed temporal-beeswarm layouts for the citation graph, once,
// at build time — not in the browser on every page load. Shipping baked-in
// x/y coordinates is what makes "object constancy" (nodes never jump between
// narrative sections, only recolor/fade — see scrollytelling-project-context.md)
// straightforward: every section reuses the identical x position and layout
// shape for a given size metric.
//
// x = publication date (linear, hand-rolled — no need for d3-scale for a
// single linear mapping), pinned per-node via `fx` so it never moves and is
// shared across all three size metrics below. With x fixed, forceCollide can
// only resolve overlaps in y, which is exactly the standard d3-force
// technique for a beeswarm/dodge plot: a weak forceY toward a center
// baseline keeps the swarm compact; collide pushes same-date (or near-date)
// papers apart vertically.
//
// Three sizing metrics are precomputed (not just three display sizes on one
// layout) because mark size feeds directly into the collision radius: a
// metric with a very different distribution than raw citation count needs
// its own y-dodge pass to stay overlap-free. Each metric's width/height/y is
// stored per node under `sizes.<metric>`; only x is shared.
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

const ASPECT = 0.72; // paper-proportioned (~page aspect), a discrete "document" shape, not a value bar
const MIN_H = 8;
const MAX_H = 42;

// Each metric maps a node to a height in [MIN_H, MAX_H]; width follows from
// ASPECT. sqrt for citedByCount specifically because raw counts are
// long-tailed (a handful of works with 500+ citations vs. most under 50);
// the two percentile metrics are already bounded/roughly-uniform so a linear
// map is enough. Missing data (citedByPctileYear has ~58% coverage) falls
// back to the minimum size rather than being hidden.
const SIZE_METRICS = {
	citations: (n) => MIN_H + Math.sqrt(Math.min(n.citedByCount || 0, 900)) * 1.13,
	percentile: (n) => MIN_H + Math.max(0, Math.min(1, n.citationPctile ?? 0)) * (MAX_H - MIN_H),
	yearPercentile: (n) =>
		n.citedByPctileYear == null ? MIN_H : MIN_H + (n.citedByPctileYear / 100) * (MAX_H - MIN_H)
};

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

const fixedX = citers.map((_, i) => timeToX(yearValues[i]));

function layoutForMetric(metricFn) {
	const nodes = citers.map((n, i) => {
		const h = Math.max(MIN_H, Math.min(MAX_H, metricFn(n)));
		return { width: h * ASPECT, height: h, fx: fixedX[i], y: 0 };
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

	if (nodes.some((n) => !Number.isFinite(n.y))) {
		throw new Error('Layout produced non-finite y for at least one node.');
	}
	return nodes.map((n) => ({ width: n.width, height: n.height, y: n.y }));
}

const perMetric = {};
for (const [key, fn] of Object.entries(SIZE_METRICS)) {
	perMetric[key] = layoutForMetric(fn);
	const ys = perMetric[key].map((n) => n.y);
	console.log(`[${key}] y bounds [${Math.min(...ys).toFixed(0)}, ${Math.max(...ys).toFixed(0)}]`);
}

const metricKeys = Object.keys(SIZE_METRICS);
const outNodes = citers.map((n, i) => {
	const sizes = {};
	for (const key of metricKeys) sizes[key] = perMetric[key][i];
	return { ...n, x: fixedX[i], sizes };
});

const out = {
	seedId: raw.seedId,
	timeDomain: [minYear, maxYear],
	sizeMetrics: metricKeys,
	nodes: outNodes
};
writeFileSync(path.join(DATA_DIR, 'nodes.json'), JSON.stringify(out));
// Still generated as a data artifact (citer -> seed edges) even though the
// redesigned CitationGraph no longer draws them — nothing left to connect
// to visually once the seed isn't rendered, but the relationship itself
// stays available in raw form.
writeFileSync(path.join(DATA_DIR, 'edges.json'), JSON.stringify(raw.edges));

console.log(`Wrote ${path.join(DATA_DIR, 'nodes.json')}: ${outNodes.length} nodes (seed excluded), metrics: ${metricKeys.join(', ')}`);
console.log(`Wrote ${path.join(DATA_DIR, 'edges.json')}: ${raw.edges.length} edges`);
