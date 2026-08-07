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

// Rank-normalize a metric within *this dataset* (empirical percentile rank,
// 0-1) rather than trusting the metric's assumed theoretical range. This
// mattered in practice: citedByPctileYear's documented range is 0-100, but
// in this citer set it only ever actually falls between 91.5 and 99.5 — a
// straight /100 linear map compressed nearly the whole population into ~3px
// of a 34px range, which read as "everything's the same size" (it was, to
// the eye). Rank-within-dataset always uses the full visual range regardless
// of how narrow or skewed the raw values are. Missing values (~42% of
// citedByPctileYear; OpenAlex doesn't compute it for every work) get null
// rank and render at the floor size — a visible "no data" cue, not hidden.
function rankNormalized(list, valueFn) {
	const present = [];
	list.forEach((n, i) => {
		const v = valueFn(n);
		if (v != null) present.push({ i, v });
	});
	present.sort((a, b) => a.v - b.v);
	const rank = new Array(list.length).fill(null);
	present.forEach(({ i }, order) => {
		rank[i] = present.length > 1 ? order / (present.length - 1) : 1;
	});
	return rank;
}

// citers is defined below xValues but SIZE_METRICS is only invoked after
// that point (see layoutForMetric loop), so forward-reference is fine.
let percentileRank, yearPercentileRank;

// sqrt (not linear) for all three, for the same reason: raw citedByCount is
// long-tailed, so sqrt compresses it into an intuitively graduated visual
// spread. Applying sqrt to the two rank-normalized metrics too — rather than
// linear — gives all three the same graduated character instead of the
// percentile metrics reading as flatter/more clumped than citations.
const SIZE_METRICS = {
	citations: (n) => MIN_H + Math.sqrt(Math.min(n.citedByCount || 0, 900)) * 1.13,
	percentile: (n, i) =>
		percentileRank[i] == null ? MIN_H : MIN_H + Math.sqrt(percentileRank[i]) * (MAX_H - MIN_H),
	yearPercentile: (n, i) =>
		yearPercentileRank[i] == null ? MIN_H : MIN_H + Math.sqrt(yearPercentileRank[i]) * (MAX_H - MIN_H)
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
percentileRank = rankNormalized(citers, (n) => n.citationPctile);
yearPercentileRank = rankNormalized(citers, (n) => n.citedByPctileYear);

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
		const h = Math.max(MIN_H, Math.min(MAX_H, metricFn(n, i)));
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
