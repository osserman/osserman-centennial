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
	import { palette } from '$lib/palette.js';
	import { R, L, surfaceArea } from '$lib/catenoidProfile.js';

	let { profile, revealed = true, onAreaChange, onRevealComplete } = $props();

	const REVOLUTION_SEGMENTS = 48;
	const REVEAL_DURATION_MS = 1200;

	function buildLathe(points, phiLength) {
		const vec2s = points.map((p) => new THREE.Vector2(p.r, p.z));
		return new THREE.LatheGeometry(vec2s, REVOLUTION_SEGMENTS, 0, phiLength);
	}

	let container;
	let renderer, scene, group, camera, controls, mesh, resizeObserver, animFrame;
	let revealTweenFrame = null;
	// Seeded from the `revealed` prop inside onMount below (a closure, not
	// a top-level read) — deliberately a one-time snapshot, not tracked
	// reactively afterward, so 0 here is just a neutral placeholder.
	let currentPhiLength = $state(0);

	function rebuildMesh(points, phiLength) {
		const geometry = buildLathe(points, phiLength);
		if (mesh) {
			group.remove(mesh);
			mesh.geometry.dispose();
		}
		mesh = new THREE.Mesh(
			geometry,
			new THREE.MeshStandardMaterial({
				color: palette.light.blue,
				side: THREE.DoubleSide,
				metalness: 0.1,
				roughness: 0.6
			})
		);
		group.add(mesh);
		// untrack: onAreaChange runs synchronously inside this function, which
		// itself runs inside the $effect below — without untrack, the parent's
		// resulting state writes (e.g. +page.svelte's cinchRange, updated from
		// this callback) get attributed back into *this* effect's own reactive
		// context and re-invalidate it, causing an infinite update loop
		// (confirmed via effect_update_depth_exceeded during development —
		// disabling just the parent's cinchRange write made the loop stop,
		// isolating it to this exact callback-during-effect pattern). untrack
		// severs that attribution, same fix already used in CitationGraph.svelte
		// for the analogous "effect's call chain synchronously touches
		// something reactive it shouldn't be attributed to" problem.
		untrack(() => onAreaChange?.(surfaceArea(points)));
	}

	// `profile` must be read unconditionally here, not inside the `if` — on
	// this effect's first run (before onMount has set `scene`), `scene` is
	// falsy, so a guarded `if (scene) rebuildMesh(profile)` would never
	// reach the `profile` read on that run at all. Svelte's effects
	// re-derive their dependency set fresh from whatever was actually read
	// on each run, so skipping that read means the effect registers no
	// dependency on `profile` and never fires again on later changes.
	$effect(() => {
		const points = profile;
		if (scene && !revealTweenFrame) rebuildMesh(points, currentPhiLength);
	});

	// Sweeps phiLength from 0 to 2*pi over REVEAL_DURATION_MS — the "pull
	// the line around the circumference" reveal. Runs its own rAF loop
	// (separate from the render tick) so it can rebuild geometry only on
	// the frames it actually changes phiLength, and reports completion via
	// onRevealComplete so the page can enable its Continue button.
	function playReveal() {
		const start = performance.now();
		function step(now) {
			const t = Math.min(1, (now - start) / REVEAL_DURATION_MS);
			currentPhiLength = t * Math.PI * 2;
			rebuildMesh(profile, currentPhiLength);
			if (t < 1) {
				revealTweenFrame = requestAnimationFrame(step);
			} else {
				revealTweenFrame = null;
				onRevealComplete?.();
			}
		}
		revealTweenFrame = requestAnimationFrame(step);
	}

	// Same deliberate one-time-snapshot deal as currentPhiLength above —
	// seeded inside onMount, not read here at the top level.
	let hasRevealed = $state(false);
	$effect(() => {
		if (revealed && !hasRevealed && scene) {
			hasRevealed = true;
			playReveal();
		}
	});

	onMount(() => {
		currentPhiLength = revealed ? Math.PI * 2 : 0;
		hasRevealed = revealed;

		scene = new THREE.Scene();
		camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
		camera.position.set(2.4, 1.4, 3.0);

		renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
		container.appendChild(renderer.domElement);

		controls = new OrbitControls(camera, renderer.domElement);
		controls.enablePan = false;
		controls.enableDamping = true;
		controls.minDistance = 2;
		controls.maxDistance = 8;

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

		const ringMaterial = new THREE.MeshStandardMaterial({ color: palette.light.textPrimary ?? 0x0b0b0b });
		for (const z of [-L, L]) {
			const ring = new THREE.Mesh(new THREE.TorusGeometry(R, 0.015, 12, 64), ringMaterial);
			ring.rotation.x = Math.PI / 2;
			ring.position.y = z;
			group.add(ring);
		}

		rebuildMesh(profile, currentPhiLength);
		if (revealed) onRevealComplete?.();

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
			controls.update();
			renderer.render(scene, camera);
			animFrame = requestAnimationFrame(tick);
		}
		tick();

		return () => {
			cancelAnimationFrame(animFrame);
			if (revealTweenFrame) cancelAnimationFrame(revealTweenFrame);
			resizeObserver.disconnect();
			controls.dispose();
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
