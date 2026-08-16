<script>
	// Slide 3's scene: the finished catenoid from Slide 2 gives way to the
	// catenary curve that generates it, staged by a single continuous
	// `progress` prop (0->1, scroll-scrubbed by the page — see
	// updateCatenaryProgress in +page.svelte). Same imperative-scene pattern
	// as CatenoidScene.svelte (own onMount, own render loop), deliberately
	// simpler: no OrbitControls (this is a passive scroll-driven animation,
	// not a drag sandbox) and no area callback.
	//
	// Three straightforward stages, in order — no geometry morphing (an
	// earlier version progressively collapsed the Lathe surface's phiLength
	// and shrank the rings frame by frame; this replaces that with plain
	// opacity cross-fades, which is simpler to follow both in code and on
	// screen):
	//   0.00-0.25  camera eases to a face-on view; catenoid + rings unchanged
	//   0.25-0.55  the catenary line and axis fade in *while* the catenoid
	//              surface and rings fade out, at the same time — not
	//              sequentially. An earlier version faded the line/axis in
	//              first, fully, while the catenoid was still fully opaque —
	//              which meant the axis was fully visible but obscured by
	//              the still-solid catenoid for a while. Crossfading them
	//              together means the axis is only ever competing with a
	//              catenoid that's *also* partway transparent.
	//   0.55-1.00  the curve extends past z=+-L using the real catenary
	//              formula r(z) = c*cosh(z/c) (not a guessed taper), while
	//              the camera pans down (position and look-at target shift
	//              together, so it's a pure translation — no rotation, no
	//              skew) to keep the growing curve centered in frame
	import { onMount } from 'svelte';
	import * as THREE from 'three';
	import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
	import { activePalette } from '$lib/palette.js';
	import { catenaryProfile, catenaryParam } from '$lib/catenoidProfile.js';

	let { R, L, progress = 0, startCameraPos = null } = $props();

	const REVOLUTION_SEGMENTS = 48;
	const EXTEND_LENGTH_FRAC = 3.0; // extend the curve by this many L's past each ring
	const AXIS_HALF_LENGTH_FRAC = 4.5; // axis reaches this many L's past center, each side

	const CAMERA_END_T = 0.25;
	const FADE_START = 0.25;
	const FADE_END = 0.55;
	const EXTEND_START = 0.55;
	const EXTEND_END = 1.0;

	// Default start position — continuity with CatenoidScene's own
	// end-of-reveal camera (see its CAMERA_END). Overridden per-mount by
	// `startCameraPos` when the reader actually rotated Slide 2's camera
	// (see onMount below) — either way, this scene eases from wherever it
	// starts to a perfectly centered face-on view. A camera looking mostly
	// along world Z already reads as "face-on" for the catenary (which lies
	// flat in the world X-Y plane — see the group-orientation comment in
	// onMount below), so reaching it is a modest adjustment, not a big
	// rotation, even from a rotated starting point.
	const CAMERA_START_DEFAULT = new THREE.Vector3(0, 0.25, 6.9);
	const CAMERA_FACEON = new THREE.Vector3(0, 0, 7.5);
	let cameraStart = CAMERA_START_DEFAULT;
	// How far the camera (and its look-at target, together — see updateScene)
	// pans upward in world space while the curve extends, so the growing
	// curve doesn't end up crowded against the top of the frame.
	const PAN_AMOUNT = (ringL) => ringL * 3;

	function remap(t, lo, hi) {
		return Math.max(0, Math.min(1, (t - lo) / (hi - lo)));
	}

	// Extends the base catenary profile past z=+-L using the same formula
	// (r = c*cosh(z/c)) that generated it — an actual continuation of the
	// mathematical curve, not a taper made up for the animation. Grows
	// outward over EXTEND_START..EXTEND_END rather than appearing all at once.
	function computeProfilePoints(prog, base, c) {
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

	function buildLathe(points) {
		const vec2s = points.map((p) => new THREE.Vector2(Math.max(p.r, 1e-4), p.z));
		return new THREE.LatheGeometry(vec2s, REVOLUTION_SEGMENTS, 0, Math.PI * 2);
	}

	// Local (x,y,z) = (r, z_profile, 0) is exactly where a Lathe vertex at
	// phi=0 already sits (see buildLathe) — the curve line is built in that
	// same local space so it lines up with the surface it's fading in over.
	function buildCurveLine(points) {
		const vecs = points.map((p) => new THREE.Vector3(p.r, p.z, 0));
		const curve = new THREE.CatmullRomCurve3(vecs);
		return new THREE.TubeGeometry(curve, Math.max(16, vecs.length * 2), 0.018, 8, false);
	}

	let container;
	let renderer, scene, group, camera, resizeObserver, animFrame;
	let curveLine;
	let meshMaterial, lineMaterial;
	let baseProfile, catenaryC;

	function updateScene(prog) {
		// --- camera eases to face-on (0 -> CAMERA_END_T) ---
		const camT = remap(prog, 0, CAMERA_END_T);
		const basePos = new THREE.Vector3().lerpVectors(cameraStart, CAMERA_FACEON, camT);

		// --- curve extends (EXTEND_START -> EXTEND_END), camera pans to follow ---
		const panT = remap(prog, EXTEND_START, EXTEND_END);
		const panY = PAN_AMOUNT(L) * panT;
		camera.position.set(basePos.x, basePos.y + panY, basePos.z);
		camera.lookAt(0, panY, 0);

		if (curveLine) {
			group.remove(curveLine);
			curveLine.geometry.dispose();
		}
		const points = computeProfilePoints(prog, baseProfile, catenaryC);
		curveLine = new THREE.Mesh(buildCurveLine(points), lineMaterial);
		group.add(curveLine);

		// --- catenary line + axis fade in, catenoid + rings fade out, together ---
		const fadeT = remap(prog, FADE_START, FADE_END);
		lineMaterial.opacity = fadeT;
		lineMaterial.visible = fadeT > 0;
		axisMaterial.opacity = fadeT;
		axis.visible = fadeT > 0;

		const catenoidOpacity = 0.82 * (1 - fadeT);
		meshMaterial.opacity = catenoidOpacity;
		meshMaterial.visible = fadeT < 1;
		ringMaterial.opacity = 1 - fadeT;
		for (const ring of ringMeshes) ring.visible = fadeT < 1;
	}

	let mesh, axis, axisMaterial, ringMaterial;
	let ringMeshes = [];

	$effect(() => {
		const p = progress;
		if (scene) updateScene(p);
	});

	onMount(() => {
		// Snapshot once, at mount — not tracked reactively afterward. This
		// scene is fully unmounted whenever the reader scrolls away from
		// Slide 3 (see the {#if} in +page.svelte), so onMount already fires
		// fresh every time they scroll back into it, naturally picking up
		// wherever CatenoidScene's camera was left most recently. Reading it
		// reactively instead would risk this scene's own animated camera
		// position fighting a still-updating prop if the two scenes were
		// ever mounted at overlapping times.
		if (startCameraPos) {
			cameraStart = new THREE.Vector3(startCameraPos.x, startCameraPos.y, startCameraPos.z);
		}

		scene = new THREE.Scene();
		camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
		camera.position.copy(cameraStart);

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
		// revolution axis flat along world X.
		group = new THREE.Group();
		group.rotation.z = Math.PI / 2;
		scene.add(group);

		baseProfile = catenaryProfile(R, L);
		catenaryC = catenaryParam(R, L);

		// The catenoid + rings are static geometry now (no more per-frame
		// unrolling/collapsing) — built once here, animated only via opacity
		// in updateScene. depthWrite:false on both: a `transparent:true`
		// material still writes to the depth buffer as if fully opaque by
		// default, which occludes anything behind it (the axis, sitting
		// right through the tube's hollow center) via the depth test
		// regardless of how transparent it currently looks — the axis was
		// getting clipped by the catenoid's silhouette even mid-fade,
		// nowhere near actually opaque. Turning depthWrite off makes it
		// blend by opacity alone, like it visually should.
		meshMaterial = new THREE.MeshPhysicalMaterial({
			color: activePalette().blue,
			side: THREE.DoubleSide,
			metalness: 0,
			roughness: 0.25,
			transparent: true,
			opacity: 0.82,
			depthWrite: false,
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
			opacity: 1,
			depthWrite: false
		});
		for (const z of [-L, L]) {
			const ring = new THREE.Mesh(new THREE.TorusGeometry(R, 0.015, 12, 64), ringMaterial);
			ring.rotation.x = Math.PI / 2;
			ring.position.y = z;
			group.add(ring);
			ringMeshes.push(ring);
		}

		lineMaterial = new THREE.MeshStandardMaterial({
			color: activePalette().blue,
			transparent: true,
			opacity: 0,
			depthWrite: false,
			roughness: 0.4,
			metalness: 0.1
		});

		// Fixed full length from the start (not grown via scale like an
		// earlier version) — it only fades in, alongside the curve line.
		axisMaterial = new THREE.MeshStandardMaterial({
			color: activePalette().muted ?? 0x898781,
			transparent: true,
			opacity: 0,
			depthWrite: false
		});
		const axisLength = AXIS_HALF_LENGTH_FRAC * L * 2;
		axis = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, axisLength, 8), axisMaterial);
		axis.visible = false;
		group.add(axis);

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
