<script>
	// An aside off the curvature explorer: the surface the saddle is a piece of.
	//
	// The scene opens on EXACTLY the state the narrative leaves the saddle in --
	// same camera, same colours, same aqua marked point, same neighbourhood disc
	// of radius 1.2 -- and then widens the neighbourhood until the rest of the
	// pseudosphere is visible around it. Everything here is deliberately the
	// same scaffolding as CurvatureExplorerScene so the continuity is real and
	// not merely asserted.
	//
	// The mathematics that makes this cheap: a pseudosphere is a surface of
	// revolution, and on any surface of revolution the meridian and the parallel
	// ARE the two principal directions. So the two coloured curves are just the
	// profile curve and the ring through the point -- no shape operator, no
	// eigenvectors, nothing solved numerically. Their curvatures are closed
	// form (kappa_meridian = 1/(a sinh u), kappa_parallel = -sinh(u)/a), and
	// their product is -1/a² at every point on the surface. That constant
	// product is the whole idea: move the point and both numbers change a lot,
	// while what they multiply to does not move at all.
	//
	// SCALE: a is chosen so K = -0.49, which is what k1 = +0.7, k2 = -0.7 gives.
	// The saddle at the end of the narrative is therefore not merely similar to
	// a pseudosphere point -- it IS one, the single ring where the two
	// magnitudes happen to coincide (u = arcsinh 1). Opening the scene there is
	// what makes the reveal land.
	import { onMount } from 'svelte';
	import * as THREE from 'three';
	import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
	import { activePalette } from '$lib/palette.js';

	const pal = activePalette();

	const lerp = (a, b, t) => a + (b - a) * t;
	const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
	const smoothstep = (t) => {
		const x = clamp(t, 0, 1);
		return x * x * (3 - 2 * x);
	};

	// --- the surface ---------------------------------------------------------
	const A = 1 / 0.7; // so K = -1/A² = -0.49, matching the narrative's saddle
	const U_START = Math.asinh(1); // the ring where |kappa1| = |kappa2| = 0.7
	// Truncated at BOTH ends, and not arbitrarily. Toward the rim the meridian
	// curvature runs away to infinity; toward the cusp the surface spikes off to
	// infinity in space. A pseudosphere cannot be extended past either -- which
	// is exactly why it cannot carry the whole hyperbolic plane.
	const U_MIN = 0.35;
	const U_MAX = 2.2;
	const U_SEG = 120;
	const TH_SEG = 96;

	const radiusAt = (u) => A / Math.cosh(u);
	const heightAt = (u) => A * (u - Math.tanh(u));
	const kMeridian = (u) => 1 / (A * Math.sinh(u));
	const kParallel = (u) => -Math.sinh(u) / A;

	// --- the frame that puts the opening point where the narrative left it ----
	// Canonical surface has its axis along Y. We rotate and translate so that
	// (U_START, theta=0) lands at the world origin, reproducing the saddle the
	// narrative ends on: bending DOWN along X, UP along Z, seen from +Y.
	//
	// The normal must be the OUTWARD one, or the camera ends up inside the horn
	// looking at the concave side -- which is what buried the curves in the
	// first version. Given that, matching the narrative's picture means the
	// PARALLEL goes along X (curvature +0.70, bending down) and the MERIDIAN
	// along Z (-0.70, bending up), which is the opposite pairing to the sphere
	// at the start of the explorer.
	//
	// That swap is free: those colours lost their compass labels when the
	// explorer's legend labels came off, so they now mean nothing more than
	// "two perpendicular directions". Preserving the picture the reader just
	// looked at is worth more than preserving which family each hue tracked.
	const FRAME = (() => {
		const u = U_START;
		const rp = -A * (1 / Math.cosh(u)) * Math.tanh(u);
		const zp = A * Math.tanh(u) * Math.tanh(u);
		const sp = Math.hypot(rp, zp);
		const X = new THREE.Vector3(0, 0, 1); // parallel  -> world X (blue)
		const Y = new THREE.Vector3(zp / sp, -rp / sp, 0); // outward normal -> world Y
		const Z = new THREE.Vector3(rp / sp, zp / sp, 0); // meridian  -> world Z (orange)
		return { X, Y, Z, P0: new THREE.Vector3(radiusAt(u), heightAt(u), 0) };
	})();
	function toWorld(x, y, z) {
		const d = new THREE.Vector3(x, y, z).sub(FRAME.P0);
		return new THREE.Vector3(d.dot(FRAME.X), d.dot(FRAME.Y), d.dot(FRAME.Z));
	}
	const surfacePoint = (u, th) => toWorld(radiusAt(u) * Math.cos(th), heightAt(u), radiusAt(u) * Math.sin(th));
	// OUTWARD unit normal at (u, th), in world coordinates. Outward is the whole
	// point: the curves and the marked point are lifted along it to sit ON the
	// surface. The first version used the inward normal here and pushed all
	// three inside the horn, where the surface hid them completely.
	function normalAt(u, th) {
		const rp = -A * (1 / Math.cosh(u)) * Math.tanh(u);
		const zp = A * Math.tanh(u) * Math.tanh(u);
		const sp = Math.hypot(rp, zp);
		const n = new THREE.Vector3((zp / sp) * Math.cos(th), -rp / sp, (zp / sp) * Math.sin(th));
		return new THREE.Vector3(n.dot(FRAME.X), n.dot(FRAME.Y), n.dot(FRAME.Z));
	}

	// Arc length along the meridian, measured from the rim: s(u) = A ln cosh u.
	// Curves are cut to a fixed arc length so their on-screen size stays put as
	// the point moves — the same discipline the sphere sequence uses.
	const CURVE_L = 0.35;
	const sOf = (u) => A * Math.log(Math.cosh(u));
	const uOf = (s) => Math.acosh(Math.exp(s / A));

	const CURVE_EPS = 0.008;
	const CURVE_TUBE_R = 0.016;
	const NEIGHBOURHOOD_R = 1.2; // where the narrative's clipped disc left off

	let { debug = false } = $props();

	let u = $state(U_START);
	let revealT = $state(0);

	let container;
	let renderer, scene, camera, resizeObserver, animFrame;
	let surfaceMesh, surfaceGeo, surfaceMat;
	let merMesh, parMesh, pointMesh;
	let uParam = [];
	let thParam = [];

	// --- cameras: the narrative's framing, easing out to the whole horn -------
	const CAM_SADDLE = { pos: new THREE.Vector3(3.062, 2.75, 3.649), look: new THREE.Vector3(0, 0, 0) };
	// Chosen by search, not by eye: the lowest elevation that still keeps the
	// marked meridian turned toward the camera at EVERY position along the
	// surface (worst facing 0.36, i.e. 69 deg off the normal -- a three-quarter
	// view, not face-on). The obvious framing camera put the marked side on the
	// far side of the horn for the whole upper half of the range.
	const CAM_WIDE = {
		pos: new THREE.Vector3(6.409, 3.07, 0.8),
		look: new THREE.Vector3(0, -0.63, 0.8)
	};

	function buildSurface() {
		const positions = [];
		const indices = [];
		uParam = [];
		thParam = [];
		for (let i = 0; i <= U_SEG; i++) {
			const uu = U_MIN + ((U_MAX - U_MIN) * i) / U_SEG;
			for (let j = 0; j < TH_SEG; j++) {
				const th = (2 * Math.PI * j) / TH_SEG;
				const p = surfacePoint(uu, th);
				positions.push(p.x, p.y, p.z);
				uParam.push(uu);
				thParam.push(th);
			}
		}
		const at = (i, j) => i * TH_SEG + (j % TH_SEG);
		for (let i = 0; i < U_SEG; i++) {
			for (let j = 0; j < TH_SEG; j++) {
				const a = at(i, j);
				const b = at(i, j + 1);
				const c = at(i + 1, j);
				const d = at(i + 1, j + 1);
				indices.push(a, c, b, b, c, d);
			}
		}
		const geo = new THREE.BufferGeometry();
		geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
		geo.setAttribute('color', new THREE.Float32BufferAttribute(new Array((positions.length / 3) * 4).fill(1), 4));
		geo.setIndex(indices);
		geo.computeVertexNormals();
		return geo;
	}

	// The reveal: the neighbourhood the narrative clipped down to, opening back
	// up. Same per-vertex alpha mechanism as the explorer's clip, run in reverse.
	function updateReveal(t) {
		const radius = lerp(NEIGHBOURHOOD_R, 9, smoothstep(t));
		const col = surfaceGeo.attributes.color;
		const pos = surfaceGeo.attributes.position;
		for (let i = 0; i < col.count; i++) {
			const d = Math.hypot(pos.getX(i), pos.getY(i), pos.getZ(i));
			col.setW(i, 1 - smoothstep((d - radius) / 0.5));
		}
		col.needsUpdate = true;
	}

	function tubeFrom(points, radius = CURVE_TUBE_R) {
		return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), points.length, radius, 8, false);
	}
	function meridianPoints(uc, n = 72) {
		// Fixed arc length either side, clamped where the surface actually ends —
		// near the rim there is simply less meridian to draw, which is true.
		const s = sOf(uc);
		const lo = uOf(Math.max(sOf(U_MIN), s - CURVE_L));
		const hi = uOf(Math.min(sOf(U_MAX), s + CURVE_L));
		const pts = [];
		for (let i = 0; i <= n; i++) {
			const uu = lerp(lo, hi, i / n);
			pts.push(surfacePoint(uu, 0).addScaledVector(normalAt(uu, 0), CURVE_EPS));
		}
		return pts;
	}
	function parallelPoints(uc, n = 72) {
		// Also a fixed arc length, but a ring near the cusp is barely longer than
		// that, so it is capped short of closing on itself.
		const circumference = 2 * Math.PI * radiusAt(uc);
		const half = Math.min(CURVE_L, circumference * 0.46) / radiusAt(uc);
		const pts = [];
		for (let i = 0; i <= n; i++) {
			const th = lerp(-half, half, i / n);
			pts.push(surfacePoint(uc, th).addScaledVector(normalAt(uc, th), CURVE_EPS));
		}
		return pts;
	}

	function updatePoint() {
		merMesh.geometry.dispose();
		merMesh.geometry = tubeFrom(meridianPoints(u));
		parMesh.geometry.dispose();
		parMesh.geometry = tubeFrom(parallelPoints(u));
		const p = surfacePoint(u, 0).addScaledVector(normalAt(u, 0), CURVE_EPS * 2);
		pointMesh.position.copy(p);
	}

	// --- readout -------------------------------------------------------------
	// Blue tracks the parallel and orange the meridian -- see the FRAME note.
	let readout = $derived({
		blue: -kParallel(u),
		orange: -kMeridian(u),
		product: kMeridian(u) * kParallel(u)
	});
	const LEG_W = 128;
	const LEG_H = 78;
	const LEG_SCALE = 150;
	function profilePath(k) {
		const pts = [];
		for (let i = 0; i <= 40; i++) {
			const s = lerp(-CURVE_L, CURVE_L, i / 40);
			const x = LEG_W / 2 + (s / CURVE_L) * (LEG_W / 2) * 0.86;
			const y = LEG_H / 2 - -0.5 * k * s * s * LEG_SCALE;
			pts.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
		}
		return pts.join(' ');
	}

	// --- interaction ---------------------------------------------------------
	let dragging = false;
	let dragY = 0;
	let dragU = 0;
	function onPointerDown(e) {
		if (revealT < 1) return;
		dragging = true;
		dragY = e.clientY;
		dragU = u;
		e.currentTarget.setPointerCapture(e.pointerId);
	}
	function onPointerMove(e) {
		if (!dragging) return;
		// Up on screen = toward the cusp, which is up on the surface too.
		u = clamp(dragU - ((e.clientY - dragY) / 380) * (U_MAX - U_MIN), U_MIN, U_MAX);
	}
	function onPointerUp() {
		dragging = false;
	}

	$effect(() => {
		const uu = u;
		if (scene) {
			updatePoint();
			void uu;
		}
	});

	onMount(() => {
		scene = new THREE.Scene();
		camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);

		renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
		container.appendChild(renderer.domElement);

		const pmrem = new THREE.PMREMGenerator(renderer);
		const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
		scene.environment = envTexture;
		pmrem.dispose();

		scene.add(new THREE.AmbientLight(0xffffff, 0.3));
		const dir = new THREE.DirectionalLight(0xffffff, 2.0);
		dir.position.set(3, 5, 4);
		scene.add(dir);

		surfaceGeo = buildSurface();
		// DoubleSide here, unlike the explorer's closed ball: a horn is genuinely
		// open at both ends, so the inside of the far wall is legitimately in
		// view through the mouth and culling it would leave a hole.
		surfaceMat = new THREE.MeshStandardMaterial({
			color: 0x9a9a94,
			roughness: 0.92,
			metalness: 0,
			side: THREE.DoubleSide,
			transparent: true,
			vertexColors: true,
			// Alpha alone does not stop a fragment reaching the depth buffer, so
			// the not-yet-revealed part of the horn would stay invisible and go on
			// occluding the curves drawn after it. alphaTest DISCARDS those
			// fragments instead, which keeps them out of the depth buffer while
			// leaving depthWrite on -- turning depthWrite off would have fixed the
			// curves but stopped the horn occluding itself, letting its far wall
			// paint straight over the near one.
			alphaTest: 0.05
		});
		surfaceMesh = new THREE.Mesh(surfaceGeo, surfaceMat);
		scene.add(surfaceMesh);

		const curveMat = (c) => new THREE.MeshBasicMaterial({ color: c, transparent: true, depthWrite: false });
		parMesh = new THREE.Mesh(tubeFrom(parallelPoints(U_START)), curveMat(pal.blue));
		merMesh = new THREE.Mesh(tubeFrom(meridianPoints(U_START)), curveMat(pal.orange));
		merMesh.renderOrder = 3;
		parMesh.renderOrder = 3;
		scene.add(merMesh, parMesh);

		pointMesh = new THREE.Mesh(
			new THREE.SphereGeometry(0.045, 20, 16),
			new THREE.MeshBasicMaterial({ color: pal.aqua, transparent: true, depthWrite: false })
		);
		pointMesh.renderOrder = 4;
		scene.add(pointMesh);

		updatePoint();
		updateReveal(0);

		resizeObserver = new ResizeObserver((entries) => {
			const { width, height } = entries[0].contentRect;
			if (width === 0 || height === 0) return;
			renderer.setSize(width, height);
			renderer.setPixelRatio(window.devicePixelRatio || 1);
			camera.aspect = width / height;
			camera.updateProjectionMatrix();
		});
		resizeObserver.observe(container);

		// The reveal runs once, on arrival: the reader recognises the saddle
		// before it becomes a horn, which is the entire point of the aside.
		const REVEAL_MS = 1800;
		const HOLD_MS = 500;
		let t0 = null;
		function tick(now) {
			if (t0 === null) t0 = now;
			const raw = clamp((now - t0 - HOLD_MS) / REVEAL_MS, 0, 1);
			if (raw !== revealT) {
				revealT = raw;
				updateReveal(raw);
			}
			const e = smoothstep(revealT);
			camera.position.lerpVectors(CAM_SADDLE.pos, CAM_WIDE.pos, e);
			camera.lookAt(new THREE.Vector3().lerpVectors(CAM_SADDLE.look, CAM_WIDE.look, e));
			renderer.render(scene, camera);
			animFrame = requestAnimationFrame(tick);
		}
		animFrame = requestAnimationFrame(tick);

		return () => {
			cancelAnimationFrame(animFrame);
			resizeObserver.disconnect();
			envTexture.dispose();
			surfaceGeo.dispose();
			merMesh.geometry.dispose();
			parMesh.geometry.dispose();
			renderer.dispose();
		};
	});
