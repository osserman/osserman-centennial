<script module>
	// Stage boundaries — exported so +page.svelte can pace scroll against the
	// same numbers this scene animates against (same convention as the other
	// scroll-scrubbed scenes in this project).
	export const CURVES_END = 0.1; // the two principal curves draw onto the globe
	export const ROTATE_END = 0.18; // marked point rotates to face the camera; legend arrives
	export const SHRINK_END = 0.26; // radius shrinks — same curves, steeper
	// No GROW_END/HANDOFF_END any more. Between SHRINK_END and PLANE_END the
	// scene runs one continuous curvature ramp, and the moment the sphere hands
	// over to the patch is derived from it (it falls where kappa reaches
	// 1/R_MAX, around progress 0.45) rather than being a stage of its own. It
	// used to be a stage, and that stage was 54vh of scrolling in which nothing
	// moved.
	export const PLANE_END = 0.52; // the surface reaches flat
	export const RING_END = 0.57; // a faint circle marks off the neighbourhood
	export const CLIP_END = 0.64; // everything outside that circle fades away
	export const PLANE_HOLD_END = 0.68; // a pause on the flat plane — the neutral hinge
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
	// The patch does not start life as a small disc. It starts as a CAP of the
	// very sphere it is replacing, drawn to 85° from the marked point, which
	// covers everything the camera can see of that sphere (the visible surface
	// reaches 81.5°) with margin. At the handoff the two meshes are therefore
	// the same surface, and the crossfade has nothing to give away.
	//
	// A patch big enough to run off-frame instead — the obvious alternative —
	// is not reachable here: the frame's top edge points 7.5° below horizontal,
	// and a sphere has to exceed R ≈ 317 before its surface stops drooping away
	// from that ray. Every surface in this scene shows an edge; the fix is to
	// make the edges coincide, not to push them off-screen.
	const CAP_PHI = (85 * Math.PI) / 180;
	const PATCH_R_LOCAL = 1.2; // the local neighbourhood, once it closes down
	// Lifts the curves clear of the surface so they read as lying on it rather
	// than z-fighting through it. Baked into the curve points (along the
	// surface normal) rather than applied as a flat mesh offset, which only
	// worked where the surface happened to be horizontal.
	const CURVE_EPS = 0.012;
	// Sized so the WHOLE ball still fits the frame once it has rotated into
	// the viewing position, and keeps fitting as it shrinks -- only once it
	// grows past roughly R 2.2 does it start running off frame, which is
	// exactly the beat where "the flatter the curves, the bigger the sphere"
	// is the thing being said.
	const R_OPEN = 1.6; // opening sphere radius
	const R_MIN = 0.95; // tightest sphere: steepest curves
	const R_MAX = 6.0; // flattest sphere, and where the quadratic handoff happens
	const K_SADDLE = 0.7; // final |curvature| in each direction on the saddle

	// Geodesic rings at FIXED distances along the surface from the marked
	// point. These are the answer to "is the sphere changing size, or is the
	// camera moving?" -- a question the scene could not settle before, because
	// the lat/long wireframe scaled with the sphere and so did everything else
	// in frame. When every feature changes together the image is self-similar,
	// which is exactly what a dolly looks like.
	//
	// These rings never change size on screen. The sphere passes through them:
	// the 2.4 ring sits 145° round a tight sphere and only 23° round a flat
	// one. No camera move can do that, so the size change becomes unambiguous.
	const GRID_RADII = [0.4, 0.8, 1.2, 1.6, 2.0, 2.4];
	const GRID_SEG = 96;
	const GRID_MAX_ANGLE = 2.6; // rad; past this a ring is collapsing on the antipode

	const CURVE_SEGMENTS = 96;
	const CURVE_TUBE_R = 0.022;
	const PATCH_RINGS = 48;
	const PATCH_SPOKES = 72;

	// north/south runs along X, east/west along Z (see the frame note above)
	const DIR_NS = new THREE.Vector3(1, 0, 0);
	const DIR_EW = new THREE.Vector3(0, 0, 1);

	// --- cameras ------------------------------------------------------------
	// Opening: the whole ball, looking between its centre and the marked point
	// on its equator (azimuth 35°, elevation 22°, distance 6).
	const CAM_GLOBE = {
		pos: new THREE.Vector3(2.191, 2.248, 4.557),
		look: new THREE.Vector3(-1, 0, 0)
	};
	// Local patch: a stable three-quarter view (azimuth 40°, elevation 30°),
	// inside the spec's suggested band and deliberately off both principal
	// directions and off the normal — from any of those the saddle reads as a
	// single curve rather than as two bends fighting each other.
	//
	// The POSITION is fixed from the end of the rotation onward; only the aim
	// moves. That distinction matters: rotating the aim translates the image
	// but cannot rescale it, so the curves keep their screen size through the
	// whole radius sweep — the one thing this sequence cannot afford to lose.
	// Aiming low frames the hanging ball; the aim rises to the marked point as
	// the sphere grows past framing anyway.
	const CAM_PATCH = {
		pos: new THREE.Vector3(3.062, 2.75, 3.649),
		look: new THREE.Vector3(0, 0, 0)
	};
	const LOOK_SPHERE = new THREE.Vector3(0, -0.55 * R_OPEN, 0);

	let container;
	let renderer, scene, camera, resizeObserver, animFrame;
	let debugControls;
	let pivot; // holds the sphere + curves; rotates globe frame -> patch frame
	let sphereMesh, sphereMat, gridMesh, gridMat;
	let ringGrid, ringGridMat;
	let patchMesh, patchMat, patchGeo;
	let curveNSMesh, curveEWMesh, curveNSMat, curveEWMat;
	let ringMesh, ringMat;
	let pointMesh;

	// --- the schedule -------------------------------------------------------
	// One function, so the 3D scene and the 2D legend can never disagree about
	// what the surface is currently doing.
	function stateAt(p) {
		const drawT = smoothstep(remap(p, 0.02, CURVES_END));
		const rotT = smoothstep(remap(p, CURVES_END, ROTATE_END));

		// CURVATURE is the schedule here, not radius. The thing the reader is
		// actually watching -- how hard the two curves bend -- falls linearly
		// from the tightest sphere all the way to flat, and R, the morph and
		// the mesh swap are all derived from it.
		//
		// The previous version scheduled radius and morph as separate
		// smoothstepped segments, which put a 54vh dead window in the middle of
		// the scroll. Two compounding causes: the crossfade beat changed no
		// geometry at all, and smoothstep drives its rate to zero at every
		// boundary, so the growth decelerated to a stop just before that window
		// and the flattening accelerated from a stop just after it. Scrolling
		// stopped moving the curves, which is the one thing this scene cannot
		// afford to do.
		//
		// With kappa falling linearly in `flatten`, its rate is constant right
		// through the handover -- nothing special happens at the junction.
		const K_TIGHT = 1 / R_MIN;
		const K_HANDOVER = 1 / R_MAX; // where a whole sphere stops being useful
		const flatten = smoothstep(remap(p, SHRINK_END, PLANE_END));

		let R, kappa, morphT;
		if (p < ROTATE_END) {
			R = R_OPEN;
			kappa = 1 / R_OPEN;
			morphT = 0;
		} else if (p < SHRINK_END) {
			R = lerp(R_OPEN, R_MIN, smoothstep(remap(p, ROTATE_END, SHRINK_END)));
			kappa = 1 / R;
			morphT = 0;
		} else {
			kappa = lerp(K_TIGHT, 0, flatten);
			if (kappa >= K_HANDOVER) {
				R = 1 / kappa; // still a sphere; its radius is whatever kappa implies
				morphT = 0;
			} else {
				R = R_MAX;
				morphT = 1 - kappa / K_HANDOVER;
			}
		}

		const saddleT = smoothstep(remap(p, PLANE_HOLD_END, SADDLE_END));
		const k1 = lerp(kappa, K_SADDLE, saddleT);
		const k2 = lerp(kappa, -K_SADDLE, saddleT);

		// The plane keeps its full width to the end. Rather than shrinking it --
		// which read as the whole surface retreating, as if the world got
		// smaller -- a circle is drawn on it and everything outside that circle
		// fades out. The surface does not move; we simply stop looking at most
		// of it, which is what taking a local neighbourhood actually means.
		const flatRadius = R_MAX * Math.sin(CAP_PHI);
		const ringT = smoothstep(remap(p, PLANE_END, RING_END));
		const clipT = smoothstep(remap(p, RING_END, CLIP_END));

		return {
			drawT,
			rotT,
			R,
			kappa,
			k1,
			k2,
			morphT,
			flatRadius,
			ringT,
			clipT,
			// A hard swap, not a crossfade. At morphT = 0 the patch IS the
			// sphere cap -- same geometry, same material, same normals, and with
			// FrontSide the same pixels -- so there is nothing for a fade to
			// smooth over. Cutting instead frees the flattening to begin at the
			// same instant, which is what keeps the curves moving.
			sphereOn: morphT <= 0,
			useSphereCurves: morphT <= 0,
			legendIn: smoothstep(remap(p, CURVES_END, ROTATE_END)),
			// Aim rises from the hanging ball to the marked point as the surface
			// flattens -- by the time it arrives the sphere is far too big to
			// frame anyway, so nothing is lost by stopping tracking it.
			aimT: smoothstep(remap(p, SHRINK_END, PLANE_END))
		};
	}

	// --- curve builders -----------------------------------------------------
	// Arc of the sphere of radius R centred at (0,-R,0), through the origin,
	// parameterised by ARC LENGTH s so its on-screen size is independent of R.
	function sphereArcPoints(dir, R, half, n = CURVE_SEGMENTS) {
		const pts = [];
		const RR = R + CURVE_EPS; // lifted along the normal, which here is radial
		for (let i = 0; i <= n; i++) {
			const s = -half + (2 * half * i) / n;
			const th = s / R;
			const sin = Math.sin(th);
			pts.push(new THREE.Vector3(sin * dir.x * RR, -R + RR * Math.cos(th), sin * dir.z * RR));
		}
		return pts;
	}
	// The curve on the morphing patch: the same circular arc at morphT = 0,
	// the parabolic normal section at morphT = 1. Because the arc is written
	// in arc-length form here too, this reduces EXACTLY to sphereArcPoints
	// when morphT is 0 — which is what lets the generator switch mid-scene
	// without the curves moving by even a pixel.
	function patchCurvePoints(dir, k, st, n = CURVE_SEGMENTS) {
		const pts = [];
		for (let i = 0; i <= n; i++) {
			const s = -L + (2 * L * i) / n;
			const th = s / st.R;
			const capX = st.R * Math.sin(th);
			const capY = -st.R * (1 - Math.cos(th));
			const x = lerp(capX, s, st.morphT);
			const y = lerp(capY, -0.5 * k * x * x, st.morphT) + CURVE_EPS;
			pts.push(new THREE.Vector3(x * dir.x, y, x * dir.z));
		}
		return pts;
	}
	// The circle marking off the neighbourhood. Built on the surface rather
	// than as a flat ring, so once the saddle forms it rides up and down with
	// the boundary instead of slicing through it.
	function ringPoints(st, n = 120) {
		const pts = [];
		for (let i = 0; i <= n; i++) {
			const th = (2 * Math.PI * i) / n;
			const x = PATCH_R_LOCAL * Math.cos(th);
			const z = PATCH_R_LOCAL * Math.sin(th);
			pts.push(new THREE.Vector3(x, -0.5 * (st.k1 * x * x + st.k2 * z * z) + CURVE_EPS, z));
		}
		return pts;
	}
	// Rewritten in place each frame: fixed vertex budget, draw range trimmed to
	// however many rings are currently valid.
	function updateRingGrid(st) {
		const pos = ringGrid.geometry.attributes.position;
		const arr = pos.array;
		const R = st.R;
		const RR = R + CURVE_EPS;
		let n = 0;
		for (const d of GRID_RADII) {
			const th = d / R;
			if (th > GRID_MAX_ANGLE) continue;
			// Blended exactly as the surface is, so a ring stays welded to it
			// through the morph. A ring is a fixed distance ALONG the surface,
			// so on the flattened patch that distance is just d.
			const rr = lerp(RR * Math.sin(th), d, st.morphT);
			const yy = lerp(-R + RR * Math.cos(th), -0.5 * st.kappa * d * d + CURVE_EPS, st.morphT);
			for (let i = 0; i < GRID_SEG; i++) {
				const a0 = (2 * Math.PI * i) / GRID_SEG;
				const a1 = (2 * Math.PI * (i + 1)) / GRID_SEG;
				arr[n++] = rr * Math.cos(a0);
				arr[n++] = yy;
				arr[n++] = rr * Math.sin(a0);
				arr[n++] = rr * Math.cos(a1);
				arr[n++] = yy;
				arr[n++] = rr * Math.sin(a1);
			}
		}
		pos.needsUpdate = true;
		ringGrid.geometry.setDrawRange(0, n / 3);
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
	// patchT / patchTheta hold each vertex's normalised radial parameter and
	// angle. Positions are rewritten from those every frame, so the same fixed
	// topology serves the sphere cap, the plane and the saddle alike -- no
	// remeshing at any point in the scrub.
	let patchT = [];
	let patchTheta = [];
	function buildPatchGeometry() {
		const positions = [];
		const indices = [];
		positions.push(0, 0, 0); // centre vertex
		patchT = [0];
		patchTheta = [0];
		for (let ring = 1; ring <= PATCH_RINGS; ring++) {
			for (let s = 0; s < PATCH_SPOKES; s++) {
				const th = (2 * Math.PI * s) / PATCH_SPOKES;
				positions.push(0, 0, 0);
				patchT.push(ring / PATCH_RINGS);
				patchTheta.push(th);
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
		// Four-component vertex colour: RGB stays white so the material's own
		// grey shows through unchanged, and only the alpha is driven. This is
		// what lets the plane keep its full extent while everything outside the
		// neighbourhood circle fades out.
		geo.setAttribute('color', new THREE.Float32BufferAttribute(new Array(positions.length / 3 * 4).fill(1), 4));
		geo.setIndex(indices);
		geo.computeVertexNormals();
		return geo;
	}
	// Cap and plane are both written in the same normalised parameter, so the
	// blend between them is a straight vertex lerp -- no seam, no popping, and
	// at morphT = 0 the result is the sphere cap to machine precision.
	function updatePatch(st) {
		const pos = patchGeo.attributes.position;
		const col = patchGeo.attributes.color;
		for (let i = 0; i < pos.count; i++) {
			const t = patchT[i];
			const th = patchTheta[i];
			const a = t * CAP_PHI;
			const capR = st.R * Math.sin(a);
			const capY = -st.R * (1 - Math.cos(a));
			const r = lerp(capR, st.flatRadius * t, st.morphT);
			const x = r * Math.cos(th);
			const z = r * Math.sin(th);
			const quadY = -0.5 * (st.k1 * x * x + st.k2 * z * z);
			pos.setXYZ(i, x, lerp(capY, quadY, st.morphT), z);
			// Opaque inside the circle, fading out beyond it. The soft band
			// keeps the boundary from reading as a cookie-cutter edge while
			// still letting the drawn circle be the visible boundary.
			col.setW(i, 1 - st.clipT * smoothstep((r - PATCH_R_LOCAL) / 0.35));
		}
		pos.needsUpdate = true;
		col.needsUpdate = true;
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
		// Never transparent now: the swap is instantaneous, so the sphere stays
		// fully opaque its whole life and the transparent-queue sorting hazards
		// that came with fading it simply do not arise.
		sphereMesh.visible = st.sphereOn;
		// The lat/long wireframe says "this is a globe", worth having while the
		// ball is being introduced -- but it scales with the sphere, so it has
		// to be gone before the size sweep starts or it argues for a zoom. It
		// hands over to the fixed-distance rings across the rotation.
		gridMat.opacity = 0.14 * (1 - st.rotT);
		gridMesh.visible = st.sphereOn && gridMat.opacity > 0.005;
		// The fixed-distance rings carry straight on through the flattening --
		// staying the same size while the surface goes flat under them is the
		// clearest statement of what is happening -- and hand over to the single
		// neighbourhood circle rather than vanishing at the mesh swap.
		updateRingGrid(st);
		ringGridMat.opacity = 0.4 * st.rotT * (1 - st.ringT);
		ringGrid.visible = ringGridMat.opacity > 0.005;

		// --- the local patch ---
		if (!st.sphereOn) {
			updatePatch(st);
			patchMesh.visible = true;
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
			: patchCurvePoints(DIR_NS, st.k1, st);
		const ew = st.useSphereCurves
			? sphereArcPoints(DIR_EW, st.R, half)
			: patchCurvePoints(DIR_EW, st.k2, st);
		curveNSMesh.geometry.dispose();
		curveNSMesh.geometry = tubeFromPoints(ns);
		curveEWMesh.geometry.dispose();
		curveEWMesh.geometry = tubeFromPoints(ew);
		const curvesOn = st.drawT > 0.01;
		curveNSMesh.visible = curvesOn;
		curveEWMesh.visible = curvesOn;

		// The circle only exists once the surface is a plane, and stays on as
		// the quiet boundary of the neighbourhood while the saddle forms.
		if (st.ringT > 0.01) {
			ringMesh.visible = true;
			ringMesh.geometry.dispose();
			ringMesh.geometry = tubeFromPoints(ringPoints(st), 0.012);
			ringMat.opacity = st.ringT * 0.55;
		} else {
			ringMesh.visible = false;
		}

		pointMesh.visible = st.drawT > 0.01;

		// --- camera: globe framing eases to the fixed patch three-quarter ---
		if (!debug) {
			camera.position.lerpVectors(CAM_GLOBE.pos, CAM_PATCH.pos, st.rotT);
			const aim = new THREE.Vector3().lerpVectors(CAM_GLOBE.look, LOOK_SPHERE, st.rotT);
			camera.lookAt(aim.lerp(CAM_PATCH.look, st.aimT));
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
			: patchCurvePoints(dir, k, st, 48);
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
			// Unlabelled on purpose: colour already ties each profile to its own
			// curve in the scene, and any wording would go wrong halfway
			// through — on the sphere these are the meridian and the equator,
			// but on a general patch they are neither geodesics nor compass
			// directions.
			ns: legendPath('', st, 'ns'),
			ew: legendPath('', st, 'ew')
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
		// FrontSide, not DoubleSide. A closed ball never needs its back faces,
		// and drawing them was the source of the double silhouette: while the
		// sphere is opaque its own front hides them, but the instant depthWrite
		// goes off for the crossfade they render too and the dome gains a
		// second edge. The same applies to the cap, whose far half faces away
		// from the camera and should simply not be drawn.
		sphereMat = new THREE.MeshStandardMaterial({
			color: 0x9a9a94,
			roughness: 0.92,
			metalness: 0,
			side: THREE.FrontSide
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

		const gridArr = new Float32Array(GRID_RADII.length * GRID_SEG * 2 * 3);
		const ringGeo = new THREE.BufferGeometry();
		ringGeo.setAttribute('position', new THREE.BufferAttribute(gridArr, 3));
		ringGridMat = new THREE.LineBasicMaterial({
			color: pal.muted ?? 0x898781,
			transparent: true,
			opacity: 0
		});
		ringGrid = new THREE.LineSegments(ringGeo, ringGridMat);
		pivot.add(ringGrid);

		patchGeo = buildPatchGeometry();
		patchMat = new THREE.MeshStandardMaterial({
			color: 0x9a9a94,
			roughness: 0.92,
			metalness: 0,
			side: THREE.FrontSide,
			transparent: true,
			vertexColors: true
		});
		patchMesh = new THREE.Mesh(patchGeo, patchMat);
		patchMesh.visible = false;
		pivot.add(patchMesh);

		// Blue / orange: the validated slot-1 and slot-2 pair, so the two
		// directions stay distinguishable under colour-vision deficiency as
		// well as in normal vision. They keep these colours for the whole
		// sequence, in 3D and in the legend alike.
		// transparent:true is not about opacity here -- it moves the curves into
		// three.js's transparent queue, which draws AFTER the opaque one and
		// honours renderOrder. As opaque meshes they were drawn first and then
		// painted over by the sphere and patch the moment either went
		// see-through for the crossfade, which is exactly when they matter most.
		curveNSMat = new THREE.MeshBasicMaterial({ color: pal.blue, transparent: true, depthWrite: false });
		curveEWMat = new THREE.MeshBasicMaterial({ color: pal.orange, transparent: true, depthWrite: false });
		curveNSMesh = new THREE.Mesh(tubeFromPoints(sphereArcPoints(DIR_NS, R_OPEN, 0.001)), curveNSMat);
		curveEWMesh = new THREE.Mesh(tubeFromPoints(sphereArcPoints(DIR_EW, R_OPEN, 0.001)), curveEWMat);
		// Rendered after the surfaces with depth test still on, but nudged
		// out along the normal so they read as sitting ON the surface rather
		// than z-fighting through it.
		curveNSMesh.renderOrder = 3;
		curveEWMesh.renderOrder = 3;
		pivot.add(curveNSMesh, curveEWMesh);

		ringMat = new THREE.MeshBasicMaterial({
			color: pal.muted ?? 0x898781,
			transparent: true,
			opacity: 0,
			depthWrite: false
		});
		ringMesh = new THREE.Mesh(tubeFromPoints(ringPoints({ k1: 0, k2: 0 }), 0.012), ringMat);
		ringMesh.renderOrder = 2;
		ringMesh.visible = false;
		pivot.add(ringMesh);

		// The marked point itself — aqua, well clear of both curve colours.
		pointMesh = new THREE.Mesh(
			new THREE.SphereGeometry(0.055, 20, 16),
			new THREE.MeshBasicMaterial({ color: pal.aqua, transparent: true, depthWrite: false })
		);
		pointMesh.renderOrder = 4;
		pointMesh.position.y = CURVE_EPS * 1.5;
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
			ringMesh.geometry.dispose();
			patchGeo.dispose();
			ringGrid.geometry.dispose();
			renderer.dispose();
		};
	});

	// --- captions -----------------------------------------------------------
	// Captions sit just under the legend rather than down at the foot of the
	// panel: the legend is where the change is actually legible, and a caption
	// a whole viewport away from it made the reader choose which to watch.
	const CAPTION_DEFAULT_TOP = '9.5rem';
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
			end: 0.46,
			text: 'The steeper the curves, the smaller the sphere. The flatter the curves, the bigger it is.'
		},
		{
			start: 0.46,
			end: RING_END,
			text: 'With no curvature at all in either direction, you have a flat plane.'
		},
		{
			start: RING_END,
			end: PLANE_HOLD_END,
			text: 'From here, keep only the small patch of surface around our point.'
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
		</div>
		<div class="legend-item">
			<svg viewBox="0 0 {LEG_W} {LEG_H}" aria-hidden="true">
				<line class="axis" x1="6" y1={LEG_H / 2} x2={LEG_W - 6} y2={LEG_H / 2} />
				<path class="curve" style="stroke: {legendPal.orange}" d={legend.ew} />
			</svg>
		</div>
	</div>
{/if}

<div class="caption-overlay">
	{#each CAPTIONS as c, i}
		{#if captionOpacities[i] > 0.01}
			<p class="caption" style="opacity: {captionOpacities[i]}; top: {c.top ?? CAPTION_DEFAULT_TOP};">
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
	.caption-overlay {
		/* No top here -- each .caption sets its own (CAPTION_DEFAULT_TOP). */
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
