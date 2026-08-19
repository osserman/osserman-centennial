<script>
	// The "one equation becomes many surfaces" interactive: a family
	// dropdown + a single parameter slider, per the agreed spec. User-driven
	// (OrbitControls, no scroll-scrubbed camera), same reasoning CatenoidScene
	// uses once its own reveal completes — the reader should be free to
	// inspect the shape, not have the camera fight them.
	//
	// Both families below are *closed-form* parametrizations (no numerical
	// Weierstrass integration) — each was checked numerically before being
	// trusted here (finite-difference mean curvature at several (u,v,param)
	// samples, all landing at ~1e-8 to 1e-10 -- effectively zero, i.e. the
	// numerical noise floor, not a real residual). See git history / session
	// notes for the verification script; a from-scratch reader shouldn't
	// have to re-derive this, but shouldn't have to blindly trust it either
	// -- the "mathematical definition" toggle below shows the exact formula
	// actually being evaluated, not a simplified stand-in for it.
	//
	// A third family (Scherk, singly periodic) needs real numerical
	// Weierstrass path-integration and its own verification harness -- a
	// separate-scale piece of work, deliberately not attempted here. See
	// gallery_implementation_notes.md.
	import { onMount } from 'svelte';
	import * as THREE from 'three';
	import { ParametricGeometry } from 'three/addons/geometries/ParametricGeometry.js';
	import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
	import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
	import { activePalette } from '$lib/palette.js';

	const RESOLUTION = 80; // grid samples per axis -- smooth, still cheap enough to rebuild every slider tick

	function lerp(a, b, t) {
		return a + (b - a) * t;
	}

	// --- Catenoid <-> Helicoid: the associate family. Both endpoints and
	// several interior (u, v, theta) samples were checked numerically to
	// have mean curvature ~0 -- a real minimal-surface family, not a
	// cross-fade between two unrelated meshes (see file header). The
	// family's own formula "Z" (the screw/revolution axis) is mapped to
	// world Y below, matching this project's up-is-Y convention elsewhere. ---
	const CH_U_RANGE = [-Math.PI, Math.PI];
	const CH_V_RANGE = [-1.6, 1.6];
	// sliderT: 0 = catenoid (the shape already familiar from earlier in
	// this chapter), 1 = helicoid. Internally theta = (pi/2)(1 - sliderT),
	// since the underlying formula has theta=pi/2 at the catenoid end.
	function catenoidHelicoidPoint(sliderT, u01, v01, target) {
		const theta = (Math.PI / 2) * (1 - sliderT);
		const u = lerp(CH_U_RANGE[0], CH_U_RANGE[1], u01);
		const v = lerp(CH_V_RANGE[0], CH_V_RANGE[1], v01);
		const cu = Math.cos(theta);
		const su = Math.sin(theta);
		const x = cu * Math.sinh(v) * Math.sin(u) + su * Math.cosh(v) * Math.cos(u);
		const axis = u * cu + v * su;
		const z = -cu * Math.sinh(v) * Math.cos(u) + su * Math.cosh(v) * Math.sin(u);
		target.set(x, axis, z);
	}

	// --- Enneper surface: exact closed-form polynomial parametrization
	// (do Carmo and every other minimal-surfaces text carries this one) --
	// sampled over a disk of radius R rather than a square, so the slider
	// reads cleanly as "how much of the domain is shown." Changing R does
	// NOT generate a different minimal surface -- it's the same infinite
	// surface either way -- which is why the slider is labeled and framed
	// as revealing more of it, not as a shape family the way
	// catenoid<->helicoid is. Formula's own "z" (the saddle axis) is
	// likewise mapped to world Y. ---
	const ENNEPER_MIN_R = 0.5;
	// Enneper's own extent grows roughly cubically with R (bounding radius:
	// R=1.6 -> ~3, R=2.6 -> ~9, checked numerically), so "substantially
	// further" is paired with an auto-fitting camera below rather than a
	// fixed framing -- otherwise a bigger domain just means the new parts
	// drift off-screen instead of actually being visible.
	const ENNEPER_MAX_R = 2.6;
	function enneperPoint(R, u01, v01, target) {
		const phi = u01 * Math.PI * 2;
		const r = v01 * R;
		const eu = r * Math.cos(phi);
		const ev = r * Math.sin(phi);
		const x = eu - (eu * eu * eu) / 3 + eu * ev * ev;
		const axis = eu * eu - ev * ev;
		const z = ev - (ev * ev * ev) / 3 + ev * eu * eu;
		target.set(x, axis, z);
	}

	const FAMILIES = [
		{
			id: 'catenoid-helicoid',
			label: 'Catenoid ↔ Helicoid',
			paramLabel: 'Shape',
			minLabel: 'Catenoid',
			maxLabel: 'Helicoid',
			min: 0,
			max: 1,
			step: 0.002,
			default: 0,
			point: catenoidHelicoidPoint,
			definition:
				'X(u,v) = cosθ·sinh(v)·sin(u) + sinθ·cosh(v)·cos(u)\n' +
				'Y(u,v) = u·cosθ + v·sinθ\n' +
				'Z(u,v) = −cosθ·sinh(v)·cos(u) + sinθ·cosh(v)·sin(u)\n\n' +
				'θ = π/2: catenoid.  θ = 0: helicoid.\n' +
				'Every value in between is also an exact minimal surface —\n' +
				'the same Weierstrass data, rotated by a phase.'
		},
		{
			id: 'enneper',
			label: 'Enneper Surface',
			paramLabel: 'How much of the surface to show',
			minLabel: 'Less',
			maxLabel: 'More',
			min: ENNEPER_MIN_R,
			max: ENNEPER_MAX_R,
			step: 0.01,
			default: 1.0,
			point: enneperPoint,
			definition:
				'X(u,v) = u − u³/3 + uv²\n' +
				'Y(u,v) = u² − v²\n' +
				'Z(u,v) = v − v³/3 + vu²\n\n' +
				'Domain: u² + v² ≤ R²\n' +
				'R reveals more of the same infinite surface —\n' +
				'it does not change which surface this is.'
		}
	];

	let selectedFamilyId = $state(FAMILIES[0].id);
	let currentFamily = $derived(FAMILIES.find((f) => f.id === selectedFamilyId));
	let paramValue = $state(FAMILIES[0].default);
	let showDefinition = $state(false);

	// Reset to the new family's own default whenever the dropdown changes
	// (not e.g. clamping the old value into the new range) -- each
	// family's parameter means something different, so carrying a numeric
	// value across doesn't carry meaning across.
	let lastFamilyId = selectedFamilyId;
	$effect(() => {
		if (selectedFamilyId !== lastFamilyId) {
			lastFamilyId = selectedFamilyId;
			paramValue = currentFamily.default;
		}
	});

	let container;
	let renderer, scene, camera, controls, mesh, resizeObserver, animFrame;
	let isRotating = $state(false);

	// distance = fitRadius * FIT_MULTIPLIER approximates "just fits the
	// 45deg-FOV frame with a little margin" (1/sin(22.5deg) ~ 2.6, plus
	// margin). FIT_MIN_DISTANCE keeps small shapes (e.g. Enneper at its
	// smallest R) from zooming in uncomfortably close.
	const FIT_MULTIPLIER = 2.9;
	const FIT_MIN_DISTANCE = 3.2;

	function rebuildMesh() {
		const family = currentFamily;
		const param = paramValue;
		const geometry = new ParametricGeometry((u, v, target) => family.point(param, u, v, target), RESOLUTION, RESOLUTION);
		geometry.computeVertexNormals();
		if (mesh) {
			scene.remove(mesh);
			mesh.geometry.dispose();
		}
		mesh = new THREE.Mesh(geometry, mesh ? mesh.material : buildMaterial());
		scene.add(mesh);

		// Auto-fit camera distance to the mesh's own extent (direction
		// preserved, so the reader's current rotation isn't disturbed) --
		// without this, extending a family's range (e.g. Enneper's R) just
		// pushes the new, larger parts of the surface off-screen instead of
		// actually revealing them.
		if (camera) {
			geometry.computeBoundingSphere();
			const distance = Math.max(geometry.boundingSphere.radius * FIT_MULTIPLIER, FIT_MIN_DISTANCE);
			const dir = camera.position.lengthSq() > 1e-6 ? camera.position.clone().normalize() : new THREE.Vector3(0.6, 0.4, 0.7).normalize();
			camera.position.copy(dir.multiplyScalar(distance));
		}
	}

	function buildMaterial() {
		return new THREE.MeshPhysicalMaterial({
			color: activePalette().blue,
			side: THREE.DoubleSide,
			metalness: 0,
			roughness: 0.35,
			transparent: true,
			opacity: 0.92,
			clearcoat: 0.3,
			clearcoatRoughness: 0.25
		});
	}

	$effect(() => {
		const _f = selectedFamilyId;
		const _p = paramValue;
		if (scene) rebuildMesh();
	});

	onMount(() => {
		scene = new THREE.Scene();
		camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
		// Only the *direction* here matters (a three-quarter view) -- the
		// distance gets overwritten by rebuildMesh's auto-fit below on the
		// very first build, same as every rebuild after it.
		camera.position.set(4.6, 2.9, 5.4);

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

		rebuildMesh();

		controls = new OrbitControls(camera, renderer.domElement);
		controls.enableDamping = true;
		controls.target.set(0, 0, 0);
		controls.autoRotate = false; // toggled from the "Rotate" button below
		controls.autoRotateSpeed = 1.4; // gentle -- a slow, readable spin, not a spectacle
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
			controls.update();
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
		};
	});