</script>

<div class="scene-wrap">
	<div
		class="scene-container"
		bind:this={container}
		onpointerdown={onPointerDown}
		onpointermove={onPointerMove}
		onpointerup={onPointerUp}
		onpointercancel={onPointerUp}
		class:grabbable={revealT >= 1}
		role="presentation"
	></div>

	<div class="legend" style="opacity: {revealT}">
		<div class="legend-row">
			<div class="legend-item">
				<svg viewBox="0 0 {LEG_W} {LEG_H}" aria-hidden="true">
					<line class="axis" x1="6" y1={LEG_H / 2} x2={LEG_W - 6} y2={LEG_H / 2} />
					<path class="curve" style="stroke: {pal.blue}" d={profilePath(readout.blue)} />
				</svg>
				<span class="k" style="color: {pal.blue}">{readout.blue.toFixed(2)}</span>
			</div>
			<div class="legend-item">
				<svg viewBox="0 0 {LEG_W} {LEG_H}" aria-hidden="true">
					<line class="axis" x1="6" y1={LEG_H / 2} x2={LEG_W - 6} y2={LEG_H / 2} />
					<path class="curve" style="stroke: {pal.orange}" d={profilePath(readout.orange)} />
				</svg>
				<span class="k" style="color: {pal.orange}">{readout.orange.toFixed(2)}</span>
			</div>
		</div>
		<p class="product">
			<span style="color: {pal.blue}">{readout.blue.toFixed(2)}</span>
			<span class="dim">×</span>
			<span style="color: {pal.orange}">{readout.orange.toFixed(2)}</span>
			<span class="dim">=</span>
			<strong>{readout.product.toFixed(2)}</strong>
		</p>
	</div>

	<div class="controls" style="opacity: {revealT}">
		<label>
			<span>Move the point along the surface</span>
			<input type="range" min={U_MIN} max={U_MAX} step="0.001" bind:value={u} />
		</label>
		<span class="hint">…or drag the surface directly</span>
	</div>
