<script>
	// Dev harness -- NOT part of the narrative, not linked from any nav.
	// Two things the scrollytelling page makes tedious to iterate on:
	//
	//   1. Scrubbing AzimuthalProjectionScene's progress without scrolling
	//      several thousand vh to reach it (and re-scrolling after every
	//      edit). The scene here is the real component, same props, so
	//      whatever gets tuned against this harness is what ships.
	//   2. Dialling in geoPolarPetal's own parameters (lobes/spread/bow/
	//      profile) against real coastlines, live, before any of it gets
	//      committed to a scroll-driven sequence.
	//
	// Deliberately kept out of the story's own visual language (plain
	// controls, visible numbers) -- it's an instrument, not a page.
	import { onMount } from 'svelte';
	import { geoPath, geoGraticule10 } from 'd3-geo';
	import { geoPolarPetal } from 'radial-petal-projection';
	import AzimuthalProjectionScene, {
		MERIDIANS_START,
		MERIDIANS_END,
		TISSOT_END,
		SPLIT_START,
		SPLIT_END,
		FLATTEN_END,
		EQUATOR_END,
		ANGLES_END,
		TOUR_END,
		DRAG_END,
		RETURN_END,
		STEREO_END,
		ZOOM_END,
		DISC_END,
		GEODESIC_END,
		SHIFT_END,
		ESCHER_END
	} from '$lib/components/AzimuthalProjectionScene.svelte';
	import { activePalette } from '$lib/palette.js';
	import { landFeatures } from '$lib/coastlines.js';

	// ---------- section 1: scene scrubber ----------
	let sceneProgress = $state(0);
	let playing = $state(false);
	let sceneDebug = $state(true);
	// live knobs for the stereographic morph framing
	let stereoClipDeg = $state(176);
	let anchorColat = $state(120);
	let holdMorph = $state(1.1);
	let holdZoom = $state(0.2426);
	const _fr = (r, t) => r + (2 * Math.tan(r / 2) - r) * t;
	const zoomSchedule = $derived.by(() => {
		const D = Math.PI / 180;
		const start = (0.853 * Math.PI) / _fr(153.5 * D, 0);
		const morph = (holdMorph * Math.PI) / _fr(anchorColat * D, 1);
		const out = (holdZoom * Math.PI) / _fr(anchorColat * D, 1);
		return { start, morph, out, bounce: morph > start + 0.01 };
	});
	const resetStereo = () => {
		stereoClipDeg = 176;
		anchorColat = 120;
		holdMorph = 1.1;
		holdZoom = 0.2426;
	};

	// Named stage boundaries, so a beat can be jumped to directly instead of
	// hunted for by dragging. Values come from the scene's own exports --
	// never duplicated here, so they can't drift out of sync with it.
	const MARKS = [
		['start · globe', 0],
		['cuts in', MERIDIANS_START],
		['cuts done', MERIDIANS_END],
		['tissot done', TISSOT_END],
		['hold', SPLIT_START],
		['side-by-side', SPLIT_END],
		['flattened', FLATTEN_END],
		['equator', EQUATOR_END],
		['right angles', ANGLES_END],
		['tour end', TOUR_END],
		['free drag', TOUR_END + 0.15],
		['back to pole', RETURN_END],
		['stereographic', STEREO_END],
		['zoomed out', ZOOM_END],
		['Poincaré', DISC_END],
		['geodesics', GEODESIC_END],
		['centre shift', SHIFT_END],
		['Escher web', ESCHER_END]
	];

	function nudge(delta) {
		sceneProgress = Math.min(ESCHER_END, Math.max(0, +(sceneProgress + delta).toFixed(4)));
	}

	function onKey(e) {
		if (e.target.tagName === 'INPUT' && e.target.type === 'range') return;
		if (e.key === 'ArrowRight') nudge(e.shiftKey ? 0.001 : 0.01);
		else if (e.key === 'ArrowLeft') nudge(e.shiftKey ? -0.001 : -0.01);
		else if (e.key === ' ') {
			e.preventDefault();
			playing = !playing;
		}
	}

	onMount(() => {
		let raf,
			last = performance.now();
		const tick = (now) => {
			const dt = (now - last) / 1000;
			last = now;
			if (playing) {
				sceneProgress += dt * 0.13;
				if (sceneProgress >= ESCHER_END) {
					sceneProgress = ESCHER_END;
					playing = false;
				}
			}
			raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	});

	// ---------- section 2: petal playground ----------
	let lobes = $state(12);
	let spread = $state(1);
	let bow = $state(1);
	let profile = $state('gore');
	let showGraticule = $state(true);
	let showLand = $state(true);

	const PROFILES = ['gore', 'sine', 'vesica', 'leaf'];

	const land = { type: 'FeatureCollection', features: landFeatures };
	const graticule = geoGraticule10();

	let petalCanvas;
	let petalCtx;
	let petalSize = $state(0);

	function drawPetal() {
		if (!petalCtx || !petalSize) return;
		const pal = activePalette();
		const s = petalSize;
		petalCtx.clearRect(0, 0, s, s);

		const proj = geoPolarPetal()
			.lobes(lobes)
			.bow(bow)
			.spread(spread)
			.profile(profile)
			.translate([s / 2, s / 2])
			.scale((s * 0.46) / Math.PI);
		const path = geoPath(proj, petalCtx);

		petalCtx.beginPath();
		path({ type: 'Sphere' });
		petalCtx.fillStyle = pal.mapWater;
		petalCtx.fill();

		if (showLand) {
			petalCtx.fillStyle = pal.mapLand;
			for (const f of land.features) {
				petalCtx.beginPath();
				path(f);
				petalCtx.fill();
			}
		}

		if (showGraticule) {
			petalCtx.beginPath();
			path(graticule);
			petalCtx.strokeStyle = pal.textPrimary;
			petalCtx.globalAlpha = 0.22;
			petalCtx.lineWidth = 0.6;
			petalCtx.stroke();
			petalCtx.globalAlpha = 1;
		}

		petalCtx.beginPath();
		path({ type: 'Sphere' });
		petalCtx.strokeStyle = pal.textPrimary;
		petalCtx.globalAlpha = 0.5;
		petalCtx.lineWidth = 1;
		petalCtx.stroke();
		petalCtx.globalAlpha = 1;
	}

	$effect(() => {
		// re-draw on any control change
		void lobes;
		void spread;
		void bow;
		void profile;
		void showGraticule;
		void showLand;
		void petalSize;
		drawPetal();
	});

	// ---------- section 3: the gore that won't fit ----------
	// One construction, three geometries. Cut a disc of radius rhoMax around a
	// point into n gores and lay them flat. How much material each gore has at
	// distance rho is set entirely by the circumference of the circle at that
	// radius:
	//
	//   S(rho) = sin(rho)/k  (positive curvature)   circumference < 2*pi*rho
	//          = rho         (flat)                 circumference = 2*pi*rho
	//          = sinh(rho)/k (negative curvature)   circumference > 2*pi*rho
	//
	// w = S(rho)/rho is then literally "how many full turns of material you
	// have to fit into one turn of flat space": below 1 the gores leave gaps
	// (a sphere's peel is too small), above 1 they overlap (a hyperbolic
	// plane's peel is too big). That single number is why neither can be
	// flattened -- and, for the negative case, why no such surface fits in
	// ordinary space at all: the excess never stops accumulating.
	let curvature = $state(-1);
	let goreLobes = $state(12);
	let rhoMax = $state(2);
	let goreCanvas, goreCtx;
	let goreSize = $state(0);

	function S(rho, c) {
		if (Math.abs(c) < 1e-9) return rho;
		if (c > 0) {
			const k = Math.sqrt(c);
			return Math.sin(k * rho) / k;
		}
		const k = Math.sqrt(-c);
		return Math.sinh(k * rho) / k;
	}
	const widthFactor = (rho, c) => (rho < 1e-9 ? 1 : S(rho, c) / rho);
	// A positively curved disc can't extend past its own antipode.
	const effectiveRho = $derived(curvature > 1e-9 ? Math.min(rhoMax, Math.PI / Math.sqrt(curvature)) : rhoMax);
	const rimW = $derived(widthFactor(effectiveRho, curvature));

	function drawGores() {
		if (!goreCtx || !goreSize) return;
		const pal = activePalette();
		const size = goreSize,
			cx = size / 2,
			cy = size / 2,
			R = size * 0.42;
		const n = goreLobes,
			rMax = effectiveRho;
		goreCtx.clearRect(0, 0, size, size);

		// the disc the material has to fit into
		goreCtx.beginPath();
		goreCtx.arc(cx, cy, R, 0, Math.PI * 2);
		goreCtx.strokeStyle = pal.textPrimary;
		goreCtx.globalAlpha = 0.25;
		goreCtx.lineWidth = 1;
		goreCtx.setLineDash([4, 4]);
		goreCtx.stroke();
		goreCtx.setLineDash([]);
		goreCtx.globalAlpha = 1;

		const STEPS = 90;
		const pt = (rho, ang) => [cx + (rho / rMax) * R * Math.cos(ang), cy + (rho / rMax) * R * Math.sin(ang)];

		for (let k = 0; k < n; k++) {
			const centre = (2 * Math.PI * k) / n;
			goreCtx.beginPath();
			for (let i = 0; i <= STEPS; i++) {
				const rho = (rMax * i) / STEPS;
				const [x, y] = pt(rho, centre - (Math.PI / n) * widthFactor(rho, curvature));
				i ? goreCtx.lineTo(x, y) : goreCtx.moveTo(x, y);
			}
			for (let i = STEPS; i >= 0; i--) {
				const rho = (rMax * i) / STEPS;
				const [x, y] = pt(rho, centre + (Math.PI / n) * widthFactor(rho, curvature));
				goreCtx.lineTo(x, y);
			}
			goreCtx.closePath();
			// translucent so overlapping material reads as darker -- the excess
			// is the whole point in the negative case
			goreCtx.fillStyle = pal.orange;
			goreCtx.globalAlpha = 0.28;
			goreCtx.fill();
			goreCtx.globalAlpha = 0.9;
			goreCtx.strokeStyle = pal.orange;
			goreCtx.lineWidth = 1.25;
			goreCtx.stroke();
			goreCtx.globalAlpha = 1;
		}
	}

	$effect(() => {
		void curvature;
		void goreLobes;
		void rhoMax;
		void goreSize;
		drawGores();
	});

	// ---------- section 4: expanding vs shrinking circles ----------
	// The same experiment on both surfaces: circles of identical TRUE size,
	// stepped outward at equal TRUE distances from the centre. Both maps are
	// conformal, so a circle on the surface is still a circle on screen --
	// only its size can lie, which is exactly what we want to look at.
	//
	// The two radial maps differ by a single character:
	//
	//   sphere, stereographic :  r = 2 * tan (c/2)     -> unbounded
	//   hyperbolic, Poincare  :  r =     tanh(d/2)     -> approaches 1
	//
	// tan runs away to infinity, so the sphere's circles swell without limit
	// and its rim is infinitely far OUT -- you can never draw all of it.
	// tanh saturates, so hyperbolic circles shrink toward a rim that sits at
	// a finite screen distance but an infinite distance in the space -- the
	// whole infinite plane fits, and you can never reach the edge.
	let circleTrueSize = $state(0.4);
	let circleRings = $state(7);
	let circleDirs = $state(8);
	let cmpCanvas, cmpCtx;
	let cmpW = $state(0);

	// image circle = the interval between a circle's near and far radial points
	const imageCircle = (near, far) => ({ c: (near + far) / 2, r: (far - near) / 2 });
	const stereoCircle = (c, a) => imageCircle(2 * Math.tan((c - a) / 2), 2 * Math.tan((c + a) / 2));
	const poincareCircle = (d, p) => imageCircle(Math.tanh((d - p) / 2), Math.tanh((d + p) / 2));

	function drawComparison() {
		if (!cmpCtx || !cmpW) return;
		const pal = activePalette();
		const H = cmpW * 0.52,
			half = cmpW / 2,
			R = Math.min(half, H) * 0.42;
		cmpCtx.clearRect(0, 0, cmpW, H);

		const n = circleRings;
		// same experiment either side: equal true steps, out toward the edge
		const cMax = 150 * (Math.PI / 180),
			dMax = 5.3;
		const aTrue = circleTrueSize * 0.35; // sphere circle radius, radians
		const pTrue = circleTrueSize;        // hyperbolic circle radius

		const build = (kind) => {
			const out = [];
			for (let i = 1; i <= n; i++) {
				out.push(
					kind === 'sphere'
						? stereoCircle((cMax * i) / n, aTrue)
						: poincareCircle((dMax * i) / n, pTrue)
				);
			}
			return out;
		};

		const panel = (kind, ox, title, sub) => {
			const set = build(kind);
			const extent =
				kind === 'sphere' ? Math.max(...set.map((s) => s.c + s.r)) : 1;
			const k = R / extent;
			const cx = ox + half / 2,
				cy = H * 0.52;

			// the Poincare rim is real geometry -- it is infinity. The
			// stereographic picture simply has no edge, so it gets none.
			if (kind !== 'sphere') {
				cmpCtx.beginPath();
				cmpCtx.arc(cx, cy, k, 0, Math.PI * 2);
				cmpCtx.strokeStyle = pal.textPrimary;
				cmpCtx.globalAlpha = 0.5;
				cmpCtx.lineWidth = 1.5;
				cmpCtx.stroke();
				cmpCtx.globalAlpha = 1;
			}

			cmpCtx.strokeStyle = pal.textPrimary;
			cmpCtx.globalAlpha = 0.12;
			cmpCtx.lineWidth = 1;
			cmpCtx.beginPath();
			cmpCtx.arc(cx, cy, 2.5, 0, Math.PI * 2);
			cmpCtx.globalAlpha = 0.55;
			cmpCtx.fillStyle = pal.textPrimary;
			cmpCtx.fill();
			cmpCtx.globalAlpha = 1;

			for (const s of set) {
				for (let j = 0; j < circleDirs; j++) {
					const th = (2 * Math.PI * j) / circleDirs;
					const x = cx + s.c * k * Math.cos(th),
						y = cy + s.c * k * Math.sin(th);
					const rr = s.r * k;
					if (rr < 0.15) continue;
					cmpCtx.beginPath();
					cmpCtx.arc(x, y, rr, 0, Math.PI * 2);
					cmpCtx.fillStyle = pal.orange;
					cmpCtx.globalAlpha = 0.3;
					cmpCtx.fill();
					cmpCtx.globalAlpha = 0.95;
					cmpCtx.strokeStyle = pal.orange;
					cmpCtx.lineWidth = 1.1;
					cmpCtx.stroke();
					cmpCtx.globalAlpha = 1;
				}
			}

			const first = set[0].r,
				last = set[set.length - 1].r;
			cmpCtx.textAlign = 'center';
			cmpCtx.fillStyle = pal.textPrimary;
			cmpCtx.font = '600 13px sans-serif';
			cmpCtx.fillText(title, cx, 18);
			cmpCtx.font = '11px ui-monospace, monospace';
			cmpCtx.globalAlpha = 0.7;
			cmpCtx.fillText(sub, cx, 34);
			cmpCtx.fillText(
				`outermost is ${(last / first).toFixed(2)}x the innermost`,
				cx,
				H - 10
			);
			cmpCtx.globalAlpha = 1;
		};

		panel('sphere', 0, 'sphere · stereographic', 'r = 2·tan(c/2)   → no edge, runs off the page');
		panel('hyperbolic', half, 'hyperbolic · Poincaré', 'r = tanh(d/2)   → edge is infinity, never reached');
	}

	$effect(() => {
		void circleTrueSize;
		void circleRings;
		void circleDirs;
		void cmpW;
		drawComparison();
	});

	// ---------- section 5: interlocking tile editor ----------
	// Escher-style motifs, but interlocking by CONSTRUCTION rather than by eye.
	//
	// The (4,3,3) tiling's orientation-preserving subgroup has a fundamental
	// quadrilateral A-B-A'-C, where A,A' are 4-fold centres and B,C are
	// 3-fold. Its four sides pair up under rotations -- verified:
	//     rot_B(-120 deg) : A -> A'   pairs side A-B with side A'-B
	//     rot_C(+120 deg) : A -> A'   pairs side A-C with side A'-C
	// so only TWO sides are free. Whatever curve you draw for A->B, its
	// partner is that same curve rotated; any bulge pushed out of one side
	// arrives as the matching notch on the side it meets. The tiles therefore
	// interlock exactly, for any input, with no fitting required.
	const cx_ = (x, y) => ({ x, y });
	const cAdd = (a, b) => cx_(a.x + b.x, a.y + b.y);
	const cSub = (a, b) => cx_(a.x - b.x, a.y - b.y);
	const cMul = (a, b) => cx_(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
	const cConj = (a) => cx_(a.x, -a.y);
	const cDiv = (a, b) => {
		const d = b.x * b.x + b.y * b.y || 1e-12;
		return cx_((a.x * b.x + a.y * b.y) / d, (a.y * b.x - a.x * b.y) / d);
	};
	const cAbs = (a) => Math.hypot(a.x, a.y);
	const ONE = cx_(1, 0);
	// rotation about p by theta -- an isometry of the disc
	function hypRot(p, th) {
		const e = cx_(Math.cos(th), Math.sin(th));
		return (z) => {
			const t = cDiv(cSub(z, p), cSub(ONE, cMul(cConj(p), z)));
			const w = cMul(e, t);
			return cDiv(cAdd(w, p), cAdd(ONE, cMul(cConj(p), w)));
		};
	}
	function solveFundamental() {
		const P = 4,
			Q = 3,
			bis = Math.PI / P / 2;
		const probe = (d) => {
			const r = Math.sqrt(d * d - 1),
				ox = d * Math.cos(bis),
				oy = d * Math.sin(bis);
			const disc = r * r - oy * oy;
			if (disc < 0) return null;
			const t = ox - Math.sqrt(disc);
			let a = Math.abs(Math.atan2(t - ox, oy));
			if (a > Math.PI / 2) a = Math.PI - a;
			return { t, a, r, ox, oy };
		};
		let lo = 1.0001,
			hi = 8;
		for (let i = 0; i < 120; i++) {
			const m = (lo + hi) / 2,
				q = probe(m);
			if (!q || q.a < Math.PI / Q) lo = m;
			else hi = m;
		}
		const f = probe((lo + hi) / 2);
		const A = cx_(0, 0),
			B = cx_(f.t, 0),
			Cc = cx_(f.t * Math.cos(Math.PI / P), f.t * Math.sin(Math.PI / P));
		const O = cx_(f.ox, f.oy);
		const inv = (z) => {
			const d = cSub(z, O),
				m = d.x * d.x + d.y * d.y || 1e-12;
			return cAdd(O, cx_((f.r * f.r * d.x) / m, (f.r * f.r * d.y) / m));
		};
		return { A, B, C: Cc, Ap: inv(A) };
	}
	const FD = solveFundamental();
	const ROT_B = hypRot(FD.B, (-2 * Math.PI) / 3);
	const ROT_C = hypRot(FD.C, (2 * Math.PI) / 3);
	const ROT_A = hypRot(FD.A, Math.PI / 2);

	// group elements, by breadth-first composition of the generators
	function buildGroup(limit = 90) {
		const gens = [ROT_A, ROT_B, ROT_C, hypRot(FD.A, -Math.PI / 2), hypRot(FD.B, (2 * Math.PI) / 3), hypRot(FD.C, (-2 * Math.PI) / 3)];
		const probe = cx_(0.11, 0.043); // generic point, to tell elements apart
		const id = (z) => z;
		const out = [id];
		const seen = new Set(['0.1100,0.0430']);
		for (let i = 0; i < out.length && out.length < limit; i++) {
			for (const g of gens) {
				const h = (z) => g(out[i](z));
				const q = h(probe);
				if (cAbs(q) > 0.88) continue;
				const k = q.x.toFixed(4) + ',' + q.y.toFixed(4);
				if (seen.has(k)) continue;
				seen.add(k);
				out.push(h);
			}
		}
		return out;
	}
	const GROUP = buildGroup();

	// the two free sides, as control points the user drags
	const defaultEdge = (from, to) => [0.35, 0.65].map((t) => cx_(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t));
	let edgeAB = $state(defaultEdge(FD.A, FD.B));
	let edgeAC = $state(defaultEdge(FD.A, FD.C));
	let showTiling = $state(true);
	let tileFill = $state(true);

	const sampleEdge = (from, ctrl, to, n = 14) => {
		// Catmull-Rom through [from, ...ctrl, to]
		const pts = [from, ...ctrl, to];
		const out = [];
		for (let i = 0; i < pts.length - 1; i++) {
			const p0 = pts[i - 1] || pts[i],
				p1 = pts[i],
				p2 = pts[i + 1],
				p3 = pts[i + 2] || pts[i + 1];
			for (let j = 0; j < n; j++) {
				const t = j / n,
					t2 = t * t,
					t3 = t2 * t;
				out.push(
					cx_(
						0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
						0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3)
					)
				);
			}
		}
		out.push(to);
		return out;
	};

	// the closed motif: two drawn sides plus their forced partners
	const motif = $derived.by(() => {
		const ab = sampleEdge(FD.A, edgeAB, FD.B);
		const ac = sampleEdge(FD.A, edgeAC, FD.C);
		return [
			...ab, // A -> B
			...ab.map(ROT_B).reverse(), // B -> A'  (forced)
			...ac.map(ROT_C), // A' -> C (forced)
			...ac.slice().reverse() // C -> A
		];
	});

	let tileCanvas, tileCtx;
	let tileSize = $state(0);
	let dragHandle = null;

	function drawTiles() {
		if (!tileCtx || !tileSize) return;
		const pal = activePalette();
		const S = tileSize,
			R = S * 0.46,
			ox = S / 2,
			oy = S / 2;
		tileCtx.clearRect(0, 0, S, S);
		tileCtx.beginPath();
		tileCtx.arc(ox, oy, R, 0, Math.PI * 2);
		tileCtx.fillStyle = pal.mapWater;
		tileCtx.fill();
		tileCtx.save();
		tileCtx.clip();

		const m = motif;
		GROUP.forEach((g, i) => {
			tileCtx.beginPath();
			for (let k = 0; k < m.length; k++) {
				const q = g(m[k]);
				const X = ox + q.x * R,
					Y = oy + q.y * R;
				k ? tileCtx.lineTo(X, Y) : tileCtx.moveTo(X, Y);
			}
			tileCtx.closePath();
			if (tileFill) {
				// alternate shading so neighbours read apart
				tileCtx.fillStyle = i % 2 ? pal.blue : pal.aqua;
				tileCtx.globalAlpha = 0.55;
				tileCtx.fill();
			}
			tileCtx.globalAlpha = 0.9;
			tileCtx.strokeStyle = pal.textPrimary;
			tileCtx.lineWidth = 0.7;
			tileCtx.stroke();
		});
		tileCtx.globalAlpha = 1;
		tileCtx.restore();

		if (showTiling) {
			// the fundamental quadrilateral and its draggable handles
			tileCtx.strokeStyle = pal.orange;
			tileCtx.lineWidth = 2;
			tileCtx.beginPath();
			for (let k = 0; k < m.length; k++) {
				const X = ox + m[k].x * R,
					Y = oy + m[k].y * R;
				k ? tileCtx.lineTo(X, Y) : tileCtx.moveTo(X, Y);
			}
			tileCtx.closePath();
			tileCtx.stroke();
			for (const [list, col] of [
				[edgeAB, pal.orange],
				[edgeAC, pal.yellow]
			])
				for (const q of list) {
					tileCtx.beginPath();
					tileCtx.arc(ox + q.x * R, oy + q.y * R, 9, 0, Math.PI * 2);
					tileCtx.fillStyle = col;
					tileCtx.fill();
					tileCtx.strokeStyle = pal.surface;
					tileCtx.lineWidth = 2;
					tileCtx.stroke();
				}
		}
		tileCtx.beginPath();
		tileCtx.arc(ox, oy, R, 0, Math.PI * 2);
		tileCtx.strokeStyle = pal.textPrimary;
		tileCtx.lineWidth = 1.5;
		tileCtx.stroke();
	}

	$effect(() => {
		void edgeAB;
		void edgeAC;
		void showTiling;
		void tileFill;
		void tileSize;
		drawTiles();
	});

	function tilePointer(e) {
		const r = tileCanvas.getBoundingClientRect();
		const R = tileSize * 0.46;
		return cx_((e.clientX - r.left - tileSize / 2) / R, (e.clientY - r.top - tileSize / 2) / R);
	}
	function initTiles(node) {
		tileCanvas = node;
		tileCtx = node.getContext('2d');
		node.addEventListener('pointerdown', (e) => {
			const q = tilePointer(e);
			let best = null;
			edgeAB.forEach((pt, i) => {
				const d = cAbs(cSub(pt, q));
				if (d < 0.1 && (!best || d < best.d)) best = { which: 'AB', i, d };
			});
			edgeAC.forEach((pt, i) => {
				const d = cAbs(cSub(pt, q));
				if (d < 0.1 && (!best || d < best.d)) best = { which: 'AC', i, d };
			});
			if (best) {
				dragHandle = best;
				node.setPointerCapture(e.pointerId);
			}
		});
		node.addEventListener('pointermove', (e) => {
			if (!dragHandle) return;
			const q = tilePointer(e);
			if (cAbs(q) > 0.85) return;
			// Rebuild the array rather than mutating it. Reassigning the state
			// left the old drag reference pointing at a detached array, so only
			// the first move ever registered.
			if (dragHandle.which === 'AB') {
				const n = [...edgeAB];
				n[dragHandle.i] = q;
				edgeAB = n;
			} else {
				const n = [...edgeAC];
				n[dragHandle.i] = q;
				edgeAC = n;
			}
		});
		node.addEventListener('pointerup', (e) => {
			dragHandle = null;
			node.releasePointerCapture(e.pointerId);
		});
		const ro = new ResizeObserver(([entry]) => {
			const w = Math.round(Math.min(entry.contentRect.width, 620));
			if (!w || w === tileSize) return;
			const dpr = window.devicePixelRatio || 1;
			tileSize = w;
			node.width = w * dpr;
			node.height = w * dpr;
			node.style.width = `${w}px`;
			node.style.height = `${w}px`;
			tileCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
			drawTiles();
		});
		ro.observe(node.parentElement);
		return { destroy: () => ro.disconnect() };
	}
	const resetEdges = () => {
		edgeAB = defaultEdge(FD.A, FD.B);
		edgeAC = defaultEdge(FD.A, FD.C);
	};
	const exportEdges = () =>
		JSON.stringify({ edgeAB: edgeAB.map((q) => [+q.x.toFixed(5), +q.y.toFixed(5)]), edgeAC: edgeAC.map((q) => [+q.x.toFixed(5), +q.y.toFixed(5)]) });

	function initCmp(node) {
		cmpCanvas = node;
		cmpCtx = node.getContext('2d');
		const ro = new ResizeObserver(([entry]) => {
			const w = Math.round(Math.min(entry.contentRect.width, 900));
			if (!w || w === cmpW) return;
			const dpr = window.devicePixelRatio || 1;
			cmpW = w;
			const h = w * 0.52;
			node.width = w * dpr;
			node.height = h * dpr;
			node.style.width = `${w}px`;
			node.style.height = `${h}px`;
			cmpCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
			drawComparison();
		});
		ro.observe(node.parentElement);
		return { destroy: () => ro.disconnect() };
	}

	function initGore(node) {
		goreCanvas = node;
		goreCtx = node.getContext('2d');
		const ro = new ResizeObserver(([entry]) => {
			const w = Math.round(Math.min(entry.contentRect.width, 560));
			if (!w || w === goreSize) return;
			const dpr = window.devicePixelRatio || 1;
			goreSize = w;
			node.width = w * dpr;
			node.height = w * dpr;
			node.style.width = `${w}px`;
			node.style.height = `${w}px`;
			goreCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
			drawGores();
		});
		ro.observe(node.parentElement);
		return { destroy: () => ro.disconnect() };
	}

	function initPetal(node) {
		petalCanvas = node;
		petalCtx = node.getContext('2d');
		const ro = new ResizeObserver(([entry]) => {
			const w = Math.round(Math.min(entry.contentRect.width, 620));
			// Sizing the canvas changes the parent's height, which re-fires
			// this observer -- bail unless the width genuinely changed, or the
			// two chase each other and the browser reports a loop.
			if (!w || w === petalSize) return;
			const dpr = window.devicePixelRatio || 1;
			petalSize = w;
			node.width = w * dpr;
			node.height = w * dpr;
			node.style.width = `${w}px`;
			node.style.height = `${w}px`;
			petalCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
			drawPetal();
		});
		ro.observe(node.parentElement);
		return { destroy: () => ro.disconnect() };
	}
</script>

<svelte:window on:keydown={onKey} />

<svelte:head>
	<title>Projection lab (dev)</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="lab">
	<header>
		<h1>Projection lab</h1>
		<p>
			Dev harness for <code>AzimuthalProjectionScene</code> and <code>geoPolarPetal</code>. Not linked
			from the site.
		</p>
	</header>

	<section>
		<h2>1 · Scene scrubber</h2>
		<div class="controls">
			<button onclick={() => (playing = !playing)}>{playing ? '❚❚ pause' : '▶ play'}</button>
			<input type="range" min="0" max={ESCHER_END} step="0.001" bind:value={sceneProgress} />
			<output>{sceneProgress.toFixed(3)}</output>
			<label class="chk">
				<input type="checkbox" bind:checked={sceneDebug} /> debug readout
			</label>
		</div>
		<div class="marks">
			{#each MARKS as [label, value]}
				<button class:active={Math.abs(sceneProgress - value) < 0.005} onclick={() => (sceneProgress = value)}>
					{label}
					<span>{value}</span>
				</button>
			{/each}
		</div>
		<p class="hint">← / → step 0.01 · shift for 0.001 · space plays</p>
		<details class="knob-panel">
			<summary>stereographic framing</summary>
			<div class="cmp-controls stereo-knobs">
			<label>
				clip angle <output>{stereoClipDeg.toFixed(1)}°</output>
				<input type="range" min="176" max="179.5" step="0.1" bind:value={stereoClipDeg} />
				<em>how much far hemisphere exists · min 176 (below it floods)</em>
			</label>
			<label>
				anchor colatitude <output>{anchorColat.toFixed(1)}°</output>
				<input type="range" min="80" max="176" step="0.5" bind:value={anchorColat} />
				<em>what stays put · 153.5 = Antarctic coast</em>
			</label>
			<label>
				hold · morph <output>{holdMorph.toFixed(2)}</output>
				<input type="range" min="0.4" max="2.2" step="0.01" bind:value={holdMorph} />
				<em>raise to push Antarctica off-frame</em>
			</label>
			<label>
				hold · zoomed <output>{holdZoom.toFixed(2)}</output>
				<input type="range" min="0.1" max="1.2" step="0.005" bind:value={holdZoom} />
				<em>how far the pull-back goes</em>
			</label>
				<button onclick={resetStereo}>reset</button>
				<p class="note zoom-readout">
					zoom: <strong>{zoomSchedule.start.toFixed(2)}</strong> →
					<strong>{zoomSchedule.morph.toFixed(2)}</strong> →
					<strong>{zoomSchedule.out.toFixed(2)}</strong>
					{#if zoomSchedule.bounce}
						· ⚠ middle exceeds start — zooms <em>in</em> then out (bounce)
					{:else}
						· smooth, never rises above its starting scale
					{/if}
				</p>
			</div>
		</details>
		<div class="stage">
			<AzimuthalProjectionScene
				progress={sceneProgress}
				debug={sceneDebug}
				{stereoClipDeg}
				{anchorColat}
				{holdMorph}
				{holdZoom}
			/>
		</div>
	</section>

	<section>
		<h2>2 · Petal playground</h2>
		<p class="hint">
			Live <code>geoPolarPetal</code> parameters against real coastlines — for dialling in the gore
			stage before it's wired into a sequence.
		</p>
		<div class="petal-wrap">
			<div class="petal-controls">
				<label>
					lobes <output>{lobes}</output>
					<input type="range" min="2" max="36" step="1" bind:value={lobes} />
				</label>
				<label>
					spread <output>{spread.toFixed(2)}</output>
					<input type="range" min="0" max="1" step="0.01" bind:value={spread} />
				</label>
				<label>
					bow <output>{bow.toFixed(2)}</output>
					<input type="range" min="0.2" max="3" step="0.05" bind:value={bow} />
					<em>(ignored by gore/vesica)</em>
				</label>
				<label>
					profile
					<select bind:value={profile}>
						{#each PROFILES as p}<option value={p}>{p}</option>{/each}
					</select>
				</label>
				<label class="chk"><input type="checkbox" bind:checked={showLand} /> land</label>
				<label class="chk"><input type="checkbox" bind:checked={showGraticule} /> graticule</label>
				<p class="note">
					<strong>spread = 1, profile = gore</strong> is the true orange-peel gore (equal-area).
					Lowering spread opens a gap at every latitude.
				</p>
			</div>
			<div class="petal-canvas">
				<canvas use:initPetal></canvas>
			</div>
		</div>
	</section>

	<section>
		<h2>5 · Interlocking tile editor</h2>
		<p class="hint">
			Drag the handles to reshape the tile. Only two sides are editable — the other two are their
			images under the pairing rotations, so the tiles interlock exactly no matter what you draw.
		</p>
		<div class="cmp-controls">
			<label class="chk"><input type="checkbox" bind:checked={showTiling} /> show handles</label>
			<label class="chk"><input type="checkbox" bind:checked={tileFill} /> fill tiles</label>
			<button onclick={resetEdges}>reset</button>
			<button onclick={() => navigator.clipboard?.writeText(exportEdges())}>copy shape</button>
		</div>
		<div class="petal-canvas"><canvas use:initTiles></canvas></div>
		<p class="note">
			{GROUP.length} tiles from the (4,3,3) rotation group. Every tile is the same shape, carried by
			isometries — so they shrink toward the rim at exactly the rate the geometry demands, and never
			overlap or leave a gap.
		</p>
	</section>

	<section>
		<h2>4 · Expanding vs shrinking circles</h2>
		<p class="hint">
			Identical circles on each surface, stepped outward at equal true distances. Both maps are
			conformal, so a circle stays a circle — only its size can lie.
		</p>
		<div class="cmp-controls">
			<label>
				circle size <output>{circleTrueSize.toFixed(2)}</output>
				<input type="range" min="0.15" max="0.7" step="0.01" bind:value={circleTrueSize} />
			</label>
			<label>
				steps <output>{circleRings}</output>
				<input type="range" min="3" max="12" step="1" bind:value={circleRings} />
			</label>
			<label>
				directions <output>{circleDirs}</output>
				<input type="range" min="1" max="16" step="1" bind:value={circleDirs} />
			</label>
		</div>
		<div class="cmp-canvas"><canvas use:initCmp></canvas></div>
		<p class="note">
			Same formula either side, one character apart: <code>tan</code> runs away to infinity, so the
			sphere's circles swell without bound and its edge can never be drawn. <code>tanh</code>
			saturates, so hyperbolic circles shrink forever toward an edge that is finite on screen and
			infinitely far away in the space.
		</p>
	</section>

	<section>
		<h2>3 · The gore that won't fit</h2>
		<p class="hint">
			Cut a disc into gores and lay them flat. The only thing that changes below is how much
			circumference exists at each distance from the centre.
		</p>
		<div class="petal-wrap">
			<div class="petal-controls">
				<label>
					curvature <output>{curvature.toFixed(2)}</output>
					<input type="range" min="-1" max="1" step="0.01" bind:value={curvature} />
					<em>+1 sphere · 0 flat · −1 hyperbolic</em>
				</label>
				<label>
					gores <output>{goreLobes}</output>
					<input type="range" min="4" max="24" step="1" bind:value={goreLobes} />
				</label>
				<label>
					disc radius ρ <output>{rhoMax.toFixed(2)}</output>
					<input type="range" min="0.5" max="3" step="0.05" bind:value={rhoMax} />
				</label>
				<p class="verdict">
					<strong>{rimW.toFixed(2)}×</strong> material at the rim<br />
					{#if rimW < 0.97}
						too little — the gores leave <strong>gaps</strong>. A sphere's peel can't cover the flat
						disc.
					{:else if rimW > 1.03}
						too much — the gores <strong>overlap</strong>. There is more surface than flat space can
						hold, at every radius, forever.
					{:else}
						fits exactly — this is the flat plane, the knife-edge between the two.
					{/if}
				</p>
				<p class="note">
					w = circumference ÷ 2πρ, i.e. how many full turns of material must fit into one turn of
					flat space. Overlap is why a hyperbolic surface ruffles like kale — and why no complete
					one fits in ordinary 3-space at all.
				</p>
			</div>
			<div class="petal-canvas">
				<canvas use:initGore></canvas>
			</div>
		</div>
	</section>
</div>

<style>
	.lab {
		max-width: 1180px;
		margin: 0 auto;
		padding: 2rem 1.5rem 5rem;
		color: var(--text-primary);
	}
	header h1 {
		margin: 0 0 0.25rem;
		font-size: 1.5rem;
	}
	header p,
	.hint {
		color: var(--text-muted);
		font-size: 0.85rem;
		margin: 0.25rem 0 0;
	}
	section {
		margin-top: 2.5rem;
	}
	h2 {
		font-size: 1rem;
		margin: 0 0 0.75rem;
		padding-bottom: 0.4rem;
		border-bottom: 1px solid color-mix(in srgb, var(--text-primary) 15%, transparent);
	}
	code {
		font-family: ui-monospace, 'SF Mono', Menlo, monospace;
		font-size: 0.85em;
	}
	.controls {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}
	.controls input[type='range'] {
		flex: 1;
		min-width: 260px;
	}
	output {
		font-family: ui-monospace, 'SF Mono', Menlo, monospace;
		font-size: 0.85rem;
		min-width: 4ch;
	}
	button {
		font: inherit;
		font-size: 0.8rem;
		padding: 0.35rem 0.7rem;
		border-radius: 6px;
		border: 1px solid color-mix(in srgb, var(--text-primary) 25%, transparent);
		background: transparent;
		color: var(--text-primary);
		cursor: pointer;
	}
	button:hover {
		background: color-mix(in srgb, var(--text-primary) 8%, transparent);
	}
	.marks {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-top: 0.75rem;
	}
	.marks button {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		line-height: 1.25;
		font-size: 0.72rem;
	}
	.marks button span {
		color: var(--text-muted);
		font-family: ui-monospace, 'SF Mono', Menlo, monospace;
	}
	.marks button.active {
		border-color: var(--text-primary);
		background: color-mix(in srgb, var(--text-primary) 10%, transparent);
	}
	.chk {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.8rem;
		color: var(--text-muted);
	}
	.stage {
		position: relative;
		height: min(78vh, 760px);
		margin-top: 1rem;
		border: 1px solid color-mix(in srgb, var(--text-primary) 15%, transparent);
		border-radius: 10px;
		overflow: hidden;
	}
	.petal-wrap {
		display: flex;
		gap: 1.5rem;
		align-items: flex-start;
		flex-wrap: wrap;
		margin-top: 1rem;
	}
	.petal-controls {
		flex: 0 0 240px;
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
	}
	.petal-controls label {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		font-size: 0.8rem;
		color: var(--text-muted);
	}
	.petal-controls label.chk {
		flex-direction: row;
		align-items: center;
	}
	.petal-controls em {
		font-size: 0.7rem;
		opacity: 0.7;
	}
	.petal-controls select {
		font: inherit;
		font-size: 0.8rem;
		padding: 0.25rem;
	}
	.zoom-readout {
		flex-basis: 100%;
		font-size: 0.72rem;
		margin-top: 0.2rem;
	}
	.knob-panel {
		margin: 0.5rem 0 0;
		border: 1px solid color-mix(in srgb, var(--text-primary) 15%, transparent);
		border-radius: 8px;
		padding: 0.35rem 0.6rem;
	}
	.knob-panel summary {
		cursor: pointer;
		font-size: 0.75rem;
		color: var(--text-muted);
		user-select: none;
	}
	.knob-panel[open] summary {
		margin-bottom: 0.5rem;
	}
	.knob-panel .cmp-controls {
		margin: 0;
		gap: 0.9rem 1.2rem;
	}
	.stereo-knobs label {
		min-width: 12rem;
	}
	.stereo-knobs em {
		font-size: 0.68rem;
		opacity: 0.75;
	}
	.cmp-controls {
		display: flex;
		gap: 1.5rem;
		flex-wrap: wrap;
		margin: 0.75rem 0;
	}
	.cmp-controls label {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		font-size: 0.8rem;
		color: var(--text-muted);
	}
	.cmp-canvas canvas {
		display: block;
		width: 100%;
		border: 1px solid color-mix(in srgb, var(--text-primary) 15%, transparent);
		border-radius: 10px;
	}
	.verdict {
		font-size: 0.85rem;
		line-height: 1.5;
		margin: 0;
		padding: 0.7rem 0.85rem;
		border-radius: 8px;
		background: color-mix(in srgb, var(--text-primary) 7%, transparent);
		color: var(--text-primary);
	}
	.note {
		font-size: 0.75rem;
		color: var(--text-muted);
		line-height: 1.45;
		margin: 0;
	}
	.petal-canvas {
		flex: 1;
		min-width: 320px;
	}
	.petal-canvas canvas {
		display: block;
		border: 1px solid color-mix(in srgb, var(--text-primary) 15%, transparent);
		border-radius: 10px;
	}
</style>
