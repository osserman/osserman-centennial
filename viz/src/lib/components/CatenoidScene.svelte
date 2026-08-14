<script>
	// The persistent 3D view for Interaction 1: two coaxial rings connected
	// by a surface of revolution, revolved live from whatever `profile`
	// points the reader is currently exploring (via ProfileEditor.svelte).
	// Owns its own WebGL scene imperatively in onMount, same pattern
	// CitationGraph.svelte uses for its Canvas 2D scene — one component,
	// one render target, reactive props drive updates rather than a
	// declarative scene-graph layer.
	import { onMount, untrack } from 'svelte';
	import * as THREE from 'three';
	import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
	import { activePalette } from '$lib/palette.js';
	import { surfaceArea } from '$lib/catenoidProfile.js';

	let { profile, R, L, revealProgress = 1, onAreaChange } = $props();

	const REVOLUTION_SEGMENTS = 48;

	// Camera lerps from a 3/4 view (good for watching the sweep-reveal take
	// shape) to a near-straight-on view perpendicular to the tube's axis —
	// same side-on framing ProfileEditor's own 2D curve uses — as
	// `revealProgress` goes 0 -> 1. Not perfectly flat/orthographic (a
	// slight y offset) so it still reads as 3D once the sandbox stages begin.
	// Backed out further than the original tight framing so the shape sits
	// comfortably within the frame with room to spare at both ends of the lerp.
	const CAMERA_START = new THREE.Vector3(4.0, 2.3, 5.3);
	const CAMERA_END = new THREE.Vector3(0, 0.25, 6.9);

	function buildLathe(points, phiLength) {
		const vec2s = points.map((p) => new THREE.Vector2(p.r, p.z));
		return new THREE.LatheGeometry(vec2s, REVOLUTION_SEGMENTS, 0, phiLength);
	}

	let container;
	let renderer, scene, group, camera, controls, mesh, resizeObserver, animFrame;
	let ringMeshes = [];

	function rebuildMesh(points, phiLength) {
		const geometry = buildLathe(points, phiLength);
		if (mesh) {
			group.remove(mesh);
			mesh.geometry.dispose();
		}
		mesh = new THREE.Mesh(
			geometry,
			new THREE.MeshStandardMaterial({
				color: activePalette().blue,
				side: THREE.DoubleSide,
				metalness: 0.1,
				roughness: 0.6
			})
		);
		group.add(mesh);
		// untrack: onAreaChange runs synchronously inside this function, which
		// itself runs inside the $effect below — without untrack, the parent's
		// resulting state writes get attributed back into *this* effect's own
		// reactive context and re-invalidate it, causing an infinite update
		// loop (hit this for real during development — see git history).
		// Same fix already used in CitationGraph.svelte for the analogous
		// "effect's call chain synchronously touches something reactive it
		// shouldn't be attributed to" problem.
		untrack(() => onAreaChange?.(surfaceArea(points)));
	}

	function rebuildRings() {
		for (const ring of ringMeshes) {
			group.remove(ring);
			ring.geometry.dispose();
		}
		ringMeshes = [];
		// activePalette() with no override follows document.documentElement's
		// [data-theme] stamp if set, else the OS prefers-color-scheme — same
		// fallback CitationGraph.svelte uses. This page has no manual
		// light/dark toggle of its own, so there's no live re-check needed
		// beyond what already happens here on every ring/mesh rebuild.
		const ringMaterial = new THREE.MeshStandardMaterial({ color: activePalette().textPrimary ?? 0x0b0b0b });
		for (const z of [-L, L]) {
			const ring = new THREE.Mesh(new THREE.TorusGeometry(R, 0.015, 12, 64), ringMaterial);
			ring.rotation.x = Math.PI / 2;
			ring.position.y = z;
			group.add(ring);
			ringMeshes.push(ring);
		}
	}

	function applyCameraForProgress(p) {
		camera.position.lerpVectors(CAMERA_START, CAMERA_END, p);
		camera.lookAt(0, 0, 0);
	}

	// `profile`/`revealProgress`/`R`/`L` must be read unconditionally at the
	// top of each effect, not inside an `if` — on an effect's first run
	// (before onMount has set `scene`/`group`), a guarded read would never
	// happen on that run at all, and Svelte's effects re-derive their
	// dependency set fresh from whatever was actually read on each run, so
	// skipping a read means the effect never fires again on later changes
	// to that value. (Hit this exact bug during the first version of this
	// component too.)
	$effect(() => {
		const points = profile;
		const p = revealProgress;
		if (scene) rebuildMesh(points, p * Math.PI * 2);
	});

	$effect(() => {
		const r = R;
		const l = L;
		if (group) rebuildRings();
	});

	// Camera is driven directly (lerped) during the scroll-scrubbed reveal;
	// OrbitControls is constructed lazily, only once reveal completes, so it
	// picks up the camera's exact end-of-lerp position/orientation as its
	// own baseline rather than fighting the manual positioning or snapping
	// from some stale default. See render tick below: controls.update() is
	// only ever called once `controls` exists.
	$effect(() => {
		const p = revealProgress;
		if (!camera) return;
		if (p < 1) {
			applyCameraForProgress(p);
		} else if (!controls) {
			applyCameraForProgress(1);
			controls = new OrbitControls(camera, renderer.domElement);
			controls.enablePan = false;
			// Mouse-wheel zoom fights normal page scroll whenever the cursor
			// happens to be over the canvas — not worth it here (rotate-drag
			// alone already shows the shape is 3D), and "the page stops
			// scrolling and starts zooming" mid-scroll is a bad surprise.
			controls.enableZoom = false;
			controls.enableDamping = true;
			controls.target.set(0, 0, 0);
		}
	});

	onMount(() => {
		scene = new THREE.Scene();
		camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
		camera.position.copy(CAMERA_START);

		renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
		container.appendChild(renderer.domElement);

		scene.add(new THREE.AmbientLight(0xffffff, 0.5));
		const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
		dirLight.position.set(3, 4, 5);
		scene.add(dirLight);

		// LatheGeometry revolves its profile around the local Y axis. Rather
		// than rethinking every mesh/ring coordinate to lie flat some other
		// way, everything is built exactly as before (profile z -> Vector2's
		// y component, rings at position.y) inside this Group, and the Group
		// itself is rotated 90° about Z — turning "vertical Y-axis" into
		// "horizontal world-X-axis" as a single, isolated transform.
		group = new THREE.Group();
		group.rotation.z = Math.PI / 2;
		scene.add(group);

		rebuildRings();
		rebuildMesh(profile, revealProgress * Math.PI * 2);
		applyCameraForProgress(revealProgress);

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
			if (controls) controls.update();
			renderer.render(scene, camera);
			animFrame = requestAnimationFrame(tick);
		}
		tick();

		return () => {
			cancelAnimationFrame(animFrame);
			resizeObserver.disconnect();
			if (controls) controls.dispose();
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
