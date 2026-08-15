<script>
	// Slide 3's scene: the finished catenoid from Slide 2 unrolls back down to
	// the catenary curve that generates it, staged by a single continuous
	// `progress` prop (0->1, scroll-scrubbed by the page — see
	// updateCatenaryProgress in +page.svelte). Same imperative-scene pattern
	// as CatenoidScene.svelte (own onMount, own render loop), deliberately
	// simpler: no OrbitControls (this is a passive scroll-driven animation,
	// not a drag sandbox) and no area callback.
	//
	// Stages, by progress range (see the comments on each piece below for
	// why these particular boundaries):
	//   0.00-0.45  surface unrolls (phiLength 2pi->~0) and the rings collapse
	//              toward points, while the camera eases toward face-on
	//   0.30-0.45  cross-fade: the Lathe surface fades out as a thin curve
	//              "line" mesh (built from the same profile points) fades in
	//   0.45-0.55  camera finishes settling exactly face-on
	//   0.55-0.70  a straight axis grows in through the collapsed rings
	//   0.70-1.00  the curve extends past z=+-L using the real catenary
	//              formula r(z) = c*cosh(z/c), not a guessed taper
	import { onMount } from 'svelte';
	import * as THREE from 'three';
	import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
	import { activePalette } from '$lib/palette.js';
	import { catenaryProfile, catenaryParam } from '$lib/catenoidProfile.js';

	let { R, L, progress = 0 } = $props();

	const REVOLUTION_SEGMENTS = 48;
	const MIN_PHI = 0.015; // never fully 0 - LatheGeometry degenerates there
	const MIN_RING_FRAC = 0.02; // rings shrink toward a point, not to it exactly
	const EXTEND_LENGTH_FRAC = 2.2; // extend the curve by this many L's past each ring

	const UNROLL_END = 0.45;
	const CROSSFADE_START = 0.3;
	const CROSSFADE_END = 0.45;
	const CAMERA_END_T = 0.55;
	const AXIS_START = 0.55;
	const AXIS_END = 0.7;
	const EXTEND_START = 0.7;
	const EXTEND_END = 1.0;

	// Continuity with CatenoidScene's own end-of-reveal camera position (see
	// its CAMERA_END) — this scene picks up close to where that one left
	// off, then only needs a modest final adjustment (not a big rotation) to
	// reach a perfectly centered face-on view, since a camera looking mostly
	// along world Z already reads as "face-on" for the flat curve the shape
	// collapses into (see the group-orientation comment in onMount below).
	const CAMERA_START = new THREE.Vector3(0, 0.25, 6.9);
	const CAMERA_FACEON = new THREE.Vector3(0, 0, 7.5);

	function remap(t, lo, hi) {
		return Math.max(0, Math.min(1, (t - lo) / (hi - lo)));
	}

	// Extends the base catenary profile past z=+-L using the same formula
	// (r = c*cosh(z/c)) that generated it — an actual continuation of the
	// mathematical curve, not a taper made up for the animation. Grows
	// outward over EXTEND_START..EXTEND_END rather than appearing all at once.
	function computeProfilePoints(prog) {
		const base = catenaryProfile(R, L);
		if (!base) return null;
		const c = catenaryParam(R, L);
		const extendLen = L * EXTEND_LENGTH_FRAC * remap(prog, EXTEND_START, EXTEND_END);
		if (extendLen <= 0 || c == null) return base;
		const EXT_SEGMENTS = 16;
		const left = [];
		for (let i = EXT_SEGMENTS; i >= 1; i--) {
			const z = -L - (extendLen * i) / EXT_SEGMENTS;
			left.push({ z, r: c * Math.cosh(z / c) });
		}
		const right = [];
		for (let i = 1; i <= EXT_SEGMENTS; i++) {
			const z = L + (extendLen * i) / EXT_SEGMENTS;
			right.push({ z, r: c * Math.cosh(z / c) });
		}
		return [...left, ...base, ...right];
	}

	function buildLathe(points, phiLength) {
		const vec2s = points.map((p) => new THREE.Vector2(Math.max(p.r, 1e-4), p.z));
		return new THREE.LatheGeometry(vec2s, REVOLUTION_SEGMENTS, 0, phiLength);
	}

	// Local (x,y,z) = (r, z_profile, 0) is exactly where a Lathe vertex at
	// phi=0 already sits (see buildLathe) — the curve line is built in that
	// same local space so it lines up with the surface throughout the
	// cross-fade instead of needing separate placement logic.
	function buildCurveLine(points) {
		const vecs = points.map((p) => new THREE.Vector3(p.r, p.z, 0));
		const curve = new THREE.CatmullRomCurve3(vecs);
		return new THREE.TubeGeometry(curve, Math.max(16, vecs.length * 2), 0.018, 8, false);
	}

	let container;
	let renderer, scene, group, camera, resizeObserver, animFrame;
	let mesh, curveLine, axis;
	let meshMaterial, lineMaterial;
	let ringMeshes = [];

	function updateScene(prog) {
		const points = computeProfilePoints(prog);
		if (!points) return;

		// --- surface unroll + ring collapse (0 -> UNROLL_END) ---
		const collapseT = remap(prog, 0, UNROLL_END);
		const phiLength = MIN_PHI + (Math.PI * 2 - MIN_PHI) * (1 - collapseT);
		const ringR = R * (1 - collapseT * (1 - MIN_RING_FRAC));

		if (mesh) {
			group.remove(mesh);
			mesh.geometry.dispose();
		}
		mesh = new THREE.Mesh(buildLathe(catenaryProfile(R, L), phiLength), meshMaterial);
		group.add(mesh);

		for (const ring of ringMeshes) {
			group.remove(ring);
			ring.geometry.dispose();
		}
		ringMeshes = [];
		const ringMaterial = new THREE.MeshStandardMaterial({ color: activePalette().textPrimary ?? 0x0b0b0b });
		for (const z of [-L, L]) {
			const ring = new THREE.Mesh(new THREE.TorusGeometry(ringR, 0.015, 12, 64), ringMaterial);
			ring.rotation.x = Math.PI / 2;
			ring.position.y = z;
			group.add(ring);
			ringMeshes.push(ring);
		}

		// --- surface <-> line cross-fade (CROSSFADE_START -> CROSSFADE_END) ---
		const fadeT = remap(prog, CROSSFADE_START, CROSSFADE_END);
		meshMaterial.opacity = 0.82 * (1 - fadeT);
		meshMaterial.visible = fadeT < 1;

		if (curveLine) {
			group.remove(curveLine);
			curveLine.geometry.dispose();
		}
		curveLine = new THREE.Mesh(buildCurveLine(points), lineMaterial);
		lineMaterial.opacity = fadeT;
		lineMaterial.visible = fadeT > 0;
		group.add(curveLine);

		// --- axis grows in (AXIS_START -> AXIS_END) ---
		const axisT = remap(prog, AXIS_START, AXIS_END);
		const axisHalfLength = L * 2.0;
		axis.scale.y = axisHalfLength * 2 * axisT;
		axis.visible = axisT > 0;

		// --- camera eases to face-on (0 -> CAMERA_END_T) ---
		const camT = remap(prog, 0, CAMERA_END_T);
		camera.position.lerpVectors(CAMERA_START, CAMERA_FACEON, camT);
		camera.lookAt(0, 0, 0);
	}

	$effect(() => {
		const p = progress;
		const r = R;
		const l = L;
		if (scene) updateScene(p);
	});

	onMount(() => {
		scene = new THREE.Scene();
		camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
		camera.position.copy(CAMERA_START);

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

		// Same group convention as CatenoidScene: LatheGeometry revolves
		// around local Y, so the group is rotated 90° about Z to lay the
		// revolution axis flat along world X. At phi=0 (or once the surface
		// has collapsed to a sliver near it), the flat profile lies in the
		// local X-Y plane, which lands in the world X-Y plane too (z=0) —
		// so a camera looking mostly along world Z already sees it face-on,
		// which is why CAMERA_FACEON only needs a modest final adjustment
		// rather than a large rotation.
		group = new THREE.Group();
		group.rotation.z = Math.PI / 2;
		scene.add(group);

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
		lineMaterial = new THREE.MeshStandardMaterial({
			color: activePalette().blue,
			transparent: true,
			opacity: 0,
			roughness: 0.4,
			metalness: 0.1
		});

		axis = new THREE.Mesh(
			new THREE.CylinderGeometry(0.006, 0.006, 1, 8),
			new THREE.MeshStandardMaterial({ color: activePalette().muted ?? 0x898781 })
		);
		axis.visible = false;
		group.add(axis);

		updateScene(progress);
		camera.lookAt(0, 0, 0);

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
