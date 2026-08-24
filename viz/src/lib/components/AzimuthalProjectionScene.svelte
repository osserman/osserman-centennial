<script module>
	// Stage boundaries, exported for consistency with SphereGeometryScene's
	// own convention (a page could derive scroll-linked prompts from these),
	// though this scene's own narration is entirely on-canvas captions (see
	// CAPTIONS below), matching the explicit "life on a sphere" precedent.
	export const ROTATE_END = 0.12; // idle rotating globe, step 1
	export const PEEL_END = 0.55; // peel/stretch into the flat projection, step 2
	export const DISTORTION_END = 0.72; // area-distortion coloring fades in, step 3
	export const CIRCLES_END = 0.95; // the two great circles draw themselves, step 4
	// Past 1.0: dragEnabled (set by the parent once scrolled fully through,
	// same handoff ParallelPostulateScene uses) opens step 5.
</script>

<script>
	// Azimuthal equidistant projection: a rotating globe (with real, if
	// simplified, coastlines -- see $lib/coastlines.js) peels open into a
	// flat map centered on the north pole, colored by how much area
	// distortion that projection introduces away from its center, with the
	// same two "parallel lines meet twice" great circles from
	// SphereGeometryScene drawn on top -- then the reader can drag the
	// center anywhere they like and watch the whole map (and its
	// distortion) re-flow live.
	//
	// All the projection math below was verified numerically before being
	// used here (forward/inverse round-trip exactly for several off-center
	// points; the area-distortion formula c/sin(c) matches the standard
	// reference for this projection, Snyder's "Map Projections: A Working
	// Manual") -- not re-derived from scratch in three.js and hoped correct.
	//
	// Structural pattern matches SphereGeometryScene (progress-driven,
	// on-canvas captions, ?debug= free-orbit escape hatch) for the scripted
	// portion, then ParallelPostulateScene's scripted-to-drag handoff for
	// step 5 -- both patterns duplicated here rather than shared, matching
	// this project's existing convention for scene-specific animation logic.
	import { onMount } from 'svelte';
	import * as THREE from 'three';
	import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
	import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
	import { activePalette } from '$lib/palette.js';
	import { coastlines } from '$lib/coastlines.js';

	let { progress = 0, dragEnabled = false, debug = false } = $props();
	let debugReadout = $state('');

	const D2R = Math.PI / 180;
	const SEGMENTS = 96;

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

	// --- spherical <-> azimuthal-equidistant math (lat/lon in degrees) ---
	function spherePoint(lat, lon, target = new THREE.Vector3()) {
		const phi = lat * D2R,
			lam = lon * D2R;
		return target.set(Math.cos(phi) * Math.cos(lam), Math.sin(phi), Math.cos(phi) * Math.sin(lam));
	}
	function latLonOf(v) {
		return [Math.asin(Math.max(-1, Math.min(1, v.y))) / D2R, Math.atan2(v.z, v.x) / D2R];
	}
	// Forward: (lat,lon) under a projection centered at (lat0,lon0) -> planar
	// (x,y) with the center at the origin, both radii/lengths in radians
	// (so a full antipodal map edge sits at radius pi, matching the unit
	// sphere's own radius of 1 -- consistent scale across both states).
	function project(lat, lon, lat0, lon0) {
		const phi = lat * D2R,
			phi0 = lat0 * D2R,
			dlon = (lon - lon0) * D2R;
		const cosC = Math.sin(phi0) * Math.sin(phi) + Math.cos(phi0) * Math.cos(phi) * Math.cos(dlon);
		const c = Math.acos(Math.max(-1, Math.min(1, cosC)));
		const theta = Math.atan2(Math.cos(phi) * Math.sin(dlon), Math.cos(phi0) * Math.sin(phi) - Math.sin(phi0) * Math.cos(phi) * Math.cos(dlon));
		return { x: c * Math.sin(theta), y: c * Math.cos(theta), c };
	}
	// Inverse: planar (x,y) under center (lat0,lon0) -> (lat,lon).
	function unproject(x, y, lat0, lon0) {
		const r = Math.hypot(x, y);
		if (r < 1e-9) return [lat0, lon0];
		const theta = Math.atan2(x, y);
		const phi0 = lat0 * D2R,
			lam0 = lon0 * D2R;
		const phi = Math.asin(Math.sin(phi0) * Math.cos(r) + Math.cos(phi0) * Math.sin(r) * Math.cos(theta));
		const lam = lam0 + Math.atan2(Math.sin(theta) * Math.sin(r) * Math.cos(phi0), Math.cos(r) - Math.sin(phi0) * Math.sin(phi));
		return [phi / D2R, lam / D2R];
	}
	// Area scale factor at angular distance c from the projection's center
	// (Snyder, azimuthal equidistant: radial scale h=1 -- that's the
	// "equidistant" part -- tangential scale k=c/sin(c), area scale = h*k).
	function areaScale(c) {
		return c < 1e-6 ? 1 : c / Math.sin(c);
	}

	// --- projection center, draggable in step 5 ---
	let projLat = $state(90);
	let projLon = $state(0);

	// --- idle spin (step 1), folded into the sphere-side longitude rather
	// than a separate Group rotation -- see the file-level note below on
	// why a Group transform would fight the peel once it starts. ---
	const SPIN_TOTAL_DEG = 200;
	function spinOffset(prog) {
		return lerp(0, SPIN_TOTAL_DEG, remap(prog, 0, ROTATE_END));
	}

	// --- peel blend: each point's own transition from its sphere position
	// to its projected position sweeps outward-in, starting at the point
	// antipodal to the projection center (c near pi -- already the map's
	// own outer edge) and finishing at the center itself (c=0), so the
	// globe visually "peels open" starting from the far side and finishes
	// by snapping flat right where the pin is. BAND widens each point's own
	// transition from an instant flip into a soft sweep; the lerp below
	// keeps the whole sweep inside peelT in [0,1] with room for both ends'
	// half-bands to fully resolve (a point right at BAND/2 needs to reach
	// blend=1 by peelT=1, not asymptotically approach it). ---
	const BAND = 0.32;
	function peelBlend(c, peelT) {
		const localT = lerp(BAND / 2, 1 - BAND / 2, 1 - c / Math.PI);
		return smoothstep(remap(peelT, localT - BAND / 2, localT + BAND / 2));
	}
	// Blended world position for a geographic point, given the overall
	// scene progress. Reused for coastlines and the great circles alike --
	// anything whose position is defined by a (lat,lon) (or, for the great
	// circles, a 3D sphere point converted back to lat/lon via latLonOf)
	// goes through this same function, so peeling/dragging is consistent
	// everywhere it needs to be. Returns the point's true (unclamped) `c`
	// alongside the position -- c=pi is the true antipode of the current
	// center, a genuine singularity of this projection (a single point maps
	// to the *entire* boundary circle, so its bearing there is undefined,
	// not just large). Real coastline data has points sitting almost
	// exactly there (Antarctica's outline touches lat=-90 directly, the
	// antipode of the default north-pole center) -- clamping the radius
	// alone wasn't enough, since the bearing itself is numerically
	// unstable that close in and still shot off in an arbitrary direction.
	// The caller (coastline segment builder below) uses this returned `c`
	// to drop whole segments near the singularity instead, the same
	// "finite window into an infinite/singular surface" approach used for
	// Scherk's ends elsewhere -- and the same thing real polar azimuthal
	// equidistant maps (e.g. the UN flag) do: clip before the true
	// antipode, don't try to render Antarctica's exact shape there.
	const _sp = new THREE.Vector3();
	function blendedPosition(lat, lon, peelT, target) {
		spherePoint(lat, lon + spinOffset(progress), _sp);
		const p = project(lat, lon, projLat, projLon);
		const blend = peelBlend(p.c, peelT);
		target.set(lerp(_sp.x, p.x, blend), lerp(_sp.y, 0, blend), lerp(_sp.z, p.y, blend));
		return p.c;
	}
	const CLIP_C = Math.PI - 0.35; // ~20deg buffer around the true antipode

	// --- the same two great circles from SphereGeometryScene, exact same
	// constants, so this scene reads as a direct callback to that one. ---
	const NORTH = new THREE.Vector3(0, 1, 0);
	const PLON_A = 0.5;
	const PLON_B = 0.75;
	const Q_A = new THREE.Vector3(Math.cos(PLON_A), 0, Math.sin(PLON_A));
	const Q_B = new THREE.Vector3(Math.cos(PLON_B), 0, Math.sin(PLON_B));
	function greatCirclePoint(Q, theta, target = new THREE.Vector3()) {
		return target.addVectors(_tmpA.copy(Q).multiplyScalar(Math.cos(theta)), _tmpB.copy(NORTH).multiplyScalar(Math.sin(theta)));
	}
	const _tmpA = new THREE.Vector3();
	const _tmpB = new THREE.Vector3();

	// --- distortion grid (step 3): fully static once built -- see the
	// file-level note on why re-centering never needs to touch it. Sampled
	// directly in polar map-space (r=angular distance 0..pi, theta=bearing),
	// which is also exactly where areaScale(c) is defined, so r *is* c here
	// with no extra conversion. ---
	const GRID_R_STEPS = 28;
	const GRID_THETA_STEPS = 72;
	const DISTORTION_STOPS = [
		[0.15, 0.35, 0.85],
		[0.3, 0.7, 0.35],
		[0.95, 0.85, 0.25],
		[0.95, 0.55, 0.15],
		[0.72, 0.16, 0.1]
	];
	function distortionColor(t) {
		const n = DISTORTION_STOPS.length - 1;
		const s = Math.min(Math.max(t, 0), 1) * n;
		const idx = Math.min(Math.floor(s), n - 1);
		const frac = s - idx;
		const a = DISTORTION_STOPS[idx],
			b = DISTORTION_STOPS[idx + 1];
		return [a[0] + (b[0] - a[0]) * frac, a[1] + (b[1] - a[1]) * frac, a[2] + (b[2] - a[2]) * frac];
	}
	function buildDistortionGrid() {
		const positions = [];
		const colors = [];
		const indices = [];
		const logMax = Math.log(areaScale(Math.PI - 0.03));
		const cols = GRID_THETA_STEPS + 1;
		for (let i = 0; i <= GRID_R_STEPS; i++) {
			// biased toward the outer edge -- like the Scherk tower grid, most
			// of the interesting (fast-changing) distortion is concentrated
			// near the boundary, so linear r spacing wastes resolution on the
			// calm middle of the map.
			const t = i / GRID_R_STEPS;
			const r = Math.PI * (1 - (1 - t) * (1 - t));
			const t01 = Math.min(Math.log(areaScale(r)) / logMax, 1);
			const [cr, cg, cb] = distortionColor(t01);
			for (let j = 0; j <= GRID_THETA_STEPS; j++) {
				const theta = (j / GRID_THETA_STEPS) * Math.PI * 2;
				positions.push(r * Math.sin(theta), 0, r * Math.cos(theta));
				colors.push(cr, cg, cb);
			}
		}
		for (let i = 0; i < GRID_R_STEPS; i++) {
			for (let j = 0; j < GRID_THETA_STEPS; j++) {
				const a = i * cols + j,
					b = (i + 1) * cols + j,
					c = (i + 1) * cols + j + 1,
					d = i * cols + j + 1;
				indices.push(a, b, c, a, c, d);
			}
		}
		const geometry = new THREE.BufferGeometry();
		geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
		geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
		geometry.setIndex(indices);
		geometry.computeVertexNormals();
		return geometry;
	}

	let container;
	let renderer, scene, camera, resizeObserver, animFrame;
	let debugControls;
	let coastlineLines = []; // [{ line, ring: [[lat,lon],...] }]
	let greatCircleMeshA, greatCircleMeshB, greatCircleMat;
	let distortionMesh, distortionMat;
	let centerMarker;
	let sphereMesh, sphereMaterial;

	const CAM_GLOBE = new THREE.Vector3(2.4, 1.7, 2.7);
	const CAM_FLAT = new THREE.Vector3(0.4, 7.6, 0.4);

	function updateScene(prog) {
		// camera: globe -> straight-down-ish over the peel window, then holds
		if (!debug) {
			const camT = remap(prog, ROTATE_END, PEEL_END);
			camera.position.lerpVectors(CAM_GLOBE, CAM_FLAT, camT);
			camera.lookAt(0, 0, 0);
		}

		const peelT = remap(prog, ROTATE_END, PEEL_END);

		// sphere + grid overlay fade out as the globe empties into the flat
		// map (nothing left to show once every point has peeled away)
		const sphereOpacity = 1 - smoothstep(remap(prog, ROTATE_END, PEEL_END));
		sphereMaterial.opacity = sphereOpacity;
		sphereMesh.visible = sphereOpacity > 0.01;
		sphereMesh.rotation.y = spinOffset(prog) * D2R;

		// coastlines: recompute every frame -- cheap (≈1300 points) and
		// needs to track both peelT and (once dragging starts) projLat/projLon.
		// Rendered as segments (not one continuous line per ring) so a
		// segment can be individually hidden -- by collapsing it to a
		// zero-length pair at the same point -- when either endpoint is
		// within CLIP_C of the singularity, rather than drawing a stray
		// line out to an unstable position (see blendedPosition's note).
		for (const { line, ring } of coastlineLines) {
			const posAttr = line.geometry.attributes.position;
			const n = ring.length;
			const pts = new Array(n);
			const cs = new Array(n);
			for (let i = 0; i < n; i++) {
				const v = new THREE.Vector3();
				cs[i] = blendedPosition(ring[i][0], ring[i][1], peelT, v);
				pts[i] = v;
			}
			for (let i = 0; i < n - 1; i++) {
				const clipped = cs[i] > CLIP_C || cs[i + 1] > CLIP_C;
				const a = pts[i];
				const b = clipped ? pts[i] : pts[i + 1];
				posAttr.setXYZ(i * 2, a.x, a.y, a.z);
				posAttr.setXYZ(i * 2 + 1, b.x, b.y, b.z);
			}
			posAttr.needsUpdate = true;
		}

		// distortion grid: fades in once the map is essentially flat; never
		// repositioned/recolored on drag (see the build-time note on why)
		distortionMat.opacity = 0.55 * smoothstep(remap(prog, PEEL_END, DISTORTION_END));

		// the two great circles: same peel/drag blend as coastlines, then
		// grown from 0 to a full loop across the CIRCLES window
		const growthT = smoothstep(remap(prog, DISTORTION_END, CIRCLES_END));
		const growthTheta = Math.PI * 2 * growthT;
		greatCircleMat.opacity = growthT > 0 ? 1 : 0;
		rebuildGreatCircle(greatCircleMeshA, Q_A, growthTheta, peelT);
		rebuildGreatCircle(greatCircleMeshB, Q_B, growthTheta, peelT);

		// center marker: only meaningful once the map is flat and draggable
		centerMarker.visible = dragEnabled;
	}

	function rebuildGreatCircle(mesh, Q, growthTheta, peelT) {
		if (mesh.geometry) mesh.geometry.dispose();
		const n = Math.max(2, Math.round((growthTheta / (Math.PI * 2)) * SEGMENTS * 2));
		const pts = [];
		const gp = new THREE.Vector3();
		for (let i = 0; i <= n; i++) {
			const theta = (i / n) * growthTheta;
			greatCirclePoint(Q, theta, gp);
			const [lat, lon] = latLonOf(gp);
			const out = new THREE.Vector3();
			blendedPosition(lat, lon, peelT, out);
			// A full loop passes through the exact south pole (theta=3pi/2),
			// the same singularity coastlines clip around above -- but here
			// it's one sample among many on an otherwise-smooth curve rather
			// than a load-bearing outline vertex, so a plain radius clamp
			// (accepting the bearing may wobble slightly right at that one
			// sample) is enough; no need for the segment-dropping machinery.
			const r = Math.hypot(out.x, out.z);
			if (r > CLIP_C) {
				const s = CLIP_C / r;
				out.x *= s;
				out.z *= s;
			}
			pts.push(out);
		}
		if (pts.length < 2) pts.push(new THREE.Vector3(), new THREE.Vector3(0.001, 0, 0));
		const curve = new THREE.CatmullRomCurve3(pts);
		mesh.geometry = new THREE.TubeGeometry(curve, Math.max(8, pts.length), 0.01, 6, false);
	}

	$effect(() => {
		const p = progress;
		if (scene) updateScene(p);
	});

	// --- step 5: drag anywhere on the flat map to re-center the projection
	// there. Reading the *current* projLat/projLon on every move (not just
	// on drag-start) means each move is "treat wherever the pointer is now
	// as the new center," which is what makes the map continuously reflow
	// under the pointer as if it were being panned/grabbed, converging
	// smoothly rather than jumping once on release. ---
	let dragging = false;
	const raycaster = new THREE.Raycaster();
	const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
	function pointerToWorld(evt) {
		const rect = renderer.domElement.getBoundingClientRect();
		const ndc = new THREE.Vector2(((evt.clientX - rect.left) / rect.width) * 2 - 1, -((evt.clientY - rect.top) / rect.height) * 2 + 1);
		raycaster.setFromCamera(ndc, camera);
		const hit = new THREE.Vector3();
		return raycaster.ray.intersectPlane(dragPlane, hit) ? hit : null;
	}
	function onPointerDown(evt) {
		if (!dragEnabled) return;
		dragging = true;
		renderer.domElement.setPointerCapture(evt.pointerId);
	}
	function onPointerMove(evt) {
		if (!dragging) return;
		const hit = pointerToWorld(evt);
		if (!hit) return;
		const [lat, lon] = unproject(hit.x, hit.z, projLat, projLon);
		projLat = lat;
		projLon = lon;
		updateScene(progress);
	}
	function onPointerUp(evt) {
		dragging = false;
		renderer.domElement.releasePointerCapture(evt.pointerId);
	}

	onMount(() => {
		scene = new THREE.Scene();
		camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
		camera.position.copy(CAM_GLOBE);

		renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
		container.appendChild(renderer.domElement);

		const pmremGenerator = new THREE.PMREMGenerator(renderer);
		const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
		scene.environment = envTexture;
		pmremGenerator.dispose();

		scene.add(new THREE.AmbientLight(0xffffff, 0.5));
		const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
		dirLight.position.set(3, 4, 5);
		scene.add(dirLight);

		// Opaque sphere (same reasoning as SphereGeometryScene: opaque avoids
		// the transparent-queue depth-sort artifact where curved lines show
		// through), faded via a plain opacity anyway during the peel -- an
		// acceptable, deliberate exception since by the time it's
		// transparent there's nothing behind it left to sort against (the
		// coastlines have already mostly peeled off it).
		sphereMaterial = new THREE.MeshStandardMaterial({
			color: activePalette().blue,
			roughness: 0.5,
			metalness: 0,
			transparent: true
		});
		sphereMesh = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), sphereMaterial);
		scene.add(sphereMesh);

		// coastlines
		const coastlineGroup = new THREE.Group();
		const coastlineMat = new THREE.LineBasicMaterial({
			color: activePalette().textPrimary ?? 0x0b0b0b,
			transparent: true,
			opacity: 0.85,
			depthWrite: false
		});
		for (const ring of coastlines) {
			const geometry = new THREE.BufferGeometry();
			// (ring.length - 1) segments, 2 vertices each -- see updateScene's
			// coastline loop for why (LineSegments, not one continuous Line,
			// so individual segments near the singularity can be collapsed).
			geometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array((ring.length - 1) * 2 * 3), 3));
			const line = new THREE.LineSegments(geometry, coastlineMat);
			coastlineLines.push({ line, ring });
			coastlineGroup.add(line);
		}
		scene.add(coastlineGroup);

		// distortion grid
		distortionMat = new THREE.MeshBasicMaterial({
			vertexColors: true,
			transparent: true,
			opacity: 0,
			depthWrite: false,
			side: THREE.DoubleSide
		});
		distortionMesh = new THREE.Mesh(buildDistortionGrid(), distortionMat);
		scene.add(distortionMesh);

		// great circles
		greatCircleMat = new THREE.MeshBasicMaterial({ color: activePalette().blue, transparent: true, opacity: 0, depthWrite: false });
		greatCircleMeshA = new THREE.Mesh(new THREE.BufferGeometry(), greatCircleMat);
		greatCircleMeshB = new THREE.Mesh(new THREE.BufferGeometry(), greatCircleMat);
		scene.add(greatCircleMeshA, greatCircleMeshB);

		// center marker (step 5)
		const markerMat = new THREE.MeshBasicMaterial({ color: activePalette().orange, depthWrite: false });
		centerMarker = new THREE.Mesh(new THREE.CircleGeometry(0.05, 24), markerMat);
		centerMarker.rotation.x = -Math.PI / 2;
		centerMarker.position.y = 0.01;
		centerMarker.visible = false;
		scene.add(centerMarker);

		updateScene(progress);

		renderer.domElement.addEventListener('pointerdown', onPointerDown);
		renderer.domElement.addEventListener('pointermove', onPointerMove);
		renderer.domElement.addEventListener('pointerup', onPointerUp);

		if (debug) {
			debugControls = new OrbitControls(camera, renderer.domElement);
			debugControls.enableDamping = true;
			const formatDebugReadout = () => {
				const p = camera.position;
				const t = debugControls.target;
				debugReadout = `pos:    new THREE.Vector3(${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)})\nlookAt: new THREE.Vector3(${t.x.toFixed(2)}, ${t.y.toFixed(2)}, ${t.z.toFixed(2)})`;
			};
			debugControls.addEventListener('change', formatDebugReadout);
			formatDebugReadout();
		}

		resizeObserver = new ResizeObserver((entries) => {
			const { width, height } = entries[0].contentRect;
			if (width === 0 || height === 0) return;
			renderer.setSize(width, height);
			renderer.setPixelRatio(window.devicePixelRatio || 1);
			camera.aspect = width / height;
			camera.updateProjectionMatrix();
		});
		resizeObserver.observe(container);

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
			renderer.domElement.removeEventListener('pointerdown', onPointerDown);
			renderer.domElement.removeEventListener('pointermove', onPointerMove);
			renderer.domElement.removeEventListener('pointerup', onPointerUp);
			envTexture.dispose();
			renderer.dispose();
		};
	});

	// --- on-canvas captions, same pattern as SphereGeometryScene ---
	const CAPTION_DEFAULT_BOTTOM = '12%';
	const CAPTIONS = [
		{ start: 0, end: ROTATE_END, text: 'This is the Azimuthal Equidistant projection, centered on the north pole.' },
		{ start: ROTATE_END, end: PEEL_END, text: 'Every point keeps its true distance from the center — but watch what happens to its shape as it flattens.' },
		{ start: PEEL_END, end: DISTORTION_END, text: 'Color shows how much area distorts away from the center — barely at all nearby, wildly by the far edge.' },
		{
			start: DISTORTION_END,
			end: CIRCLES_END,
			text: 'The same two great circles from before — straight lines here, since they both pass through the center.'
		},
		{ start: CIRCLES_END, end: 1, text: 'Drag anywhere to re-center the projection there, and watch the whole map — and its distortion — reflow.' }
	];
	function captionOpacity(start, end, prog) {
		if (prog < start || prog > end) return 0;
		const fade = Math.min(0.15, (end - start) * 0.25) || 0.001;
		return Math.min(remap(prog, start, start + fade), 1 - remap(prog, end - fade, end));
	}
	let captionOpacities = $derived(CAPTIONS.map((c) => captionOpacity(c.start, c.end, progress)));