</div>

<style>
	.scene-wrap {
		position: relative;
		width: 100%;
		height: 100%;
	}
	.scene-container {
		width: 100%;
		height: 100%;
		touch-action: none;
	}
	.scene-container.grabbable {
		cursor: grab;
	}
	.scene-container :global(canvas) {
		display: block;
	}
	.legend {
		position: absolute;
		top: 1.25rem;
		left: 1.25rem;
		padding: 0.6rem 0.75rem 0.5rem;
		border-radius: 12px;
		background: color-mix(in srgb, var(--surface-1) 86%, transparent);
		backdrop-filter: blur(6px);
		box-shadow: 0 6px 24px rgba(0, 0, 0, 0.12);
		pointer-events: none;
	}
	.legend-row {
		display: flex;
		gap: 0.75rem;
	}
	.legend-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.15rem;
	}
	.legend-item svg {
		display: block;
		width: 128px;
		height: 78px;
		overflow: visible;
	}
	.axis {
		stroke: var(--text-secondary);
		stroke-width: 1;
		stroke-dasharray: 3 4;
		opacity: 0.45;
	}
	.curve {
		fill: none;
		stroke-width: 2.5;
		stroke-linecap: round;
	}
	.k {
		font-size: 0.9rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}
	.product {
		margin: 0.5rem 0 0;
		padding-top: 0.5rem;
		border-top: 1px solid var(--surface-2);
		text-align: center;
		font-size: 1rem;
		font-variant-numeric: tabular-nums;
		color: var(--text-primary);
	}
	.product .dim {
		color: var(--text-secondary);
		margin: 0 0.3rem;
	}
	.controls {
		position: absolute;
		left: 50%;
		bottom: 1.25rem;
		transform: translateX(-50%);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.3rem;
		padding: 0.7rem 1.1rem;
		border-radius: 12px;
		background: color-mix(in srgb, var(--surface-1) 86%, transparent);
		backdrop-filter: blur(6px);
		box-shadow: 0 6px 24px rgba(0, 0, 0, 0.12);
	}
	.controls label {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		align-items: center;
		font-size: 0.85rem;
		color: var(--text-secondary);
	}
	.controls input[type='range'] {
		width: 16rem;
		accent-color: var(--accent);
	}
	.hint {
		font-size: 0.75rem;
		color: var(--text-muted);
	}
</style>
