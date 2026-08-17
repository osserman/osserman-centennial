<script module>
	// Stage boundaries live here (not in a regular <script> block) so they
	// compile to real ES exports — +page.svelte imports them directly to
	// derive which stage caption to show, rather than hand-copying the same
	// numbers into a second file where they could quietly drift out of sync.
	export const ZOOM_END = 0.2;
	export const ARC_IN_START = 0.2;
	export const ARC_IN_END = 0.35;
	export const FADE_OUT_START = 0.35;
	export const FADE_OUT_END = 0.55;
	export const ROTATE_START = 0.55;
	export const ROTATE_END = 0.75;
	export const FOLD_START = 0.75;
	export const FOLD_END = 1.0;
</script>

<script>
	// Slide 4's scene: demonstrates zero mean curvature directly, rather than
	// asserting it — at the catenoid's waist, the meridian (profile) curve and
	// the parallel (ring) curve are the two principal-curvature directions (a
	// standard fact for any surface of revolution), and they bend equally in
	// opposite directions. Same imperative-scene pattern as CatenoidScene /
	// CatenaryUnrollScene (own onMount, own render loop), driven by a single
	// scroll-scrubbed `progress` prop.
	//
	// Why the waist (z=0) specifically: r(z) = c*cosh(z/c) has dr/dz = 0 there
	// (it's r(z)'s minimum), so under this project's group-rotation convention
	// (group.rotation.z = 90 deg, world = (-y_local, x_local, z_local)) the
	// meridian's tangent is purely world X, the parallel's tangent purely
	// world Z, and the surface normal purely world Y — three orthogonal axes,
	// with the point itself sitting exactly on the world Y-axis. That makes
	// "rotate the parallel arc 90 deg about the axis through the point" and
	// "reflect one arc across the shared tangent line" exact, not approximate.
	//
	// Five progress stages:
	//   0.00-0.20  camera dollies from the whole catenoid into a close-up on
	//              the waist point (continuity with Slide 2/3's framing)
	//   0.20-0.35  the meridian arc, parallel arc, each traced on its own
	//              wireframe cutting plane (the reference image's device for
	//              "this curve is where the surface meets this plane"), and
	//              a normal vector (THREE.ArrowHelper) fade in at that
	//              point, over the still-visible surface
	//   0.35-0.55  the catenoid surface fades out (depthWrite:false opacity
	//              crossfade, same technique/bug-fix as CatenaryUnrollScene),
	//              isolating the two arcs + normal
	//   0.55-0.75  the parallel arc (and its cutting plane) rotates 90 deg
	//              about the local X axis (== the world Y-axis through the
	//              point, under the group's rotation) into the meridian's
	//              plane — "both facing forward," the two wireframe planes
	//              visibly becoming one
	//   0.75-1.00  the parallel arc's local X is mirrored (scale.x: 1 -> -1),
	//              folding it across the shared tangent line at the point so
	//              it lands exactly on the meridian arc
	import { onMount } from 'svelte';
	import * as THREE from 'three';
	import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
	import { activePalette } from '$lib/palette.js';
	import { catenaryProfile, catenaryParam } from '$lib/catenoidProfile.js';

	let { R, L, progress = 0 } = $props();

	const REVOLUTION_SEGMENTS = 48;

	// Continuity with the other two scenes' end-of-slide framing.
	const CAMERA_WIDE = new THREE.Vector3(0, 0.25, 6.9);

	const ARC_SEGMENTS = 24;
	// Thin and unlit (see the materials below) rather than a shaded 3D tube —
	// a shaded tube reads as its own floating object next to the surface; a
	// thin flat-colored line reads as a marking traced *on* the surface,
	// which is the point (feedback from an early version: the tubes "muddled
	// things" more than they helped).
	const ARC_TUBE_RADIUS = 0.006;
	// The surface and rings keep normal depth writing (unlike
	// CatenaryUnrollScene's mesh/axis, which need depthWrite:false so the
	// axis shows through a still-opaque-looking fading tube) — this scene's
	// rings fade in exact lockstep with the surface, so there's no case
	// where one needs to show through a more-opaque other. Normal depth
	// writing is what lets the rings be properly, partially occluded by the
	// near side of the surface (as they are in CatenoidScene) instead of
	// drawing as full unoccluded outlines on top of it. The highlight
	// geometry (arcs/planes/arrow) sits almost exactly on the surface at
	// the waist, though, so it's nudged this far outward along the local
	// radial (normal) direction to avoid z-fighting with the now-opaque mesh.
	const SURFACE_OFFSET = 0.004;

	function remap(t, lo, hi) {
		return Math.max(0, Math.min(1, (t - lo) / (hi - lo)));
	}

	function buildLathe(points) {
		const vec2s = points.map((p) => new THREE.Vector2(Math.max(p.r, 1e-4), p.z));
		return new THREE.LatheGeometry(vec2s, REVOLUTION_SEGMENTS, 0, Math.PI * 2);
	}

	// Meridian arc near the waist, in the same local (x,y,z)=(r,z,0) space a
	// Lathe vertex at phi=0 already sits in — absolute local coordinates,
	// since this arc never moves, only fades.
	function buildMeridianGeometry(c, r0, halfSpan) {
		const pts = [];
		for (let i = 0; i <= ARC_SEGMENTS; i++) {
			const z = -halfSpan + (2 * halfSpan * i) / ARC_SEGMENTS;
			pts.push(new THREE.Vector3(c * Math.cosh(z / c) + SURFACE_OFFSET, z, 0));
		}
		const curve = new THREE.CatmullRomCurve3(pts);
		return new THREE.TubeGeometry(curve, ARC_SEGMENTS, ARC_TUBE_RADIUS, 8, false);
	}

	// Parallel arc near the waist, built RELATIVE to the shared point
	// (r0,0,0) so it can be a child of a pivot Group positioned there —
	// rotating/scaling that pivot then rotates/folds the arc exactly about
	// the point, with no extra offset math needed downstream.
	function buildParallelGeometry(r0, halfAngle) {
		const pts = [];
		for (let i = 0; i <= ARC_SEGMENTS; i++) {
			const phi = -halfAngle + (2 * halfAngle * i) / ARC_SEGMENTS;
			pts.push(new THREE.Vector3(r0 * Math.cos(phi) - r0, 0, r0 * Math.sin(phi)));
		}
		const curve = new THREE.CatmullRomCurve3(pts);
		return new THREE.TubeGeometry(curve, ARC_SEGMENTS, ARC_TUBE_RADIUS, 8, false);
	}

	let container;
	let renderer, scene, group, camera, resizeObserver, animFrame;
	let mesh, meshMaterial;
	let ringMaterial, ringMeshes = [];
	let meridianMesh, meridianMaterial;
	let parallelPivot, parallelMesh, parallelMaterial;
	let meridianPlane, meridianPlaneMaterial;
	let parallelPlane, parallelPlaneMaterial;
	let normalArrow;
	let cameraClose = CAMERA_WIDE.clone();
	let waistPoint = new THREE.Vector3(0, 0, 0);

	function updateScene(prog) {
		// --- camera: dolly in (0 -> ZOOM_END), hold, ease to face-on (ROTATE_START -> ROTATE_END) ---
		const zoomT = remap(prog, 0, ZOOM_END);
		const zoomed = new THREE.Vector3().lerpVectors(CAMERA_WIDE, cameraClose, zoomT);
		const faceT = remap(prog, ROTATE_START, ROTATE_END);
		const faceon = new THREE.Vector3(waistPoint.x, waistPoint.y, cameraClose.length() * 0.7);
		const camPos = new THREE.Vector3().lerpVectors(zoomed, faceon, faceT);
		camera.position.copy(camPos);
		camera.lookAt(waistPoint);

		// --- catenoid surface: full opacity, then fades out ---
		const fadeOutT = remap(prog, FADE_OUT_START, FADE_OUT_END);
		meshMaterial.opacity = 0.82 * (1 - fadeOutT);
		meshMaterial.visible = fadeOutT < 1;
		ringMaterial.opacity = 1 - fadeOutT;
		for (const ring of ringMeshes) ring.visible = fadeOutT < 1;

		// --- arcs + planes + normal: fade in ---
		const arcInT = remap(prog, ARC_IN_START, ARC_IN_END);
		meridianMaterial.opacity = arcInT;
		meridianMesh.visible = arcInT > 0;
		parallelMaterial.opacity = arcInT;
		parallelMesh.visible = arcInT > 0;
		meridianPlaneMaterial.opacity = arcInT * 0.22;
		meridianPlane.visible = arcInT > 0;
		parallelPlaneMaterial.opacity = arcInT * 0.22;
		parallelPlane.visible = arcInT > 0;
		normalArrow.visible = arcInT > 0;
		normalArrow.line.material.opacity = arcInT;
		normalArrow.cone.material.opacity = arcInT;

		// --- rotate the parallel arc into the meridian's plane ---
		const rotT = remap(prog, ROTATE_START, ROTATE_END);
		parallelPivot.rotation.x = (Math.PI / 2) * rotT;

		// --- fold: mirror it across the shared tangent line, onto the meridian ---
		const foldT = remap(prog, FOLD_START, FOLD_END);
		parallelPivot.scale.x = 1 - 2 * foldT;
	}

	$effect(() => {
		const p = progress;
		if (scene) updateScene(p);
	});

	onMount(() => {
		scene = new THREE.Scene();
		camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
		camera.position.copy(CAMERA_WIDE);

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

		// Same group convention as CatenoidScene/CatenaryUnrollScene.
		group = new THREE.Group();
		group.rotation.z = Math.PI / 2;
		scene.add(group);

		const baseProfile = catenaryProfile(R, L);
		const c = catenaryParam(R, L);
		const r0 = c; // r(0) = c*cosh(0) = c

		// Waist point in world space: local (r0,0,0) -> world (-0, r0, 0).
		waistPoint = new THREE.Vector3(0, r0, 0);
		cameraClose = new THREE.Vector3(waistPoint.x + 0.55, waistPoint.y + 0.15, waistPoint.z + 0.9);

		meshMaterial = new THREE.MeshPhysicalMaterial({
			color: activePalette().blue,
			side: THREE.DoubleSide,
			metalness: 0,
			roughness: 0.25,
			transparent: true,
			opacity: 0.82,
			clearcoat: 0.6,
			clearcoatRoughness: 0.15,
			iridescence: 0.6,
			iridescenceIOR: 1.3,
			iridescenceThicknessRange: [100, 400]
		});
		mesh = new THREE.Mesh(buildLathe(baseProfile), meshMaterial);
		group.add(mesh);

		ringMaterial = new THREE.MeshStandardMaterial({
			color: activePalette().textPrimary ?? 0x0b0b0b,
			transparent: true,
			opacity: 1
		});
		for (const z of [-L, L]) {
			const ring = new THREE.Mesh(new THREE.TorusGeometry(R, 0.015, 12, 64), ringMaterial);
			ring.rotation.x = Math.PI / 2;
			ring.position.y = z;
			group.add(ring);
			ringMeshes.push(ring);
		}

		// Arc span, scaled off the waist radius/half-length so it reads as a
		// small local patch regardless of exact R/L.
		const meridianHalfSpan = 0.4 * L;
		const parallelHalfAngle = 0.4;
		const planeSize = Math.max(meridianHalfSpan, r0 * Math.sin(parallelHalfAngle)) * 1.6;

		// MeshBasicMaterial (unlit, flat color) rather than a lit material —
		// a lit tube picks up its own highlight/shadow independent of the
		// surface beneath it, which reads as "a separate 3D object floating
		// near the surface" rather than "a curve traced on the surface."
		meridianMaterial = new THREE.MeshBasicMaterial({
			color: activePalette().aqua,
			transparent: true,
			opacity: 0,
			depthWrite: false
		});
		meridianMesh = new THREE.Mesh(
			buildMeridianGeometry(c, r0, meridianHalfSpan),
			meridianMaterial
		);
		meridianMesh.visible = false;
		group.add(meridianMesh);

		parallelMaterial = new THREE.MeshBasicMaterial({
			color: activePalette().orange,
			transparent: true,
			opacity: 0,
			depthWrite: false
		});
		parallelPivot = new THREE.Group();
		parallelPivot.position.set(r0 + SURFACE_OFFSET, 0, 0);
		parallelMesh = new THREE.Mesh(buildParallelGeometry(r0, parallelHalfAngle), parallelMaterial);
		parallelMesh.visible = false;
		parallelPivot.add(parallelMesh);
		group.add(parallelPivot);

		// Cutting planes — grounds each curve as "where the surface meets
		// this plane" (the reference image's own device) rather than an
		// abstract floating arc. A plain THREE.PlaneGeometry already lies in
		// its own local X-Y plane, which is exactly the local X-Y plane the
		// meridian curve itself lies in (see buildMeridianGeometry) — no
		// rotation needed, just centered on the shared point.
		meridianPlaneMaterial = new THREE.MeshBasicMaterial({
			color: activePalette().muted ?? 0x898781,
			transparent: true,
			opacity: 0,
			depthWrite: false,
			side: THREE.DoubleSide,
			wireframe: true
		});
		meridianPlane = new THREE.Mesh(
			new THREE.PlaneGeometry(planeSize, planeSize, 3, 3),
			meridianPlaneMaterial
		);
		meridianPlane.position.set(r0 + SURFACE_OFFSET, 0, 0);
		meridianPlane.visible = false;
		group.add(meridianPlane);

		// The parallel's own plane starts perpendicular to the meridian's
		// (local X-Z instead of local X-Y — a fixed -90 deg X rotation on
		// top of whatever parallelPivot itself is doing) and is a child of
		// parallelPivot for the same reason parallelMesh is: rotating the
		// pivot 90 deg (see the ROTATE stage in updateScene) carries this
		// plane into exact alignment with the meridian's, visually showing
		// the two cutting planes becoming one — not just the curve.
		parallelPlaneMaterial = new THREE.MeshBasicMaterial({
			color: activePalette().muted ?? 0x898781,
			transparent: true,
			opacity: 0,
			depthWrite: false,
			side: THREE.DoubleSide,
			wireframe: true
		});
		parallelPlane = new THREE.Mesh(
			new THREE.PlaneGeometry(planeSize, planeSize, 3, 3),
			parallelPlaneMaterial
		);
		parallelPlane.rotation.x = -Math.PI / 2;
		parallelPlane.visible = false;
		parallelPivot.add(parallelPlane);

		// Outward surface normal at the waist: local +X (== world +Y).
		normalArrow = new THREE.ArrowHelper(
			new THREE.Vector3(1, 0, 0),
			new THREE.Vector3(r0 + SURFACE_OFFSET, 0, 0),
			0.35 * L,
			activePalette().textPrimary ?? 0x0b0b0b,
			0.12 * L,
			0.07 * L
		);
		normalArrow.line.material.transparent = true;
		normalArrow.cone.material.transparent = true;
		normalArrow.visible = false;
		group.add(normalArrow);

		updateScene(progress);

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
			renderer.render(scene, camera);
			animFrame = requestAnimationFrame(tick);
		}
		tick();

		return () => {
			cancelAnimationFrame(animFrame);
			resizeObserver.disconnect();
			envTexture.dispose();
			renderer.dispose();
		};
	});
</script>

<div class="scene-container" bind:this={container}></div>

<style>
	.scene-container {
		width: 100%;
		height: 100%;
	}
	.scene-container :global(canvas) {
		display: block;
	}
</style>
