<script>
	// Interaction 1's core 3D mechanic: two coaxial rings connected by a
	// surface of revolution the reader can "cinch" inward via a slider,
	// with a live surface-area readout. Owns its own WebGL scene
	// imperatively in onMount, same pattern CitationGraph.svelte uses for
	// its Canvas 2D scene — one component, one render target, reactive
	// props drive updates rather than a declarative scene-graph layer.
	import { onMount } from 'svelte';
	import * as THREE from 'three';
	import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
	import { palette } from '$lib/palette.js';

	let { t = 0, onAreaChange } = $props();

	// Ring radius R and half-separation L. L/R ≈ 0.58 is safely under the
	// Goldschmidt limit (L/R ≲ 0.6627, beyond which no smooth catenoid can
	// connect the two rings — it wants to pinch into two flat disks
	// instead) — locked in now so a later Euler solve at these exact
	// boundary values always has a valid answer, even though that solve
	// isn't built yet. Chosen close to (but with real margin under) that
	// limit because the V-profile's best-case area reduction vs. the
	// cylinder grows the closer L/R gets to it — a shallower ratio makes
	// the "aha, less area" dip barely perceptible.
	const R = 1.2;
	const L = 0.7;
	const PROFILE_SEGMENTS = 40;
	const REVOLUTION_SEGMENTS = 48;

	// Piecewise-linear "cinch" profile: constant radius R at both rings,
	// tapering to a point at the midpoint as t goes 0 -> 1. A fully closed
	// waist (midR=0, two cones meeting at a point on the axis) is a normal,
	// non-degenerate case for LatheGeometry — same as the tip of a cone —
	// so no special-casing needed.
	//
	// Area is NOT monotonically decreasing across the full [0,1] range: for
	// this V/double-cone profile family it dips a few % below the cylinder
	// only for a shallow cinch, then rises again as the waist narrows
	// further, exceeding the cylinder well before full closure (a crude
	// profile's sharp corner costs area the true minimal surface doesn't
	// pay — the smooth catenary, in the deferred phase, doesn't have this
	// problem). That's expected, not a bug — it's the same "obvious guess
	// overshoots" intuition the spec is going for, just visible within a
	// single slider drag rather than only across interactions.
	function cinchProfile(cinch) {
		const midR = R * (1 - cinch);
		const points = [];
		for (let i = 0; i <= PROFILE_SEGMENTS; i++) {
			const z = -L + (2 * L * i) / PROFILE_SEGMENTS;
			const r = z <= 0 ? R + ((midR - R) * (z + L)) / L : midR + ((R - midR) * z) / L;
			points.push({ r, z });
		}
		return points;
	}

	// Generic surface-of-revolution area integrator — Simpson's rule over
	// Area = 2*pi * integral( r(z) * sqrt(1 + (dr/dz)^2) dz ). Works
	// unchanged for any profile (cylinder, cinch, and later the catenary),
	// so there's one implementation instead of a per-shape formula.
	// Sanity-checked at t=0 against the closed-form cylinder area 2*pi*R*2L.
	function surfaceArea(points) {
		const n = points.length - 1;
		const h = (points[n].z - points[0].z) / n;
		function integrand(i) {
			const dzForward = i < n ? points[i + 1].z - points[i].z : points[i].z - points[i - 1].z;
			const drForward = i < n ? points[i + 1].r - points[i].r : points[i].r - points[i - 1].r;
			const slope = dzForward !== 0 ? drForward / dzForward : 0;
			return points[i].r * Math.sqrt(1 + slope * slope);
		}
		let sum = integrand(0) + integrand(n);
		for (let i = 1; i < n; i++) sum += (i % 2 === 0 ? 2 : 4) * integrand(i);
		return 2 * Math.PI * ((h / 3) * sum);
	}

	function buildLathe(points) {
		const vec2s = points.map((p) => new THREE.Vector2(p.r, p.z));
		return new THREE.LatheGeometry(vec2s, REVOLUTION_SEGMENTS);
	}

	let container;
	let renderer, scene, camera, controls, mesh, resizeObserver, animFrame;

	function rebuildMesh(cinch) {
		const points = cinchProfile(cinch);
		const geometry = buildLathe(points);
		if (mesh) {
			scene.remove(mesh);
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
		scene.add(mesh);
		onAreaChange?.(surfaceArea(points));
	}

	// `t` must be read unconditionally here, not inside the `if` — on this
	// effect's first run (before onMount has set `scene`), `scene` is
	// falsy, so a guarded `if (scene) rebuildMesh(t)` would never reach the
	// `t` read on that run at all. Svelte's effects re-derive their
	// dependency set fresh from whatever was actually read on each run, so
	// skipping the `t` read here means the effect registers no dependency
	// on `t` and never fires again on later `t` changes — the slider would
	// silently stop updating anything past the first render.
	$effect(() => {
		const cinch = t;
		if (scene) rebuildMesh(cinch);
	});

	onMount(() => {
		scene = new THREE.Scene();
		camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
		camera.position.set(2.6, 1.8, 3.2);

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

		// Ring boundaries — thin tori at each fixed axial position. Note:
		// LatheGeometry revolves its profile around the Y axis, not Z, so
		// "axial position" here is world-space Y, matching how the surface
		// mesh itself is built below (profile z -> Vector2's y component).
		// Placing these via position.z instead of position.y was the earlier
		// bug — the rings rendered at the right *rotation* but the wrong
		// axis entirely, floating near the origin instead of at the rims.
		const ringMaterial = new THREE.MeshStandardMaterial({ color: palette.light.textPrimary ?? 0x0b0b0b });
		for (const z of [-L, L]) {
			const ring = new THREE.Mesh(new THREE.TorusGeometry(R, 0.015, 12, 64), ringMaterial);
			ring.rotation.x = Math.PI / 2;
			ring.position.y = z;
			scene.add(ring);
		}

		rebuildMesh(t);

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