</script>

<div class="scene-container" bind:this={container}></div>

<div class="controls-panel">
	<label class="control-row">
		<span class="control-label">Family</span>
		<select bind:value={selectedFamilyId}>
			{#each FAMILIES as f (f.id)}
				<option value={f.id}>{f.label}</option>
			{/each}
		</select>
	</label>

	<label class="control-row">
		<span class="control-label">{currentFamily.paramLabel}</span>
		<input type="range" min={currentFamily.min} max={currentFamily.max} step={currentFamily.step} bind:value={paramValue} />
	</label>
	<div class="control-endpoints">
		<span>{currentFamily.minLabel}</span>
		<span>{currentFamily.maxLabel}</span>
	</div>

	<button
		class="rotate-toggle"
		onclick={() => {
			isRotating = !isRotating;
			controls.autoRotate = isRotating;
		}}
	>
		{isRotating ? '⏸ Pause rotation' : '▶ Rotate'}
	</button>

	<button class="definition-toggle" onclick={() => (showDefinition = !showDefinition)}>
		{showDefinition ? 'Hide' : 'Show'} mathematical definition
	</button>
	{#if showDefinition}
		<pre class="definition-text">{currentFamily.definition}</pre>
	{/if}
</div>

<style>
	.scene-container {
		width: 100%;
		height: 100%;
	}
	.scene-container :global(canvas) {
		display: block;
	}
	.controls-panel {
		position: absolute;
		top: 1.5rem;
		left: 1.5rem;
		width: 15.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		padding: 1rem 1.1rem;
		border-radius: 12px;
		background: color-mix(in srgb, var(--surface-1) 88%, transparent);
		backdrop-filter: blur(6px);
		box-shadow: 0 6px 24px rgba(0, 0, 0, 0.12);
	}
	.control-row {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}
	.control-label {
		font-size: 0.82rem;
		font-weight: 600;
		color: var(--text-secondary);
	}
	select {
		font-size: 0.95rem;
		padding: 0.35rem 0.5rem;
		border-radius: 6px;
		border: 1px solid var(--surface-2);
		background: var(--surface-1);
		color: var(--text-primary);
	}
	input[type='range'] {
		width: 100%;
		accent-color: var(--accent);
	}
	.control-endpoints {
		display: flex;
		justify-content: space-between;
		margin-top: -0.4rem;
		font-size: 0.75rem;
		color: var(--text-muted);
	}
	.rotate-toggle,
	.definition-toggle {
		margin-top: 0.3rem;
		padding: 0.4rem 0.6rem;
		border-radius: 6px;
		border: 1px solid var(--surface-2);
		background: transparent;
		color: var(--text-secondary);
		font-size: 0.8rem;
		cursor: pointer;
		text-align: left;
	}
	.rotate-toggle:hover,
	.definition-toggle:hover {
		background: var(--surface-2);
	}
	.definition-text {
		margin: 0;
		padding: 0.6rem 0.7rem;
		border-radius: 6px;
		background: var(--surface-2);
		color: var(--text-secondary);
		font-family: ui-monospace, 'SF Mono', Menlo, monospace;
		font-size: 0.72rem;
		line-height: 1.5;
		white-space: pre-wrap;
	}
</style>