</script>

<div class="scene-container" bind:this={container}></div>

<div class="caption-overlay">
	{#each CAPTIONS as c, i}
		{#if captionOpacities[i] > 0.01}
			<p class="caption" style="opacity: {captionOpacities[i]}; bottom: {c.bottom ?? CAPTION_DEFAULT_BOTTOM};">{c.text}</p>
		{/if}
	{/each}
	{#if dragEnabled}
		<p class="caption drag-hint" style="opacity: {1 - captionOpacities.reduce((a, b) => a + b, 0)};">Drag the map to re-center it</p>
	{/if}
</div>

{#if debug}
	<pre class="debug-readout">{debugReadout}</pre>
{/if}

<style>
	.scene-container {
		width: 100%;
		height: 100%;
	}
	.scene-container :global(canvas) {
		display: block;
		touch-action: none;
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
	.drag-hint {
		font-size: 0.85rem;
		color: var(--text-muted);
		background: transparent;
		box-shadow: none;
		backdrop-filter: none;
	}
	.debug-readout {
		position: absolute;
		top: 1rem;
		left: 1rem;
		margin: 0;
		padding: 0.6rem 0.8rem;
		border-radius: 6px;
		background: rgba(0, 0, 0, 0.75);
		color: #6fffb0;
		font-family: ui-monospace, 'SF Mono', Menlo, monospace;
		font-size: 0.8rem;
		line-height: 1.4;
		white-space: pre;
		pointer-events: none;
		z-index: 10;
	}
</style>
