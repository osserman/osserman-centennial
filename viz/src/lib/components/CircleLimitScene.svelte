<script>
	// The Circle Limit aside: the tiling Escher's prints are built on, lifted
	// out of the narrative so the main sequence can end on the parallel
	// postulate instead. Same disc, same colours, same conventions -- it just
	// no longer has to earn its place in the argument.
	import { onMount } from 'svelte';
	import { activePalette } from '$lib/palette.js';
	import { hypGeodesic, mobius } from '$lib/hyperbolic.js';

	let { } = $props();

	let canvas;
	let container;
	let ctx;
	let width = 0;
	let height = 0;
	let shift = $state(0); // how far the centre is dragged off, -1..1
	let density = $state(0.75);

	const smoothstep = (t) => {
		const x = Math.max(0, Math.min(1, t));
		return x * x * (3 - 2 * x);
	};
	const remap = (t, lo, hi) => Math.max(0, Math.min(1, (t - lo) / (hi - lo)));

	// ---------------------------------------------------------------------
	// The tiling under Circle Limit III.
	//
	// In that print the fish meet nose-to-nose FOUR at a time at some
	// junctions and THREE at a time at others, which is the (4,3,3) triangle
	// group: a fundamental triangle with angles 45/60/60 (sum 165 < 180, so
	// genuinely hyperbolic), reflected in its own sides for ever. Two sides
	// are diameters; the third is a geodesic, solved for below so the corner
	// angle comes out at exactly 60 deg.
	//
	// Worth knowing, and a nice sting given the beat before this one: the
	// white spines running through Escher's fish are NOT geodesics. Coxeter
	// showed they meet the boundary at about 80 deg, not 90 -- they are
	// hypercycles, curves at constant distance from a geodesic. Escher
	// believed he had drawn straight lines; he had not. The tiling underneath
	// them, which is what this draws, is built from true geodesics.
	// ---------------------------------------------------------------------
	const CL3_P = 4,
		CL3_Q = 3;
	function buildCircleLimitTiling(maxTriangles = 2600) {
		const bis = Math.PI / CL3_P / 2;
		const probe = (d) => {
			const r = Math.sqrt(d * d - 1);
			const cx = d * Math.cos(bis),
				cy = d * Math.sin(bis);
			const disc = r * r - cy * cy;
			if (disc < 0) return null;
			const t = cx - Math.sqrt(disc);
			const nx = t - cx,
				ny = -cy;
			let a = Math.abs(Math.atan2(nx, -ny));
			if (a > Math.PI / 2) a = Math.PI - a;
			return { t, a, r, cx, cy };
		};
		let lo = 1.0001,
			hi = 8;
		for (let i = 0; i < 120; i++) {
			const m = (lo + hi) / 2;
			const q = probe(m);
			if (!q || q.a < Math.PI / CL3_Q) lo = m;
			else hi = m;
		}
		const f = probe((lo + hi) / 2);
		const C = [f.cx, f.cy],
			rr = f.r;
		const cosA = Math.cos((2 * Math.PI) / CL3_P),
			sinA = Math.sin((2 * Math.PI) / CL3_P);
		const reflections = [
			(z) => [z[0], -z[1]],
			(z) => [cosA * z[0] + sinA * z[1], sinA * z[0] - cosA * z[1]],
			(z) => {
				const dx = z[0] - C[0],
					dy = z[1] - C[1];
				const d2 = dx * dx + dy * dy || 1e-12;
				return [C[0] + (rr * rr * dx) / d2, C[1] + (rr * rr * dy) / d2];
			}
		];
		const seed = [
			[0, 0],
			[f.t, 0],
			[f.t * Math.cos(Math.PI / CL3_P), f.t * Math.sin(Math.PI / CL3_P)]
		];
		const key = (tri) =>
			tri
				.map((q) => q[0].toFixed(4) + ',' + q[1].toFixed(4))
				.sort()
				.join('|');
		const out = [seed];
		const seen = new Set([key(seed)]);
		for (let i = 0; i < out.length && out.length < maxTriangles; i++) {
			for (const R of reflections) {
				const tri = out[i].map(R);
				// stop before the numerics degrade at the rim
				if (tri.some((q) => Math.hypot(q[0], q[1]) > 0.975)) continue;
				const k = key(tri);
				if (seen.has(k)) continue;
				seen.add(k);
				out.push(tri);
			}
		}
		return out;
	}
	const CL3_TILES = buildCircleLimitTiling();

	// The tiling's edges lie along complete geodesics, so rather than drawing
	// each edge as a stub we draw the whole line, boundary to boundary --
	// which is how the construction is normally shown, and reads far better.
	// Each line is stored as its two IDEAL endpoints (angles on the rim), so
	// the centre-shift can carry it by transforming just those two points.
	//
	// There are infinitely many such lines; every one further out is another
	// line. Lines whose closest approach to the centre exceeds LINE_REACH are
	// dropped -- they crowd the rim into solid ink without adding anything.
	const LINE_REACH = 0.88;
	const CL3_LINES = (() => {
		const seen = new Set();
		const out = [];
		for (const [ta, tb, tc] of CL3_TILES) {
			const q = reflectInGeodesic(ta, tb, tc);
			const p = tc;
			const a1 = 2 * p[0],
				b1 = 2 * p[1],
				c1 = p[0] * p[0] + p[1] * p[1] + 1;
			const a2 = 2 * q[0],
				b2 = 2 * q[1],
				c2 = q[0] * q[0] + q[1] * q[1] + 1;
			const det = a1 * b2 - a2 * b1;
			let e1, e2, reach;
			if (Math.abs(det) < 1e-9) {
				const ref = Math.hypot(q[0], q[1]) > Math.hypot(p[0], p[1]) ? q : p;
				const th = Math.atan2(ref[1], ref[0]);
				e1 = th;
				e2 = th + Math.PI;
				reach = 0; // a diameter passes through the centre
			} else {
				const Ox = (c1 * b2 - c2 * b1) / det,
					Oy = (a1 * c2 - a2 * c1) / det;
				const mag = Math.hypot(Ox, Oy);
				if (mag <= 1.0001) continue;
				reach = mag - Math.sqrt(mag * mag - 1);
				const ux = Ox / mag,
					uy = Oy / mag;
				const fx = ux / mag,
					fy = uy / mag;
				const sN = Math.sqrt(Math.max(0, 1 - 1 / (mag * mag)));
				e1 = Math.atan2(fy + sN * ux, fx - sN * uy);
				e2 = Math.atan2(fy - sN * ux, fx + sN * uy);
			}
			if (reach > LINE_REACH) continue;
			const k = [e1, e2].map((v) => (((v % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)).toFixed(4)).sort().join('|');
			if (seen.has(k)) continue;
			seen.add(k);
			out.push([e1, e2, reach]);
		}
		out.sort((x, y) => x[2] - y[2]); // draw inner lines first
		return out;
	})();

	// Reflect a point in the geodesic through two others -- inversion in that
	// circle, or a plain mirror when the two points are radial from the centre.
	function reflectInGeodesic(p, q, z) {
		const a1 = 2 * p[0],
			b1 = 2 * p[1],
			c1 = p[0] * p[0] + p[1] * p[1] + 1;
		const a2 = 2 * q[0],
			b2 = 2 * q[1],
			c2 = q[0] * q[0] + q[1] * q[1] + 1;
		const det = a1 * b2 - a2 * b1;
		if (Math.abs(det) < 1e-9) {
			// The geodesic is a diameter. Take the direction from whichever
			// point is further out: one of them is often the ORIGIN, and
			// normalising that gave a zero vector -- which silently turned the
			// mirror into a point-reflection and produced edges of unequal
			// length, i.e. not a tiling at all.
			const ref = Math.hypot(q[0], q[1]) > Math.hypot(p[0], p[1]) ? q : p;
			const L = Math.hypot(ref[0], ref[1]) || 1;
			const ux = ref[0] / L,
				uy = ref[1] / L;
			const d = z[0] * ux + z[1] * uy;
			return [2 * d * ux - z[0], 2 * d * uy - z[1]];
		}
		const Ox = (c1 * b2 - c2 * b1) / det,
			Oy = (a1 * c2 - a2 * c1) / det;
		const r2 = Ox * Ox + Oy * Oy - 1;
		const dx = z[0] - Ox,
			dy = z[1] - Oy;
		const m = dx * dx + dy * dy || 1e-12;
		return [Ox + (r2 * dx) / m, Oy + (r2 * dy) / m];
	}

	// Geodesic through two INTERIOR points: the circle through them that is
	// orthogonal to the boundary. |C|^2 = 1 + r^2 gives 2*C.p = |p|^2 + 1 for
	// each point, a 2x2 linear solve. A near-zero determinant means the two
	// points are radial from the centre, where the geodesic is a diameter.
	function drawGeodesicSeg(cx, cy, R, p, q) {
		const a1 = 2 * p[0],
			b1 = 2 * p[1],
			c1 = p[0] * p[0] + p[1] * p[1] + 1;
		const a2 = 2 * q[0],
			b2 = 2 * q[1],
			c2 = q[0] * q[0] + q[1] * q[1] + 1;
		const det = a1 * b2 - a2 * b1;
		if (Math.abs(det) < 1e-9) {
			ctx.moveTo(cx + p[0] * R, cy + p[1] * R);
			ctx.lineTo(cx + q[0] * R, cy + q[1] * R);
			return;
		}
		const Ox = (c1 * b2 - c2 * b1) / det,
			Oy = (a1 * c2 - a2 * c1) / det;
		const rad = Math.sqrt(Math.max(0, Ox * Ox + Oy * Oy - 1));
		const t1 = Math.atan2(p[1] - Oy, p[0] - Ox);
		const t2 = Math.atan2(q[1] - Oy, q[0] - Ox);
		let d = t2 - t1;
		while (d > Math.PI) d -= 2 * Math.PI;
		while (d < -Math.PI) d += 2 * Math.PI;
		// Start a fresh sub-path at the arc's own start. ctx.arc() otherwise
		// draws an implicit straight line from wherever the path currently is,
		// so batching many edges into one path chained them all together --
		// which is what turned the tiling into a web of crossing lines.
		ctx.moveTo(cx + p[0] * R, cy + p[1] * R);
		ctx.arc(cx + Ox * R, cy + Oy * R, rad * R, t1, t1 + d, d < 0);
	}


	function draw() {
		if (!ctx) return;
		const pal = activePalette();
		const R = Math.min(width, height) * 0.44;
		const cx = width / 2;
		const cy = height / 2;
		const a = [0.62 * shift, 0];

		ctx.clearRect(0, 0, width, height);
		ctx.globalAlpha = 1;
		ctx.beginPath();
		ctx.arc(cx, cy, R, 0, Math.PI * 2);
		ctx.fillStyle = pal.mapWater;
		ctx.fill();

		ctx.save();
		ctx.beginPath();
		ctx.arc(cx, cy, R, 0, Math.PI * 2);
		ctx.clip();

		// Drawn as EDGES, not extended into complete lines. The edges of this
		// tiling genuinely do not lie along whole geodesics: with vertex figure
		// 3.4.3.4.3.4 the angles satisfy a_tri + a_sq = 120, so three edges round
		// a vertex span 120 + a_tri, and a hyperbolic triangle forces a_tri < 60
		// -- never the 180 that collinearity would need. Extending them produced
		// lines cutting through the central square, which no tiling line can do.
		const shown = Math.floor(CL3_TILES.length * density);
		ctx.strokeStyle = pal.orange;
		ctx.lineWidth = 1;
		ctx.globalAlpha = 0.62;
		ctx.beginPath();
		for (let i = 0; i < shown; i++) {
			const [ta, tb, tc] = CL3_TILES[i];
			const mirrored = reflectInGeodesic(ta, tb, tc);
			if (Math.hypot(mirrored[0], mirrored[1]) > 0.995) continue;
			drawGeodesicSeg(cx, cy, R, mobius(tc, a), mobius(mirrored, a));
		}
		ctx.stroke();
		ctx.restore();

		ctx.globalAlpha = 1;
		ctx.beginPath();
		ctx.arc(cx, cy, R, 0, Math.PI * 2);
		ctx.strokeStyle = pal.textPrimary ?? '#0b0b0b';
		ctx.lineWidth = 2;
		ctx.stroke();
	}

	$effect(() => {
		void shift;
		void density;
		draw();
	});

	onMount(() => {
		ctx = canvas.getContext('2d');
		const ro = new ResizeObserver((entries) => {
			const r = entries[0].contentRect;
			if (!r.width || !r.height) return;
			const dpr = window.devicePixelRatio || 1;
			width = r.width;
			height = r.height;
			canvas.width = width * dpr;
			canvas.height = height * dpr;
			canvas.style.width = width + 'px';
			canvas.style.height = height + 'px';
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			draw();
		});
		ro.observe(container);
		return () => ro.disconnect();
	});
</script>

<div class="wrap" bind:this={container}>
	<canvas bind:this={canvas}></canvas>
	<div class="controls">
		<label>
			<span>Move the centre</span>
			<input type="range" min="-0.95" max="0.95" step="0.001" bind:value={shift} />
		</label>
		<label>
			<span>How far out to draw</span>
			<input type="range" min="0.15" max="1" step="0.01" bind:value={density} />
		</label>
	</div>
</div>

<style>
	.wrap {
		position: relative;
		width: 100%;
		height: 100%;
	}
	canvas {
		display: block;
	}
	.controls {
		position: absolute;
		left: 50%;
		bottom: 1.25rem;
		transform: translateX(-50%);
		display: flex;
		gap: 1.5rem;
		padding: 0.7rem 1.1rem;
		border-radius: 12px;
		background: color-mix(in srgb, var(--surface-1) 86%, transparent);
		backdrop-filter: blur(6px);
		box-shadow: 0 6px 24px rgba(0, 0, 0, 0.12);
	}
	.controls label {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		align-items: center;
		font-size: 0.8rem;
		color: var(--text-secondary);
	}
	.controls input[type='range'] {
		width: 11rem;
		accent-color: var(--accent);
	}
	@media (max-width: 700px) {
		.controls {
			flex-direction: column;
			gap: 0.5rem;
		}
	}
</style>
