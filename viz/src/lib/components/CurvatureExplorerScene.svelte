<script module>
	// Stage boundaries — exported so +page.svelte can pace scroll against the
	// same numbers this scene animates against (same convention as the other
	// scroll-scrubbed scenes in this project).
	export const CURVES_END = 0.11; // the two principal curves draw onto the globe
	export const ROTATE_END = 0.2; // marked point rotates to face the camera; legend arrives
	export const SHRINK_END = 0.3; // radius shrinks — same curves, steeper
	export const GROW_END = 0.42; // radius grows — same curves, flatter
	export const HANDOFF_END = 0.5; // sphere gives way to the local quadratic patch
	export const PLANE_END = 0.6; // both curvatures reach zero
	export const PLANE_HOLD_END = 0.66; // a pause on the flat plane — the neutral hinge
	export const SADDLE_END = 0.82; // one curvature up, the other down
	// Beyond SADDLE_END: hold on the saddle for the two closing captions. The
	// back half is deliberately roomier than the stage list suggests -- the
	// saddle forming is the sequence's strongest moment and its two closing
	// captions are the longest, so squeezing them against progress 1 would
	// flash the payoff past unread.
</script>

<script>
	// Stanza I's curvature explorer: what "negative curvature" actually means,
	// built entirely out of the two principal curves through a single point.
	//
	// The whole sequence is arranged around one geometric decision: the marked
	// point sits at the WORLD ORIGIN and never moves. The sphere hangs below it
	// (centre at (0,-R,0)), so growing R drops the sphere away rather than
	// inflating it across the frame. That single choice is what makes the
	// spec's hardest visual requirement — "do not simply zoom out to show an
	// ever-larger ball; keep the local patch framed consistently" — fall out
	// for free, with a fixed camera and no compensating zoom at all.
	//
	// The two coloured curves are held at constant ARC LENGTH (±L along the
	// surface), not constant angular extent. So as R grows they subtend less
	// and less of the sphere and visibly flatten, while keeping exactly the
	// same size on screen. They are the measurement; the sphere is scenery.
	//
	// Frames: everything is built in the "patch frame" — marked point at the
	// origin, surface normal +Y, north/south along X, east/west along Z. The
	// opening globe is that same construction rotated -90° about Z, which puts
	// the sphere's centre at (-R,0,0) and the marked point on its equator with
	// the pole up. Rotating the pivot back to 0 during ROTATE is therefore a
	// pure reorientation — no geometry is rebuilt, which is what the spec asks
	// for ("only a camera/object orientation change").
	//
	// Sign convention: displayed curvature is positive for a dome, so the
	// rendered height is y = -1/2 (k1 x² + k2 z²). Which sign is which is
	// arbitrary (flipping the normal flips both); what carries the lesson is
	// same-sign vs opposite-sign, so nothing in the narration depends on it.
	import { onMount } from 'svelte';
	import * as THREE from 'three';
	import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
	import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
	import { activePalette } from '$lib/palette.js';

	let { progress = 0, debug = false } = $props();

	function remap(t, lo, hi) {
		return Math.max(0, Math.min(1, (t - lo) / (hi - lo)));
	}
	function lerp(a, b, t) {
		return a + (b - a) * t;
	}
	function smoothstep(t) {
		const x = Math.max(0, Math.min(1, t));
		return x * x * (3 - 2 * x);
	}

	// --- geometry constants -------------------------------------------------
	const L = 1.0; // half arc-length of each principal curve (constant, always)
	const PATCH_R = 1.2; // radius of the local disc — a little past the curves' ends
	const R_OPEN = 2.2; // opening sphere radius
	const R_MIN = 1.15; // tightest sphere: steepest curves
	const R_MAX = 6.0; // flattest sphere, and where the quadratic handoff happens
	const K_SADDLE = 0.55; // final |curvature| in each direction on the saddle

	const CURVE_SEGMENTS = 96;
	const CURVE_TUBE_R = 0.022;
	const PATCH_RINGS = 40;
	const PATCH_SPOKES = 72;

	// north/south runs along X, east/west along Z (see the frame note above)
	const DIR_NS = new THREE.Vector3(1, 0, 0);
	const DIR_EW = new THREE.Vector3(0, 0, 1);

	// --- cameras ------------------------------------------------------------
	// Opening: far enough back to read the whole ball, looking between its
	// centre and the marked point on its equator.
	const CAM_GLOBE = {
		pos: new THREE.Vector3(3.2, 2.4, 5.6),
		look: new THREE.Vector3(-1.2, 0, 0)
	};
	// Local patch: a stable three-quarter view (azimuth 40°, elevation 30°),
	// inside the spec's suggested band and deliberately off both principal
	// directions and off the normal — from any of those the saddle reads as a
	// single curve rather than as two bends fighting each other.
	const CAM_PATCH = {
		pos: new THREE.Vector3(2.12, 1.9, 2.52),
		look: new THREE.Vector3(0, 0, 0)
	};

	let container;
	let renderer, scene, camera, resizeObserver, animFrame;
	let debugControls;
	let pivot; // holds the sphere + curves; rotates globe frame -> patch frame
	let sphereMesh, sphereMat, gridMesh, gridMat;
	let patchMesh, patchMat, patchGeo;
	let curveNSMesh, curveEWMesh, curveNSMat, curveEWMat;
	let pointMesh;

	// --- the schedule -------------------------------------------------------
	// One function, so the 3D scene and the 2D legend can never disagree about
	// what the surface is currently doing.
	function stateAt(p) {
		const drawT = smoothstep(remap(p, 0.02, CURVES_END));
		const rotT = smoothstep(remap(p, CURVES_END, ROTATE_END));

		// Radius: hold, shrink, grow, hold.
		let R;
		if (p < ROTATE_END) R = R_OPEN;
		else if (p < SHRINK_END) R = lerp(R_OPEN, R_MIN, smoothstep(remap(p, ROTATE_END, SHRINK_END)));
		else if (p < GROW_END) R = lerp(R_MIN, R_MAX, smoothstep(remap(p, SHRINK_END, GROW_END)));
		else R = R_MAX;

		const handoffT = smoothstep(remap(p, GROW_END, HANDOFF_END));
		// Curvatures. Through the sphere phase they are simply 1/R in both
		// directions — that IS the lesson of stage 3, so it is not modelled
		// separately. The quadratic patch picks them up unchanged at handoff.
		const kSphere = 1 / R_MAX;
		const flatT = smoothstep(remap(p, HANDOFF_END, PLANE_END));
		const saddleT = smoothstep(remap(p, PLANE_HOLD_END, SADDLE_END));

		let k1, k2;
		if (p < HANDOFF_END) {
			k1 = k2 = 1 / R;
		} else {
			const base = lerp(kSphere, 0, flatT);
			k1 = lerp(base, K_SADDLE, saddleT);
			k2 = lerp(base, -K_SADDLE, saddleT);
		}

		return {
			drawT,
			rotT,
			R,
			k1,
			k2,
			handoffT,
			// Which surface is on screen, and which curve generator is live.
			sphereFade: 1 - handoffT,
			patchFade: handoffT,
			// Below the handoff the curves are true circular arcs; above it they
			// are the parabolic normal sections. The switch happens at R_MAX,
			// where the two agree to ~0.001 world units over the whole curve —
			// far below a pixel, so the swap is invisible.
			useSphereCurves: p < GROW_END,
			legendIn: smoothstep(remap(p, CURVES_END, ROTATE_END)),
			// Once we are on a general patch these are no longer geodesics and
			// no longer "north/south" — the labels change with the geometry.
			labelsPatch: smoothstep(remap(p, GROW_END, HANDOFF_END))
		};
	}

	// --- curve builders -----------------------------------------------------
	// Arc of the sphere of radius R centred at (0,-R,0), through the origin,
	// parameterised by ARC LENGTH s so its on-screen size is independent of R.
	function sphereArcPoints(dir, R, half, n = CURVE_SEGMENTS) {
		const pts = [];
		for (let i = 0; i <= n; i++) {
			const s = -half + (2 * half * i) / n;
			const th = s / R;
			const sin = Math.sin(th);
			pts.push(new THREE.Vector3(sin * dir.x * R, -R + R * Math.cos(th), sin * dir.z * R));
		}
		return pts;
	}
	// Normal section of the quadratic patch along `dir`: y = -1/2 k u².
	function patchCurvePoints(dir, k, half, n = CURVE_SEGMENTS) {
		const pts = [];
		for (let i = 0; i <= n; i++) {
			const u = -half + (2 * half * i) / n;
			pts.push(new THREE.Vector3(u * dir.x, -0.5 * k * u * u, u * dir.z));
		}
		return pts;
	}
	function tubeFromPoints(points, radius = CURVE_TUBE_R) {
		const curve = new THREE.CatmullRomCurve3(points);
		return new THREE.TubeGeometry(curve, points.length, radius, 10, false);
	}

	// --- the local patch ----------------------------------------------------
	// A polar grid rather than a square one: the spec's "magnifying glass on
	// one point" reads better as a disc, and a disc also needs no clipping —
	// the mesh simply is the neighbourhood. Topology is fixed for the whole
	// sequence; only the y values and normals are rewritten per frame, so
	// scrubbing never triggers a remesh.
	function buildPatchGeometry() {
		const positions = [];
		const indices = [];
		positions.push(0, 0, 0); // centre vertex
		for (let ring = 1; ring <= PATCH_RINGS; ring++) {
			const r = (PATCH_R * ring) / PATCH_RINGS;
			for (let s = 0; s < PATCH_SPOKES; s++) {
				const th = (2 * Math.PI * s) / PATCH_SPOKES;
				positions.push(r * Math.cos(th), 0, r * Math.sin(th));
			}
		}
		const idx = (ring, s) => 1 + (ring - 1) * PATCH_SPOKES + (s % PATCH_SPOKES);
		for (let s = 0; s < PATCH_SPOKES; s++) indices.push(0, idx(1, s + 1), idx(1, s));
		for (let ring = 1; ring < PATCH_RINGS; ring++) {
			for (let s = 0; s < PATCH_SPOKES; s++) {
				const a = idx(ring, s);
				const b = idx(ring, s + 1);
				const c = idx(ring + 1, s);
				const d = idx(ring + 1, s + 1);
				indices.push(a, b, c, b, d, c);
			}
		}
		const geo = new THREE.BufferGeometry();
		geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
		geo.setIndex(indices);
		geo.computeVertexNormals();
		return geo;
	}
	function updatePatch(k1, k2) {
		const pos = patchGeo.attributes.position;
		for (let i = 0; i < pos.count; i++) {
			const x = pos.getX(i);
			const z = pos.getZ(i);
			pos.setY(i, -0.5 * (k1 * x * x + k2 * z * z));
		}
		pos.needsUpdate = true;
		patchGeo.computeVertexNormals();
	}

	function updateScene(p) {
		const st = stateAt(p);

		// --- orientation: globe frame (-90° about Z) eases to patch frame ---
		pivot.rotation.z = lerp(-Math.PI / 2, 0, st.rotT);

		// --- the sphere: one unit sphere, scaled and hung below the origin,
		// so the marked point stays put and the ball drops away as R grows ---
		sphereMesh.scale.setScalar(st.R);
		sphereMesh.position.set(0, -st.R, 0);
		gridMesh.scale.setScalar(st.R * 1.002);
		gridMesh.position.copy(sphereMesh.position);
		sphereMat.opacity = st.sphereFade;
		sphereMat.transparent = st.sphereFade < 0.999;
		// depthWrite off only while it is actually see-through, or it would
		// keep occluding the patch fading in behind it.
		sphereMat.depthWrite = st.sphereFade > 0.999;
		sphereMesh.visible = st.sphereFade > 0.002;
		gridMat.opacity = 0.14 * st.sphereFade;
		gridMesh.visible = sphereMesh.visible;

		// --- the local patch ---
		if (st.patchFade > 0.002) {
			updatePatch(st.k1, st.k2);
			patchMesh.visible = true;
			patchMat.opacity = st.patchFade;
			patchMat.transparent = st.patchFade < 0.999;
			patchMat.depthWrite = st.patchFade > 0.999;
		} else {
			patchMesh.visible = false;
		}

		// --- the two principal curves ---
		// Floored: at drawT = 0 every sample collapses onto the origin, and
		// TubeGeometry's Frenet frames go NaN on a curve of zero length. The
		// mesh is hidden below drawT = 0.01 anyway, so the floor is never seen.
		const half = Math.max(0.02, L * st.drawT);
		const ns = st.useSphereCurves
			? sphereArcPoints(DIR_NS, st.R, half)
			: patchCurvePoints(DIR_NS, st.k1, L);
		const ew = st.useSphereCurves
			? sphereArcPoints(DIR_EW, st.R, half)
			: patchCurvePoints(DIR_EW, st.k2, L);
		curveNSMesh.geometry.dispose();
		curveNSMesh.geometry = tubeFromPoints(ns);
		curveEWMesh.geometry.dispose();
		curveEWMesh.geometry = tubeFromPoints(ew);
		const curvesOn = st.drawT > 0.01;
		curveNSMesh.visible = curvesOn;
		curveEWMesh.visible = curvesOn;

		pointMesh.visible = st.drawT > 0.01;

		// --- camera: globe framing eases to the fixed patch three-quarter ---
		if (!debug) {
			const t = st.rotT;
			camera.position.lerpVectors(CAM_GLOBE.pos, CAM_PATCH.pos, t);
			camera.lookAt(new THREE.Vector3().lerpVectors(CAM_GLOBE.look, CAM_PATCH.look, t));
		}
	}

	// --- 2D legend ----------------------------------------------------------
	// The same two profiles, drawn flat and side by side, so the reader can
	// compare their bend directly instead of inferring it through perspective.
	// Driven from stateAt() so it can never disagree with the 3D scene.
	const LEG_W = 116;
	const LEG_H = 74;
	// Fixed vertical scale across the whole sequence — if it auto-fitted, a
	// flattening curve would stay the same size on screen and the entire point
	// of stage 3 would be lost.
	const LEG_SCALE = 58;
	function legendPath(kind, st, which) {
		const dir = which === 'ns' ? DIR_NS : DIR_EW;
		const k = which === 'ns' ? st.k1 : st.k2;
		const pts = st.useSphereCurves
			? sphereArcPoints(dir, st.R, L, 48)
			: patchCurvePoints(dir, k, L, 48);
		const cx = LEG_W / 2;
		const cy = LEG_H / 2;
		return pts
			.map((pt, i) => {
				const u = which === 'ns' ? pt.x : pt.z;
				const x = cx + u * (LEG_W / 2 / L) * 0.86;
				const y = cy - pt.y * LEG_SCALE;
				return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
			})
			.join(' ');
	}
	// One palette read, shared by the legend and the 3D curves below, so the
	// two can't drift apart. There is no orange CSS custom property, and a
	// second source of truth for these colours is exactly how a legend ends up
	// disagreeing with the scene it describes.
	const legendPal = activePalette();
	let legend = $derived.by(() => {
		const st = stateAt(progress);
		return {
			opacity: st.legendIn,
			ns: legendPath('', st, 'ns'),
			ew: legendPath('', st, 'ew'),
			// Terminology follows the geometry: on the sphere these are the
			// meridian and the equator, both geodesics. On a general patch they
			// are neither, so they stop being called north/south and east/west.
			nsLabel: st.labelsPatch > 0.5 ? 'direction 1' : 'north–south',
			ewLabel: st.labelsPatch > 0.5 ? 'direction 2' : 'east–west'
		};
	});

	$effect(() => {
		const p = progress;
		if (scene) updateScene(p);
	});

	onMount(() => {
		const pal = activePalette();
		scene = new THREE.Scene();
		camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
		camera.position.copy(CAM_GLOBE.pos);

		renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
		container.appendChild(renderer.domElement);

		const pmremGenerator = new THREE.PMREMGenerator(renderer);
		const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
		scene.environment = envTexture;
		pmremGenerator.dispose();

		scene.add(new THREE.AmbientLight(0xffffff, 0.3));
		const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
		dirLight.position.set(3, 5, 4);
		scene.add(dirLight);

		pivot = new THREE.Group();
		scene.add(pivot);

		// Unit sphere, scaled per frame — scaling avoids rebuilding sphere
		// geometry on every scroll tick as R sweeps.
		sphereMat = new THREE.MeshStandardMaterial({
			color: 0x9a9a94,
			roughness: 0.92,
			metalness: 0,
			side: THREE.DoubleSide
		});
		sphereMesh = new THREE.Mesh(new THREE.SphereGeometry(1, 72, 48), sphereMat);
		pivot.add(sphereMesh);

		gridMat = new THREE.MeshBasicMaterial({
			color: pal.muted ?? 0x898781,
			wireframe: true,
			transparent: true,
			opacity: 0.14,
			depthWrite: false
		});
		gridMesh = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), gridMat);
		pivot.add(gridMesh);

		patchGeo = buildPatchGeometry();
		patchMat = new THREE.MeshStandardMaterial({
			color: 0x9a9a94,
			roughness: 0.92,
			metalness: 0,
			side: THREE.DoubleSide
		});
		patchMesh = new THREE.Mesh(patchGeo, patchMat);
		patchMesh.visible = false;
		pivot.add(patchMesh);

		// Blue / orange: the validated slot-1 and slot-2 pair, so the two
		// directions stay distinguishable under colour-vision deficiency as
		// well as in normal vision. They keep these colours for the whole
		// sequence, in 3D and in the legend alike.
		curveNSMat = new THREE.MeshBasicMaterial({ color: pal.blue, depthWrite: false });
		curveEWMat = new THREE.MeshBasicMaterial({ color: pal.orange, depthWrite: false });
		curveNSMesh = new THREE.Mesh(tubeFromPoints(sphereArcPoints(DIR_NS, R_OPEN, 0.001)), curveNSMat);
		curveEWMesh = new THREE.Mesh(tubeFromPoints(sphereArcPoints(DIR_EW, R_OPEN, 0.001)), curveEWMat);
		// Rendered after the surfaces with depth test still on, but nudged
		// out along the normal so they read as sitting ON the surface rather
		// than z-fighting through it.
		curveNSMesh.renderOrder = 2;
		curveEWMesh.renderOrder = 2;
		curveNSMesh.position.y = 0.006;
		curveEWMesh.position.y = 0.006;
		pivot.add(curveNSMesh, curveEWMesh);

		// The marked point itself — aqua, well clear of both curve colours.
		pointMesh = new THREE.Mesh(
			new THREE.SphereGeometry(0.055, 20, 16),
			new THREE.MeshBasicMaterial({ color: pal.aqua })
		);
		pointMesh.renderOrder = 3;
		pointMesh.position.y = 0.01;
		pivot.add(pointMesh);

		resizeObserver = new ResizeObserver((entries) => {
			const { width, height } = entries[0].contentRect;
			if (width === 0 || height === 0) return;
			renderer.setSize(width, height);
			renderer.setPixelRatio(window.devicePixelRatio || 1);
			camera.aspect = width / height;
			camera.updateProjectionMatrix();
		});
		resizeObserver.observe(container);

		updateScene(progress);

		if (debug) {
			debugControls = new OrbitControls(camera, renderer.domElement);
			debugControls.enableDamping = true;
		}

		function tick() {
			debugControls?.update();
			renderer.render(scene, camera);
			animFrame = requestAnimationFrame(tick);
		}
		tick();

		return () => {
			cancelAnimationFrame(animFrame);
			resizeObserver.disconnect();
			debugControls?.dispose();
			envTexture.dispose();
			curveNSMesh.geometry.dispose();
			curveEWMesh.geometry.dispose();
			patchGeo.dispose();
			renderer.dispose();
		};
	});

	// --- captions -----------------------------------------------------------
	const CAPTION_DEFAULT_BOTTOM = '8%';
	export const CAPTIONS = [
		{
			start: 0,
			end: ROTATE_END,
			text: 'The curvature of a surface can be described by two curves through a single point. Starting at the equator of a sphere: one runs east–west, the other north–south.'
		},
		{
			start: ROTATE_END,
			end: SHRINK_END,
			text: "A sphere has constant curvature — these two curves look the same wherever on it you stand."
		},
		{
			start: SHRINK_END,
			end: HANDOFF_END,
			text: 'The steeper the curves, the smaller the sphere. The flatter the curves, the bigger it is.'
		},
		{
			start: HANDOFF_END,
			end: PLANE_HOLD_END,
			text: 'With no curvature at all in either direction, you have a flat plane.'
		},
		{
			start: PLANE_HOLD_END,
			end: SADDLE_END,
			text: "But the two directions don't have to curve together. Bend one curve one way, and the other the opposite way."
		},
		{
			start: SADDLE_END,
			end: 0.89,
			text: 'You might call it a saddle, or a crisp, or the waist of an hourglass.'
		},
		{
			// The bridge back to the disc the reader has just left. Deliberately
			// says a world *of* negative curvature, not that the disc is this
			// saddle: the hyperbolic plane is negatively curved everywhere and
			// infinite, and no complete surface with that geometry embeds in
			// ordinary 3-space at all. The saddle is a local picture only.
			start: 0.89,
			end: 1,
			text: 'Mathematically, this is negative curvature — and the Poincaré disk is a map of a world that curves this way at every point, without end.'
		}
	];
	function captionOpacity(start, end, prog) {
		if (prog < start || prog > end) return 0;
		const fade = Math.min(0.06, (end - start) * 0.25) || 0.001;
		return Math.min(remap(prog, start, start + fade), 1 - remap(prog, end - fade, end));
	}
	let captionOpacities = $derived(CAPTIONS.map((c) => captionOpacity(c.start, c.end, progress)));
