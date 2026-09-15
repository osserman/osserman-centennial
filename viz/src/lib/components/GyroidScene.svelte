<script>
	// The 'gyroid-growth' slide's visual: a single unit cell of Alan Schoen's
	// gyroid, then more cells filling in around it in all three directions as
	// the reader scrolls -- a lattice literally growing, matching the slide's
	// own "the catalogue kept growing" framing. User-driven rotation
	// (OrbitControls), same reasoning as MinimalSurfaceExplorer -- once
	// something is on screen to look at, the reader should be free to turn
	// it, not have the camera fight them.
	//
	// The gyroid has no closed-form (u,v) parametrization the way the
	// catenoid/helicoid/Enneper/Scherk families in MinimalSurfaceExplorer do
	// -- it's defined implicitly, as the zero set of
	//   sin(x)cos(y) + sin(y)cos(z) + sin(z)cos(x) = 0
	// so it has to be polygonized (marching cubes) rather than swept from a
	// formula. Rather than hand-writing that table-driven algorithm (256
	// cube-configuration cases, easy to get subtly wrong with no way to
	// visually check it here), this uses three.js's own shipped
	// implementation (three/addons/objects/MarchingCubes.js) -- normally
	// driven by its `addBall` metaball API, but it exposes the raw scalar
	// `field` array directly, so it works just as well fed an arbitrary
	// implicit function.
	//
	// One cell's geometry is built ONCE (the field is periodic, so every
	// cell is identical up to translation) and reused via THREE.InstancedMesh
	// -- growth is just raising `instancedMesh.count`, which draws instances
	// 0..count-1 of a pre-ordered offset list, no per-cell recomputation.
	import { onMount } from 'svelte';
	import * as THREE from 'three';
	import { MarchingCubes } from 'three/addons/objects/MarchingCubes.js';
	import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
	import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
	import { activePalette } from '$lib/palette.js';

	// 0..1, scroll-driven -- how much of the lattice has grown in. 1 shows
	// the full MAX_SHELL cube of cells.
	let { progress = 0 } = $props();

	// Field-sampling resolution per axis for the one cell that gets
	// polygonized. High enough for a clean surface, cheap enough that the
	// one-time marching-cubes pass (CPU, at mount) is imperceptible --
	// ~28,000 field evaluations plus a polygonize loop, both well under
	// what a single animation frame budgets for.
	const FIELD_RESOLUTION = 28;
	// Generous headroom over a typical single-cell gyroid's actual triangle
	// count (commonly a few thousand at this resolution) -- MarchingCubes
	// warns to the console and silently truncates the geometry if the real
	// count exceeds this, rather than erroring, so err high.
	const MAX_POLY_COUNT = 60000;
	// How many "shells" out from the center cell the lattice can grow --
	// MAX_SHELL 2 is a 5x5x5 cube (125 cells). Each shell is the previous
	// cube plus the layer of cells at Chebyshev distance = shell index, so
	// growth reads as the lattice thickening outward on all three axes at
	// once, not marching down one axis at a time.
	const MAX_SHELL = 2;
	// MarchingCubes.update() only polygonizes cubes whose corner indices fall
	// in [1, size-2] -- it needs a neighbour on every side to
	// finite-difference a normal, so the outermost layer of samples never
	// becomes geometry. That's FIELD_RESOLUTION - 3 grid steps of real
	// output, not the full array.
	//
	// So ONE PERIOD of the field has to be mapped onto exactly that span. An
	// earlier version mapped a period across the whole [0, size-1] array
	// instead, which left each cell holding only (size-3)/size (~89%) of a
	// period; spacing the instances so their edges touched then squeezed out
	// the missing slab, and neighbours met at cross-sections that aren't
	// actually adjacent on the surface -- they touched, but didn't line up.
	//
	// With the mapping below, the polygonized span IS one period, so the
	// shared face between neighbours carries identical field values (checked
	// offline: the two wrap faces agree to ~6e-16) and marching cubes
	// therefore derives identical edge intersections and identical normals on
	// both sides of it. The join is seamless by construction rather than by
	// tuning, and CELL_SIZE is derived, not hand-fitted.
	const PERIOD_STEPS = FIELD_RESOLUTION - 3;
	const PERIOD_STEP = (2 * Math.PI) / PERIOD_STEPS;
	const CELL_SIZE = (2 * PERIOD_STEPS) / FIELD_RESOLUTION;
	// The polygonized span sits one half-step off center in local space
	// (corners 1..size-2 straddle the array's midpoint unevenly), so the
	// geometry gets shifted by this much to put the lattice's true center on
	// the origin the camera targets.
	const CELL_CENTER_OFFSET = 1 / FIELD_RESOLUTION;
	// Camera's vertical FOV (degrees) -- kept as a named constant since the
	// distance-fit math below needs the exact same value the camera itself
	// is constructed with (see onMount).
	const CAMERA_FOV_DEG = 45;

	function buildGyroidCellGeometry() {
		const mc = new MarchingCubes(FIELD_RESOLUTION, new THREE.MeshBasicMaterial(), false, false, MAX_POLY_COUNT);
		mc.isolation = 0; // the field's own zero set, not the metaball-sum default
		const size = mc.size;
		// Corner index 1 is the period's origin and corner size-2 is exactly
		// one period along it (see PERIOD_STEP). Indices 0 and size-1 fall
		// outside the polygonized span, but still get sampled -- marching
		// cubes reads them to finite-difference normals at the boundary
		// corners, and because the function is analytic and periodic, the
		// values there are exactly the periodic images of the far side, which
		// is what makes normals match across the join too.
		for (let k = 0; k < size; k++) {
			const z = (k - 1) * PERIOD_STEP;
			for (let j = 0; j < size; j++) {
				const y = (j - 1) * PERIOD_STEP;
				for (let i = 0; i < size; i++) {
					const x = (i - 1) * PERIOD_STEP;
					const value = Math.sin(x) * Math.cos(y) + Math.sin(y) * Math.cos(z) + Math.sin(z) * Math.cos(x);
					mc.setCell(i, j, k, value);
				}
			}
		}
		mc.update();
		if (mc.count === 0) return null; // isosurface came out empty -- bail rather than render nothing silently wrong

		// Extract a right-sized, static BufferGeometry -- mc.positionArray is
		// padded out to MAX_POLY_COUNT and marked DynamicDrawUsage for a
		// metaball's per-frame rebuilds, neither of which this one-shot,
		// instanced use needs.
		const vertexFloats = mc.count * 3;
		const geometry = new THREE.BufferGeometry();
		geometry.setAttribute('position', new THREE.BufferAttribute(mc.positionArray.slice(0, vertexFloats), 3));
		geometry.setAttribute('normal', new THREE.BufferAttribute(mc.normalArray.slice(0, vertexFloats), 3));
		// Uniform shift, so it moves the whole lattice onto the origin without
		// touching the spacing between cells (see CELL_CENTER_OFFSET).
		geometry.translate(CELL_CENTER_OFFSET, CELL_CENTER_OFFSET, CELL_CENTER_OFFSET);
		geometry.computeBoundingSphere();
		return geometry;
	}

	// Every cell offset out to MAX_SHELL, ordered so drawing instances
	// 0..N-1 (via InstancedMesh.count) always reveals a solid, roughly
	// spherical blob growing outward -- shell first (Chebyshev distance,
	// so a whole outer layer only starts once the previous one is
	// complete), then by actual distance within a shell for a radial
	// rather than axis-by-axis fill.
	function buildCellOffsets() {
		const offsets = [];
		for (let dz = -MAX_SHELL; dz <= MAX_SHELL; dz++) {
			for (let dy = -MAX_SHELL; dy <= MAX_SHELL; dy++) {
				for (let dx = -MAX_SHELL; dx <= MAX_SHELL; dx++) {
					offsets.push([dx, dy, dz]);
				}
			}
		}
		offsets.sort((a, b) => {
			const shellA = Math.max(Math.abs(a[0]), Math.abs(a[1]), Math.abs(a[2]));
			const shellB = Math.max(Math.abs(b[0]), Math.abs(b[1]), Math.abs(b[2]));
			if (shellA !== shellB) return shellA - shellB;
			const distA = a[0] * a[0] + a[1] * a[1] + a[2] * a[2];
			const distB = b[0] * b[0] + b[1] * b[1] + b[2] * b[2];
			return distA - distB;
		});
		return offsets;
	}

	const cellOffsets = buildCellOffsets();
	const totalCells = cellOffsets.length;

	function shellRadiusOf(cellCount) {
		const [dx, dy, dz] = cellOffsets[Math.min(cellCount, totalCells) - 1];
		return Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz));
	}

	// Distance a camera needs from a cube of the given half-width to fit it
	// in frame (a proper trig fit against this scene's own vertical FOV),
	// times a margin so the lattice sits comfortably inside the frame rather
	// than filling it edge-to-edge, and never closer than MIN_CAMERA_DISTANCE
	// -- without that floor, the very first frame (shellRadius 0, just the
	// center cell) fit so tight the single cell filled the whole screen,
	// which is exactly what read as too zoomed-in to make sense of.
	const CAMERA_MARGIN = 1.8;
	const MIN_CAMERA_DISTANCE = 6.5;
	// Per-frame ease toward targetDistance (see tick()) -- how quickly the
	// camera catches up to each new shell's fit distance, not how fast the
	// shells themselves reveal (that's GROWTH_HOLD_FRAC/CELL_FADE_SPAN).
	const DISTANCE_EASE = 0.035;
	function fitDistanceForShell(shellRadius) {
		const halfWidth = (shellRadius + 0.5) * CELL_SIZE;
		const fit = halfWidth / Math.tan((CAMERA_FOV_DEG / 2) * (Math.PI / 180));
		return Math.max(MIN_CAMERA_DISTANCE, fit * CAMERA_MARGIN);
	}
	// Scroll-scrubbed camera tour. Azimuth sweeps a bit over a full turn
	// while elevation rises and dips on a DIFFERENT period, so the path is a
	// varied wander over the lattice rather than a flat spin about one axis
	// -- the reader sees it from above, edge-on and from below as it grows,
	// which is what makes a triply periodic surface read as genuinely
	// three-dimensional. Both start off-axis: a cubic lattice viewed straight
	// down an axis looks flat, and views seams edge-on besides.
	const DEG = Math.PI / 180;
	const TOUR_START_AZIMUTH = 40 * DEG;
	const TOUR_TURNS = 1.25;
	const TOUR_ELEV_BASE = 26 * DEG;
	const TOUR_ELEV_AMPLITUDE = 28 * DEG;
	const TOUR_ELEV_CYCLES = 1.5;
	// Elevation stays well clear of straight-up/straight-down -- passing
	// through a pole flips the camera's up vector and OrbitControls' own
	// spherical bookkeeping along with it.
	function tourDirection(p, target = new THREE.Vector3()) {
		const azimuth = TOUR_START_AZIMUTH + p * TOUR_TURNS * Math.PI * 2;
		const elevation = TOUR_ELEV_BASE + TOUR_ELEV_AMPLITUDE * Math.sin(p * TOUR_ELEV_CYCLES * Math.PI * 2);
		const cosEl = Math.cos(elevation);
		return target.set(Math.sin(azimuth) * cosEl, Math.sin(elevation), Math.cos(azimuth) * cosEl);
	}
	// Where the tour starts -- taken from the tour itself rather than written
	// out separately, so the opening frame is already on the path and the
	// first scroll doesn't jump.
	const START_DIR = tourDirection(0);

	// How much of the total scroll a single cell takes to go from invisible
	// to fully opaque. A few cell-slots wide, so several neighbours are
	// always mid-fade at once and the lattice grows as a soft front rather
	// than a row of cells snapping on one at a time.
	const CELL_FADE_SPAN = 3 / totalCells;
	// Fraction of scroll spent alone with just the center cell, tour still
	// running, before a second cell appears -- long enough to actually look
	// at and rotate around the one unit before anything else starts
	// competing for attention or the camera begins pulling back.
	const GROWTH_HOLD_FRAC = 0.18;
	// Reveal points for cells 1+ are spread over [GROWTH_HOLD_FRAC, 1 -
	// CELL_FADE_SPAN] (remapped to growthP below) rather than starting at 0,
	// so the OUTERMOST cell still finishes fading exactly at progress 1. Cell
	// 0 is the one exception -- it fades in immediately (own span starting at
	// literal 0) and holds through GROWTH_HOLD_FRAC on its own, rather than
	// waiting its turn in that same remapped schedule.
	function cellFadeAt(index, p) {
		if (index === 0) return Math.max(0, Math.min(1, p / CELL_FADE_SPAN));
		const growthP = Math.max(0, (p - GROWTH_HOLD_FRAC) / (1 - GROWTH_HOLD_FRAC));
		const start = ((index - 1) / Math.max(1, totalCells - 2)) * (1 - CELL_FADE_SPAN);
		return Math.max(0, Math.min(1, (growthP - start) / CELL_FADE_SPAN));
	}

	let container;
	let renderer, scene, camera, controls, instancedMesh, resizeObserver, animFrame;
	let fadeAttribute;
	// Distance the camera eases toward each frame (see tick()) -- updated
	// whenever the visible cell count changes, so the view pulls back to
	// keep the growing lattice framed instead of the outer shells running
	// off-screen.
	let targetDistance = fitDistanceForShell(0);
	// Direction the camera eases toward, from the scripted tour -- abandoned
	// for good the moment the reader drags (see userHasRotated), so scroll
	// and hand never fight over the same control.
	let targetDirection = START_DIR.clone();
	let userHasRotated = false;

	function updateVisibleCells() {
		if (!instancedMesh || !fadeAttribute) return;
		// Draw only through the last cell that has actually started fading in;
		// everything past it would be fully transparent anyway, and keeping it
		// out of the transparent pass entirely is both cheaper and better
		// behaved for depth sorting.
		let visible = 1;
		for (let i = 0; i < totalCells; i++) {
			const fade = cellFadeAt(i, progress);
			fadeAttribute.array[i] = fade;
			if (fade > 0) visible = i + 1;
		}
		fadeAttribute.needsUpdate = true;
		instancedMesh.count = visible;
		targetDistance = fitDistanceForShell(shellRadiusOf(visible));
		if (!userHasRotated) tourDirection(progress, targetDirection);
	}

	$effect(() => {
		progress;
		updateVisibleCells();
	});

	onMount(() => {
		scene = new THREE.Scene();
		camera = new THREE.PerspectiveCamera(CAMERA_FOV_DEG, 1, 0.1, 200);
		camera.position.copy(START_DIR).multiplyScalar(MIN_CAMERA_DISTANCE);

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

		const cellGeometry = buildGyroidCellGeometry();
		const material = new THREE.MeshPhysicalMaterial({
			color: activePalette().blue,
			side: THREE.DoubleSide,
			metalness: 0,
			roughness: 0.35,
			transparent: true,
			opacity: 0.92,
			clearcoat: 0.3,
			clearcoatRoughness: 0.25
		});
		// Per-instance opacity. InstancedMesh has no built-in per-instance
		// alpha (setColorAt is RGB only), so the fade rides in as an instanced
		// attribute the material's own shader multiplies into its final alpha.
		// Both injection points were checked against this three.js build
		// (r185) rather than assumed -- a chunk name that doesn't match would
		// make .replace() a silent no-op and the fade would just never happen.
		material.onBeforeCompile = (shader) => {
			shader.vertexShader = `attribute float aCellFade;\nvarying float vCellFade;\n${shader.vertexShader}`.replace(
				'#include <begin_vertex>',
				'#include <begin_vertex>\n\tvCellFade = aCellFade;'
			);
			shader.fragmentShader = `varying float vCellFade;\n${shader.fragmentShader}`.replace(
				'#include <dithering_fragment>',
				'#include <dithering_fragment>\n\tgl_FragColor.a *= vCellFade;'
			);
		};

		if (cellGeometry) {
			fadeAttribute = new THREE.InstancedBufferAttribute(new Float32Array(totalCells), 1);
			fadeAttribute.setUsage(THREE.DynamicDrawUsage);
			cellGeometry.setAttribute('aCellFade', fadeAttribute);

			instancedMesh = new THREE.InstancedMesh(cellGeometry, material, totalCells);
			const matrix = new THREE.Matrix4();
			cellOffsets.forEach(([dx, dy, dz], i) => {
				matrix.makeTranslation(dx * CELL_SIZE, dy * CELL_SIZE, dz * CELL_SIZE);
				instancedMesh.setMatrixAt(i, matrix);
			});
			instancedMesh.instanceMatrix.needsUpdate = true;
			scene.add(instancedMesh);
			updateVisibleCells();
		}

		controls = new OrbitControls(camera, renderer.domElement);
		controls.enableDamping = true;
		// Same reasoning as MinimalSurfaceExplorer/CurvatureExplorerScene's own
		// drag scenes: this sits in the normal page scroll (growth is driven
		// by that same scroll via `progress`), so the wheel has to keep
		// scrolling the page rather than zooming the lattice. Distance is
		// still driven, just by scroll progress (targetDistance above)
		// instead of the reader's wheel.
		controls.enableZoom = false;
		controls.target.set(0, 0, 0);
		camera.lookAt(0, 0, 0);
		// The scripted tour drives the view until the reader takes hold of it,
		// then stops for good -- same "a deliberate choice outranks the scroll
		// from here on" rule the surface explorer's family tabs follow. Fires
		// only on real pointer interaction, so scrolling past never trips it.
		controls.addEventListener('start', () => {
			userHasRotated = true;
		});

		resizeObserver = new ResizeObserver((entries) => {
			const { width, height } = entries[0].contentRect;
			if (width === 0 || height === 0) return;
			renderer.setSize(width, height);
			renderer.setPixelRatio(window.devicePixelRatio || 1);
			camera.aspect = width / height;
			camera.updateProjectionMatrix();
		});
		resizeObserver.observe(container);

		const offset = new THREE.Vector3();
		function tick() {
			controls.update();
			// Applied AFTER controls.update() so the scripted tour wins the
			// frame while it's still in charge; once userHasRotated flips, only
			// the distance is eased and direction is left entirely to
			// OrbitControls. Easing (rather than snapping to the scripted
			// values) keeps this smooth between discrete scroll events while
			// still being scroll-driven overall -- it advances when the reader
			// scrolls and settles when they stop.
			offset.copy(camera.position).sub(controls.target);
			const distance = offset.length();
			if (distance > 1e-4) {
				offset.normalize();
				if (!userHasRotated) offset.lerp(targetDirection, 0.12).normalize();
				// Was 0.08 -- read as a harsh snap toward each new shell's
				// distance rather than a gradual pull-back; slowed down so the
				// zoom trails the growth instead of leaping ahead of it.
				const nextDistance = distance + (targetDistance - distance) * DISTANCE_EASE;
				camera.position.copy(controls.target).addScaledVector(offset, nextDistance);
			}
			renderer.render(scene, camera);
			animFrame = requestAnimationFrame(tick);
		}
		tick();

		return () => {
			cancelAnimationFrame(animFrame);
			resizeObserver.disconnect();
			controls.dispose();
			envTexture.dispose();
			renderer.dispose();
			cellGeometry?.dispose();
			material.dispose();
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
		width: 100%;
		height: 100%;
	}
</style>