</script>

<div class="scene-container" bind:this={container}></div>

{#if legend.opacity > 0.01}
	<div class="legend" style="opacity: {legend.opacity}">
		<div class="legend-item">
			<svg viewBox="0 0 {LEG_W} {LEG_H}" aria-hidden="true">
				<line class="axis" x1="6" y1={LEG_H / 2} x2={LEG_W - 6} y2={LEG_H / 2} />
				<path class="curve" style="stroke: {legendPal.blue}" d={legend.ns} />
			</svg>
			<span class="legend-label" style="color: {legendPal.blue}">{legend.nsLabel}</span>
		</div>
		<div class="legend-item">
			<svg viewBox="0 0 {LEG_W} {LEG_H}" aria-hidden="true">
				<line class="axis" x1="6" y1={LEG_H / 2} x2={LEG_W - 6} y2={LEG_H / 2} />
				<path class="curve" style="stroke: {legendPal.orange}" d={legend.ew} />
			</svg>
			<span class="legend-label" style="color: {legendPal.orange}">{legend.ewLabel}</span>
		</div>
	</div>
{/if}

<div class="caption-overlay">
	{#each CAPTIONS as c, i}
		{#if captionOpacities[i] > 0.01}
			<p class="caption" style="opacity: {captionOpacities[i]}; bottom: {c.bottom ?? CAPTION_DEFAULT_BOTTOM};">
				{c.text}
			</p>
		{/if}
	{/each}
</div>

<style>
	.scene-container {
		width: 100%;
		height: 100%;
	}
	.scene-container :global(canvas) {
		display: block;
	}
	.legend {
		position: absolute;
		top: 1.5rem;
		left: 1.5rem;
		display: flex;
		gap: 0.75rem;
		pointer-events: none;
	}
	.legend-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.3rem;
		padding: 0.5rem 0.4rem 0.4rem;
		border-radius: 10px;
		background: color-mix(in srgb, var(--surface-1) 82%, transparent);
		backdrop-filter: blur(6px);
		box-shadow: 0 6px 24px rgba(0, 0, 0, 0.12);
	}
	.legend-item svg {
		display: block;
		width: 116px;
		height: 74px;
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
	.legend-label {
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.01em;
	}
	.caption-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		justify-content: center;
		padding: 0 8%;
		pointer-events: none;
	}
	.caption {
		position: absolute;
		max-width: 30rem;
		margin: 0;
		padding: 0.85rem 1.25rem;
		border-radius: 10px;
		background: color-mix(in srgb, var(--surface-1) 82%, transparent);
		backdrop-filter: blur(6px);
		box-shadow: 0 6px 24px rgba(0, 0, 0, 0.12);
		font-size: 1.05rem;
		line-height: 1.5;
		text-align: center;
		color: var(--text-primary);
	}
</style>
