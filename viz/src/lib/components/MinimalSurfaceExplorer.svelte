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
	// Scherk (singly periodic) is the third family, and it IS the real
	// numerical-Weierstrass-integration case flagged as separate-scale work
	// when this file was first built -- see gallery_implementation_notes.md
	// for the full spec this follows. Each "story" renders one fundamental
	// saddle piece (the inner disk |z|<1-eps in the Weierstrass domain,
	// simply connected -- it encloses none of the four puncture points, so
	// the path integral below is single-valued with no monodromy/period-
	// tracking needed for a single piece). Multiple stories are rigid
	// copies of that same piece, rotated and stacked (see
	// buildScherkGeometry) -- not a second surface derivation, since the
	// true analytic continuation across a puncture into the next period is
	// a genuine monodromy computation this file doesn't attempt. The
	// formula itself was checked the same way as the other two families
	// (finite-difference mean curvature at several (u,v,theta) samples) --
	// see the verification note by SCHERK_QUADRATURE_N below for why that
	// check needed much higher numerical precision than the closed-form
	// families to actually converge to zero.
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

	// --- Scherk (singly periodic, genus zero, Scherk-type ends): from the
	// Weierstrass representation g(z) = z, dh = 4 sin(2theta) z dz /
	// (z^4 - 2cos(2theta) z^2 + 1), integrated via
	// X(z) = Re. Integral (1/2(1/g-g), i/2(1/g+g), 1) dh
	// -- per gallery_implementation_notes.md, cross-checked against
	// Perez & Traizet's classification. dh's denominator factors as
	// (z-e^{i.theta})(z+e^{i.theta})(z-e^{-i.theta})(z+e^{-i.theta}), four
	// punctures all at |z|=1 -- so *any* point with |z| <= 1-eps is at
	// least eps from every puncture (reverse triangle inequality), which
	// is why the domain below is simply "radius capped at 1-eps", not
	// four individually-avoided disks: a stronger, much simpler-to-mesh
	// sufficient condition. ---
	function cadd(a, b) {
		return [a[0] + b[0], a[1] + b[1]];
	}
	function csub(a, b) {
		return [a[0] - b[0], a[1] - b[1]];
	}
	function cmul(a, b) {
		return [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
	}
	function cdiv(a, b) {
		const d = b[0] * b[0] + b[1] * b[1];
		return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d];
	}
	function cscale(a, s) {
		return [a[0] * s, a[1] * s];
	}
	function scherkDhOverDz(z, theta) {
		const z2 = cmul(z, z);
		const z4 = cmul(z2, z2);
		const denom = cadd(csub(z4, cscale(z2, 2 * Math.cos(2 * theta))), [1, 0]);
		return cdiv(cscale(z, 4 * Math.sin(2 * theta)), denom);
	}
	function scherkPhi1(z, theta) {
		// (1/2)(1/z - z) * dh/dz
		return cmul(cscale(csub(cdiv([1, 0], z), z), 0.5), scherkDhOverDz(z, theta));
	}
	function scherkPhi2(z, theta) {
		// (i/2)(1/z + z) * dh/dz
		return cmul(cmul([0, 0.5], cadd(cdiv([1, 0], z), z)), scherkDhOverDz(z, theta));
	}
	function scherkPhi3(z, theta) {
		return scherkDhOverDz(z, theta);
	}
	// Path integral from the origin (a regular point -- not a puncture,
	// even though the individual phi1/phi2 terms above have a literal 1/z
	// that would divide by zero exactly at z=0; skipping the t=0 quadrature
	// sample sidesteps that without approximating anything, since the true
	// integrand is finite there) to `ztarget`, along the straight line --
	// always safe here since the inner disk is convex and puncture-free.
	// N=20 keeps a full mesh rebuild fast enough for continuous slider
	// dragging (~1-2% relative position error vs a N=1000 reference,
	// checked numerically -- imperceptible at this mesh resolution), even
	// though verifying mean-curvature-zero via finite differences needed
	// N up in the hundreds to converge cleanly -- second derivatives
	// amplify quadrature noise much more than the positions themselves do.
	const SCHERK_QUADRATURE_N = 20;
	function scherkIntegrate(phiFn, theta, ztarget, N) {
		const h = 1 / N;
		let total = [0, 0];
		for (let i = 0; i <= N; i++) {
			const t = i * h;
			if (t === 0) continue;
			const w = cscale(ztarget, t);
			const val = cmul(phiFn(w, theta), ztarget);
			const coeff = i === N ? 1 : i % 2 === 1 ? 4 : 2;
			total = cadd(total, cscale(val, coeff));
		}
		return cscale(total, h / 3);
	}
	function scherkPoint3(theta, u, v, N = SCHERK_QUADRATURE_N) {
		if (u * u + v * v < 1e-8) return [0, 0, 0];
		const z = [u, v];
		const x = scherkIntegrate(scherkPhi1, theta, z, N)[0];
		const axis = scherkIntegrate(scherkPhi3, theta, z, N)[0]; // the periodic direction -> world Y, same up-is-Y convention as the other two families
		const y = scherkIntegrate(scherkPhi2, theta, z, N)[0];
		return [x, axis, y];
	}

	const SCHERK_EPS = 0.1; // stay >= this far (in |z|) from the puncture radius |z|=1
	const SCHERK_R_MAX = 1 - SCHERK_EPS;
	const SCHERK_CLIP_RADIUS = 3.2; // world-space clip -- the ends blow up approaching the punctures; cut them off rather than render arbitrarily close
	const SCHERK_R_STEPS = 28;
	const SCHERK_PHI_STEPS = 64;
	// A single piece's ends only need to look like they're heading off the
	// edge of the frame (SCHERK_CLIP_RADIUS above is plenty). But two
	// *stacked* stories need their ends to actually reach each other:
	// each end only approaches its shared asymptotic plane in the limit
	// r -> 1, growing in (x,z) the whole way there, so a story's ends stop
	// noticeably short of its neighbor's unless the mesh is both let closer
	// to the puncture and given the clip radius to still render what
	// that produces (checked numerically -- at r=0.9 an end's x,z sits
	// around 2, nowhere near a neighboring floor's own footprint; at
	// r=0.975 with N bumped for the tighter quadrature it's already past
	// 3, enough to visibly overlap the next story's own fan-out).
	// --- The tower (stories > 1) uses a different, EXACT parametrization of
	// the same surface, not the numerical integration above.
	//
	// Why: the Weierstrass domain used above is the disk |z| <= 1-eps, whose
	// four punctures sit ON its boundary circle. That disk only ever grazes
	// each puncture at a single boundary point, so the mesh it produces
	// captures the four ends as four thin radial *slivers* rather than as
	// the flat half-planes they actually are. That's fine for one isolated
	// saddle (nothing is meant to meet anything), but it's exactly wrong for
	// a tower -- and no amount of extra numerical precision fixes it, since
	// it's the shape of the domain, not the accuracy of the integration.
	//
	// The orthogonal saddle tower has a closed form (Wikipedia's Scherk
	// article; r in (0,1), phi in [0,2pi)) that has no such problem:
	//   x = ln[(1+r^2+2r.cos phi)/(1+r^2-2r.cos phi)]
	//   y = ln[(1+r^2-2r.sin phi)/(1+r^2+2r.sin phi)]
	//   z = 2.arctan[2r^2.sin(2phi)/(r^4-1)]
	// Its four ends (phi = 0, pi/2, pi, 3pi/2) are genuine half-planes: two
	// in the plane y=0, two in x=0, each spanning the full height of one
	// period -- i.e. two orthogonal planes joined by tunnels, which is what
	// the reference picture shows. It also grows only *logarithmically*
	// approaching an end, so a modest r_max already reaches a useful extent.
	//
	// Verified numerically before being used here: mean curvature ~1e-7 at
	// several (r, phi); height converging to the same +-pi/2 floors the
	// integrated version has; and the gluing below reproducing the adjoining
	// story to within the (shrinking) finite-r gap. Note arctan, NOT atan2 --
	// atan2 introduces spurious +-pi branch jumps mid-surface.
	const SCHERK_TOWER_SCALE = 0.5; // this form runs 2x the integrated one; rescaled so 1 story and 2+ stories are the same size
	const SCHERK_TOWER_ROTATE = Math.PI / 4; // ...and 45deg off it, so switching stories doesn't visibly spin the shape
	// Close to 1 on purpose: a story's boundary only reaches its exact
	// +-pi/2 floor (where it meets its neighbour) in the limit r -> 1, so
	// r_max is what actually sets how tight the seam is. Cheap to push here
	// -- unlike the integrated version, this is a handful of logs per
	// vertex, and the ends grow only logarithmically, so most of what the
	// extra reach buys gets clipped away anyway.
	const SCHERK_TOWER_R_MAX = 0.999995;
	const SCHERK_TOWER_R_STEPS = 64;
	const SCHERK_TOWER_PHI_STEPS = 96;
	// z's height plateaus at +pi/2 for one full quadrant of phi and -pi/2
	// for the next (verified numerically: constant to 4 decimal places
	// across an entire 0-90deg sweep), but AT phi = 0, 90, 180, 270deg
	// exactly -- precisely the four points a step count divisible by 4
	// would otherwise sample -- sin(2*phi) is exactly 0, making z's
	// defining ratio a genuine 0/0 that evaluates to 0 rather than to
	// either neighboring plateau. Left alone, every story would carry a
	// sharp notch to +-0 right where the two floors actually need to meet.
	// A half-step phase offset keeps every sample off that exact angle.
	const SCHERK_TOWER_PHI_OFFSET = Math.PI / SCHERK_TOWER_PHI_STEPS;
	const SCHERK_CLIP_RADIUS_STACKED = 4.6;
	function scherkTowerPoint(r, phi) {
		const r2 = r * r;
		const c = Math.cos(phi);
		const s = Math.sin(phi);
		const x = Math.log((1 + r2 + 2 * r * c) / (1 + r2 - 2 * r * c));
		const y = Math.log((1 + r2 - 2 * r * s) / (1 + r2 + 2 * r * s));
		const z = 2 * Math.atan((2 * r2 * Math.sin(2 * phi)) / (r2 * r2 - 1));
		const xs = x * SCHERK_TOWER_SCALE;
		const ys = y * SCHERK_TOWER_SCALE;
		const ca = Math.cos(SCHERK_TOWER_ROTATE);
		const sa = Math.sin(SCHERK_TOWER_ROTATE);
		// formula's own z is the periodic direction -> world Y, same
		// up-is-Y convention as everything else in this file
		return [ca * xs - sa * ys, z * SCHERK_TOWER_SCALE, sa * xs + ca * ys];
	}
	function buildScherkTowerGrid() {
		const grid = [];
		for (let i = 0; i <= SCHERK_TOWER_R_STEPS; i++) {
			const t = i / SCHERK_TOWER_R_STEPS;
			// biased toward r_max -- the surface does nearly all of its
			// stretching in the last sliver of the domain, near the ends
			const r = SCHERK_TOWER_R_MAX * (1 - (1 - t) * (1 - t));
			const row = [];
			for (let j = 0; j <= SCHERK_TOWER_PHI_STEPS; j++) {
				row.push(scherkTowerPoint(r, (j / SCHERK_TOWER_PHI_STEPS) * Math.PI * 2 + SCHERK_TOWER_PHI_OFFSET));
			}
			grid.push(row);
		}
		return grid;
	}

	// The rise of one story. As r -> 1 a story's height converges to one of
	// two asymptotic "floors" (+-pi/2 in the scaling used here), and the gap
	// between them is the period. Cross-checked both ways: the integrated
	// version above lands on floors pi apart at every theta sampled (pi/6,
	// pi/3, 0.4*pi, not just the orthogonal case), and the closed form's own
	// single period spans exactly the same distance once SCHERK_TOWER_SCALE
	// is applied -- which is how that scale factor was pinned down.
	const SCHERK_STORY_HEIGHT = Math.PI;
	// Consecutive stories are glued by a quarter turn about the vertical
	// axis plus a rise of SCHERK_STORY_HEIGHT -- NOT by translation alone.
	// The reason is visible in the closed form: a story's top boundary
	// occupies the two diagonal quadrants {x>0,y>0} and {x<0,y<0}, while its
	// bottom boundary occupies the *other* two, so the two only line up
	// after a 90-degree turn. Confirmed both analytically (the boundary
	// curves match exactly under phi -> phi - pi/2) and numerically (the
	// transformed neighbour reproduces the boundary to within the finite-r
	// gap, which shrinks as SCHERK_TOWER_R_MAX -> 1). The quarter turn is
	// also what makes each floor's tunnel run crosswise to the one below,
	// which is the surface's most recognizable feature.
	//
	// Rigid motions preserve minimality, so a tower is still exactly
	// minimal. Stacking is nonetheless offered only at the orthogonal angle
	// (see FAMILIES/paramValue below): the closed form this uses has no free
	// angle parameter, and continuing the angle-parametrized family across a
	// puncture into the next period is a genuine monodromy computation this
	// file doesn't attempt.
	function buildScherkStoryGrid(theta, rMax, quadratureN) {
		const grid = [];
		for (let i = 0; i <= SCHERK_R_STEPS; i++) {
			const r = (i / SCHERK_R_STEPS) * rMax;
			const row = [];
			for (let j = 0; j <= SCHERK_PHI_STEPS; j++) {
				const phi = (j / SCHERK_PHI_STEPS) * Math.PI * 2;
				row.push(scherkPoint3(theta, r * Math.cos(phi), r * Math.sin(phi), quadratureN));
			}
			grid.push(row);
		}
		return grid;
	}
	// The tower's closed form (scherkTowerPoint) is cheap logs/atan, so
	// curvature can be computed the same direct way as the two closed-form
	// families -- unlike the angle-parametrized single saddle above, which
	// is a numerical path integral and stays excluded (see CURVATURE_H's
	// note). Computed once per distinct (r, phi) grid vertex and reused for
	// every story, since Gaussian curvature is invariant under the rigid
	// rotate-and-rise each story is placed with.
	function computeTowerVertexColors(grid) {
		const cols = grid[0].length;
		const rows = grid.length;
		const pointFn = (u, v, target) => target.set(...scherkTowerPoint(v, u));
		const logK = new Float64Array(cols * rows);
		let minLog = Infinity;
		let maxLog = -Infinity;
		for (let i = 0; i < rows; i++) {
			const t = i / SCHERK_TOWER_R_STEPS;
			const r = SCHERK_TOWER_R_MAX * (1 - (1 - t) * (1 - t));
			for (let j = 0; j < cols; j++) {
				const phi = (j / SCHERK_TOWER_PHI_STEPS) * Math.PI * 2 + SCHERK_TOWER_PHI_OFFSET;
				const K = gaussianCurvatureAt(pointFn, phi, r);
				const lk = Math.log1p(Math.abs(K));
				logK[i * cols + j] = lk;
				if (lk < minLog) minLog = lk;
				if (lk > maxLog) maxLog = lk;
			}
		}
		const range = maxLog - minLog;
		const colors = new Float32Array(cols * rows * 3);
		for (let idx = 0; idx < cols * rows; idx++) {
			const t = range > 1e-9 ? (logK[idx] - minLog) / range : 0;
			const [r, g, b] = curvatureColor(t);
			colors[idx * 3] = r;
			colors[idx * 3 + 1] = g;
			colors[idx * 3 + 2] = b;
		}
		return colors;
	}
	function buildScherkGeometry(theta, stories = 1, withCurvature = false) {
		const stacked = stories > 1;
		// A tower is built from the exact closed form (see the block above
		// for why the integrated disk-domain piece can't tile); a lone
		// saddle still comes from the angle-parametrized integration, which
		// is the whole point of the angle slider.
		const grid = stacked
			? buildScherkTowerGrid()
			: buildScherkStoryGrid(theta, SCHERK_R_MAX, SCHERK_QUADRATURE_N);
		const clipRadius = stacked ? SCHERK_CLIP_RADIUS_STACKED : SCHERK_CLIP_RADIUS;
		const withinClip = (p) => Math.hypot(p[0], p[1], p[2]) <= clipRadius;
		const cols = grid[0].length;
		const phiSteps = cols - 1;
		const rRows = grid.length - 1;
		const vertsPerStory = grid.length * cols;
		const positions = [];
		const indices = [];
		const storyColors = stacked && withCurvature ? computeTowerVertexColors(grid) : null;
		const colors = storyColors ? [] : null;
		for (let k = 0; k < stories; k++) {
			// Quarter turn + rise, per SCHERK_STORY_HEIGHT's comment above.
			const rotAngle = k * (Math.PI / 2);
			const cosR = Math.cos(rotAngle);
			const sinR = Math.sin(rotAngle);
			const riseY = k * SCHERK_STORY_HEIGHT;
			const vertexOffset = k * vertsPerStory;
			for (const row of grid) {
				for (const p of row) {
					const x = cosR * p[0] + sinR * p[2];
					const z = -sinR * p[0] + cosR * p[2];
					positions.push(x, p[1] + riseY, z);
				}
			}
			if (colors) for (let n = 0; n < storyColors.length; n++) colors.push(storyColors[n]);
			for (let i = 0; i < rRows; i++) {
				for (let j = 0; j < phiSteps; j++) {
					const a = grid[i][j],
						b = grid[i + 1][j],
						c = grid[i + 1][j + 1],
						d = grid[i][j + 1];
					const ai = vertexOffset + i * cols + j,
						bi = vertexOffset + (i + 1) * cols + j,
						ci = vertexOffset + (i + 1) * cols + j + 1,
						di = vertexOffset + i * cols + j + 1;
					// Discard (not clamp, not fade) any triangle reaching past
					// the clip radius -- per spec, this is "a finite window
					// into an infinite surface," not the surface actually
					// shrinking. Clip test uses the pre-transform (local)
					// point, same radius per story, centered on that story.
					if (withinClip(a) && withinClip(b) && withinClip(c)) indices.push(ai, bi, ci);
					if (withinClip(a) && withinClip(c) && withinClip(d)) indices.push(ai, ci, di);
				}
			}
		}
		const geometry = new THREE.BufferGeometry();
		geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
		if (colors) geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
		geometry.setIndex(indices);
		geometry.computeVertexNormals();
		return geometry;
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
		},
		{
			id: 'scherk',
			label: 'Scherk Surface',
			paramLabel: 'Angle between ends',
			minLabel: 'Narrow',
			maxLabel: 'Wide',
			// Kept away from both 0 and pi/2 -- the Weierstrass data
			// degenerates at theta=0, and at theta=pi/2 the four punctures
			// collide into two double points instead of staying distinct.
			min: Math.PI / 18,
			max: Math.PI / 2 - Math.PI / 18,
			step: 0.01,
			default: Math.PI / 4, // "orthogonal" Scherk
			buildGeometry: buildScherkGeometry,
			definition:
				'g(z) = z\n' +
				'dh = 4sin(2θ)·z dz / (z⁴ − 2cos(2θ)z² + 1)\n' +
				'X(z) = Re ∫ (½(1/g−g), i/2(1/g+g), 1) dh\n\n' +
				'Four ends, at z = ±e^{±iθ} — θ sets the angle between them.\n' +
				'One saddle piece, clipped before the ends run off to infinity.\n\n' +
				'"Stories" switches to the exact closed form of the orthogonal\n' +
				'member (Scherk\'s saddle tower), whose four ends are flat\n' +
				'half-planes rather than the slivers the disk domain above\n' +
				'produces. It is singly periodic: each floor is the one below\n' +
				'given a quarter turn and raised by π.'
		}
	];

	// Bindable (not a plain $state) so a host page can drive family choice
	// externally -- e.g. minimal-surfaces/+page.svelte syncing it to a
	// scroll position -- while the dropdown below keeps working exactly as
	// before via its own bind:value into the same variable. Either side can
	// set it; whichever changed most recently wins, same as any two-way
	// binding.
	let { selectedFamilyId = $bindable(FAMILIES[0].id) } = $props();
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
			scherkStories = 1;
		}
	});

	// Scherk-only: number of stacked stories. Locked to 1 for every other
	// family. Stacking beyond one story switches to the exact closed form
	// (see buildScherkGeometry's comment), which has no angle parameter --
	// so selecting stories > 1 pins the angle slider at orthogonal rather
	// than showing a value that no longer does anything. The closed form is
	// a handful of logs/atan per vertex (no numerical integration), so
	// going up to 10 stories costs nothing worth guarding against.
	const SCHERK_MAX_STORIES = 10;
	let scherkStories = $state(1);
	$effect(() => {
		if (selectedFamilyId === 'scherk' && scherkStories > 1) {
			paramValue = Math.PI / 4;
		}
	});

	let container;
	let renderer, scene, camera, controls, mesh, resizeObserver, animFrame;
	let isRotating = $state(false);
	let showCurvature = $state(false);
	const lastFitCenter = new THREE.Vector3(); // tracks rebuildMesh's own framing target before `controls` exists yet (see onMount)

	// distance = fitRadius * FIT_MULTIPLIER approximates "just fits the
	// 45deg-FOV frame with a little margin" (1/sin(22.5deg) ~ 2.6, plus
	// margin). FIT_MIN_DISTANCE keeps small shapes (e.g. Enneper at its
	// smallest R) from zooming in uncomfortably close.
	const FIT_MULTIPLIER = 2.9;
	const FIT_MIN_DISTANCE = 3.2;

	// --- Gaussian curvature coloring (Catenoid<->Helicoid and Enneper
	// only -- see the note on CURVATURE_H below for why Scherk is
	// excluded). On a minimal surface the two principal curvatures are
	// equal and opposite (mean curvature zero, the fact the
	// "defining-property" slide earlier in this chapter demonstrates), so
	// Gaussian curvature K = kappa1*kappa2 = -kappa^2 is always <= 0, and
	// its magnitude is exactly how sharply the surface bends at that
	// point -- this is what the Wikipedia associate-family animation
	// colors, and what "Show curvature" below reproduces.
	//
	// Uses the standard first/second fundamental form formula
	// K = (LN-M^2)/(EG-F^2) with all six coefficients from finite
	// differences -- the same technique this file's own verification
	// scripts used to confirm each family's mean curvature is ~0, just
	// evaluated at every mesh vertex instead of a few spot-checks. Small
	// h steps in the *reparametrized* (u01, v01) domain used by
	// family.point are valid here (not just at the family's own u,v
	// scale) because Gaussian curvature is intrinsic -- invariant under
	// any regular reparametrization, so K comes out the same either way.
	const CURVATURE_H = 1e-3; // cheap for closed-form point() calls -- Scherk's point() is a numerical path integral instead, and would need a much finer quadrature (SCHERK_QUADRATURE_N in the hundreds, per the note by that constant above) to get a clean, non-grainy second derivative here, at real performance cost -- not attempted this pass, see the "Show curvature" toggle being disabled for Scherk below.
	function evalPoint(pointFn, u, v) {
		const p = new THREE.Vector3();
		pointFn(u, v, p);
		return p;
	}
	function gaussianCurvatureAt(pointFn, u, v) {
		const h = CURVATURE_H;
		const p = evalPoint(pointFn, u, v);
		const pu1 = evalPoint(pointFn, u + h, v);
		const pu0 = evalPoint(pointFn, u - h, v);
		const pv1 = evalPoint(pointFn, u, v + h);
		const pv0 = evalPoint(pointFn, u, v - h);
		const puvA = evalPoint(pointFn, u + h, v + h);
		const puvB = evalPoint(pointFn, u + h, v - h);
		const puvC = evalPoint(pointFn, u - h, v + h);
		const puvD = evalPoint(pointFn, u - h, v - h);

		const Xu = pu1.clone().sub(pu0).multiplyScalar(1 / (2 * h));
		const Xv = pv1.clone().sub(pv0).multiplyScalar(1 / (2 * h));
		const Xuu = pu1
			.clone()
			.add(pu0)
			.sub(p.clone().multiplyScalar(2))
			.multiplyScalar(1 / (h * h));
		const Xvv = pv1
			.clone()
			.add(pv0)
			.sub(p.clone().multiplyScalar(2))
			.multiplyScalar(1 / (h * h));
		const Xuv = puvA
			.clone()
			.sub(puvB)
			.sub(puvC)
			.add(puvD)
			.multiplyScalar(1 / (4 * h * h));

		const E = Xu.dot(Xu);
		const F = Xu.dot(Xv);
		const G = Xv.dot(Xv);
		const normal = Xu.clone().cross(Xv);
		const normalLenSq = normal.lengthSq();
		if (normalLenSq < 1e-12) return 0; // degenerate point (e.g. Enneper's own center) -- not curvature-undefined in principle, just not worth dividing by ~0 here
		normal.multiplyScalar(1 / Math.sqrt(normalLenSq));
		const L = Xuu.dot(normal);
		const M = Xuv.dot(normal);
		const N = Xvv.dot(normal);
		const denom = E * G - F * F;
		if (Math.abs(denom) < 1e-12) return 0;
		return (L * N - M * M) / denom;
	}
	// Blue = least curved, red = most curved -- the standard jet/turbo
	// heatmap sense (cool = low magnitude, hot = high), not the reverse
	// scheme the original Wikipedia reference image happened to use.
	// t=0..1 walks the ramp. Blended 25% toward mid-gray -- lit and shaded
	// on the actual mesh, the raw (unblended) stops read more vivid than
	// they do rendered, so the ramp itself is toned down rather than only
	// the flat legend swatches, keeping the two matched.
	const CURVATURE_COLOR_STOPS = [
		[0.25, 0.4, 0.775],
		[0.3625, 0.6625, 0.4],
		[0.85, 0.775, 0.325],
		[0.85, 0.55, 0.25],
		[0.6775, 0.2575, 0.2125]
	];
	function curvatureColor(t) {
		const stops = CURVATURE_COLOR_STOPS;
		const n = stops.length - 1;
		const s = Math.min(Math.max(t, 0), 1) * n;
		const idx = Math.min(Math.floor(s), n - 1);
		const frac = s - idx;
		const a = stops[idx];
		const b = stops[idx + 1];
		return [a[0] + (b[0] - a[0]) * frac, a[1] + (b[1] - a[1]) * frac, a[2] + (b[2] - a[2]) * frac];
	}
	// CSS-string form of the same ramp, for the legend bar/icons below --
	// deriving both from curvatureColor() rather than a separately
	// hand-copied hex list keeps them from silently drifting out of sync
	// with the actual mesh ramp.
	function curvatureColorCss(t) {
		const [r, g, b] = curvatureColor(t);
		return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
	}
	// Colors every vertex of a family.point()-built ParametricGeometry by
	// |K|, log-compressed and normalized to *this mesh's own* min/max --
	// rather than a fixed reference constant -- so the full red-to-blue
	// range is always used, whether the surface is Enneper at its
	// smallest R (modest curvature range) or its largest (huge one).
	function applyCurvatureColors(geometry, pointFn, uSteps, vSteps) {
		const cols = uSteps + 1;
		const rows = vSteps + 1;
		const logK = new Float64Array(cols * rows);
		let minLog = Infinity;
		let maxLog = -Infinity;
		for (let i = 0; i < rows; i++) {
			const v = i / vSteps;
			for (let j = 0; j < cols; j++) {
				const u = j / uSteps;
				const K = gaussianCurvatureAt(pointFn, u, v);
				const lk = Math.log1p(Math.abs(K));
				logK[i * cols + j] = lk;
				if (lk < minLog) minLog = lk;
				if (lk > maxLog) maxLog = lk;
			}
		}
		const range = maxLog - minLog;
		const colors = new Float32Array(cols * rows * 3);
		for (let idx = 0; idx < cols * rows; idx++) {
			const t = range > 1e-9 ? (logK[idx] - minLog) / range : 0;
			const [r, g, b] = curvatureColor(t);
			colors[idx * 3] = r;
			colors[idx * 3 + 1] = g;
			colors[idx * 3 + 2] = b;
		}
		geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
	}

	function rebuildMesh() {
		const family = currentFamily;
		const param = paramValue;
		const isScherk = family.id === 'scherk';
		// Scherk needs a custom builder (world-space clipping discards
		// individual triangles near the ends -- ParametricGeometry's regular
		// grid-with-no-holes can't do that), everything else uses the
		// generic closed-form point() + ParametricGeometry path. Scherk's own
		// curvature coloring (tower case only) is computed inside its
		// builder, not via applyCurvatureColors below -- see
		// computeTowerVertexColors's comment for why.
		const geometry = family.buildGeometry
			? family.buildGeometry(param, isScherk ? scherkStories : 1, showCurvature)
			: new ParametricGeometry((u, v, target) => family.point(param, u, v, target), RESOLUTION, RESOLUTION);
		if (!family.buildGeometry) geometry.computeVertexNormals();
		// Curvature coloring needs a closed form to stay cheap and clean --
		// available for the two always-closed-form families, and for Scherk
		// only in tower mode (which also switched to a closed form; the
		// angle-parametrized single saddle is still a numerical path
		// integral, excluded per CURVATURE_H's note).
		const curvatureAvailable = !family.buildGeometry || (isScherk && scherkStories > 1);
		if (showCurvature && curvatureAvailable && !family.buildGeometry) {
			applyCurvatureColors(geometry, (u, v, target) => family.point(param, u, v, target), RESOLUTION, RESOLUTION);
		}
		if (mesh) {
			scene.remove(mesh);
			mesh.geometry.dispose();
		}
		const material = mesh ? mesh.material : buildMaterial();
		const useVertexColors = showCurvature && curvatureAvailable;
		if (material.vertexColors !== useVertexColors) {
			material.vertexColors = useVertexColors;
			material.needsUpdate = true;
		}
		material.color.set(useVertexColors ? 0xffffff : activePalette().blue);
		// Duller finish while colored -- the sharp clearcoat highlight (tuned
		// for a single flat blue) reads as a bright white blob on top of the
		// curvature ramp otherwise, easy to mistake for part of the color
		// scale itself rather than just a light reflection.
		material.roughness = useVertexColors ? 0.75 : 0.35;
		material.clearcoat = useVertexColors ? 0 : 0.3;
		mesh = new THREE.Mesh(geometry, material);
		scene.add(mesh);

		// Auto-fit camera distance to the mesh's own extent (direction
		// preserved, so the reader's current rotation isn't disturbed) --
		// without this, extending a family's range (e.g. Enneper's R) just
		// pushes the new, larger parts of the surface off-screen instead of
		// actually revealing them. Framed around the mesh's own bounding-box
		// center rather than the world origin, since a multi-story Scherk
		// stack is centered on its bottom story's origin, not its own middle.
		if (camera) {
			geometry.computeBoundingSphere();
			geometry.computeBoundingBox();
			const center = new THREE.Vector3();
			geometry.boundingBox.getCenter(center);
			const priorTarget = controls ? controls.target.clone() : lastFitCenter;
			const distance = Math.max(geometry.boundingSphere.radius * FIT_MULTIPLIER, FIT_MIN_DISTANCE);
			const dir =
				camera.position.clone().sub(priorTarget).lengthSq() > 1e-6
					? camera.position.clone().sub(priorTarget).normalize()
					: new THREE.Vector3(0.6, 0.4, 0.7).normalize();
			camera.position.copy(center.clone().add(dir.multiplyScalar(distance)));
			if (controls) controls.target.copy(center);
			else camera.lookAt(center);
			lastFitCenter.copy(center);
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

	// Scherk's rebuild (numerical path-integration over a few thousand
	// vertices) measures at ~5-6ms at the resolution/quadrature settings
	// above -- cheap enough to fire on every input event directly, same as
	// the closed-form families, no debounce needed.
	$effect(() => {
		const _f = selectedFamilyId;
		const _p = paramValue;
		const _s = scherkStories;
		const _c = showCurvature;
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
		controls.target.copy(lastFitCenter); // matches the just-built mesh's own framing, not always the world origin (see rebuildMesh)
		controls.autoRotate = false; // toggled from the "Rotate" button below
		controls.autoRotateSpeed = 1.4; // gentle -- a slow, readable spin, not a spectacle
		camera.lookAt(lastFitCenter);

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
	<!-- No family picker here anymore -- the host page (minimal-surfaces'
	     surface-explorer slide) owns family selection via tabs next to the
	     descriptive text, and drives selectedFamilyId externally through the
	     bindable prop. This label is just a read-only reminder of which
	     family is currently showing, for anyone looking at this panel in
	     isolation without the tabs in view. -->
	<p class="control-current-family">{currentFamily.label}</p>

	<label class="control-row">
		<span class="control-label">{currentFamily.paramLabel}</span>
		<input
			type="range"
			min={currentFamily.min}
			max={currentFamily.max}
			step={currentFamily.step}
			bind:value={paramValue}
			disabled={selectedFamilyId === 'scherk' && scherkStories > 1}
		/>
	</label>
	<div class="control-endpoints">
		<span>{currentFamily.minLabel}</span>
		<span>{currentFamily.maxLabel}</span>
	</div>

	{#if selectedFamilyId === 'scherk'}
		<label class="control-row">
			<span class="control-label">Stories ({scherkStories})</span>
			<input type="range" min="1" max={SCHERK_MAX_STORIES} step="1" bind:value={scherkStories} />
		</label>
		<div class="control-endpoints">
			<span>1 (single saddle)</span>
			<span>{SCHERK_MAX_STORIES} (tower)</span>
		</div>
		{#if scherkStories > 1}
			<span class="control-note">Angle locked to orthogonal — the closed form the tower is built from (see file notes) has no free angle parameter.</span>
		{/if}
	{/if}

	<button
		class="curvature-toggle"
		disabled={selectedFamilyId === 'scherk' && scherkStories === 1}
		onclick={() => (showCurvature = !showCurvature)}
	>
		{showCurvature ? 'Hide curvature' : 'Color by curvature'}
	</button>
	{#if selectedFamilyId === 'scherk' && scherkStories === 1}
		<span class="control-note">Curvature coloring isn't available for the single saddle — it's a numerical path integral, and needs far more precision than the live slider can afford (see file notes). It IS available for the tower above (stories > 1), which uses a closed form instead.</span>
	{/if}
	{#if showCurvature && !(selectedFamilyId === 'scherk' && scherkStories === 1)}
		<div class="curvature-legend">
			<div
				class="legend-bar"
				style="background: linear-gradient(90deg, {curvatureColorCss(0)} 0%, {curvatureColorCss(
					0.25
				)} 25%, {curvatureColorCss(0.5)} 50%, {curvatureColorCss(0.75)} 75%, {curvatureColorCss(1)} 100%)"
			></div>
			<div class="legend-endpoints">
				{#each [{ label: 'Nearly flat', t: 0, depth: 1 }, { label: 'Somewhat curved', t: 0.5, depth: 7 }, { label: 'Sharply curved', t: 1, depth: 16 }] as tier (tier.label)}
					<div class="legend-item">
						<svg class="legend-icon" viewBox="0 0 44 28" aria-hidden="true">
							<!-- Wide apart at the ends, control point pulled past the
							     midline so each curve's own true midpoint (not the SVG
							     control point, which a quadratic Bezier only pulls
							     toward) lands exactly on the shared axis -- the two
							     curves touch at that single center point and bend away
							     from each other everywhere else. -->
							<path d="M4 {14 - tier.depth} Q22 {14 + tier.depth} 40 {14 - tier.depth}" fill="none" stroke={curvatureColorCss(tier.t)} stroke-width="2.5" />
							<path d="M4 {14 + tier.depth} Q22 {14 - tier.depth} 40 {14 + tier.depth}" fill="none" stroke={curvatureColorCss(tier.t)} stroke-width="2.5" />
						</svg>
						<span>{tier.label}</span>
					</div>
				{/each}
			</div>
			<p class="legend-caption">
				Color tracks how sharply the surface's two principal curves — the same pair shown earlier, always equal and opposite at every point — bend at that point (technically, their product), not the surface's height.
			</p>
		</div>
	{/if}

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
	.control-current-family {
		margin: 0;
		font-size: 1rem;
		font-weight: 700;
		color: var(--text-primary);
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
	.control-note {
		font-size: 0.72rem;
		color: var(--text-muted);
		line-height: 1.3;
	}
	.curvature-toggle {
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
	.curvature-toggle:hover:not(:disabled) {
		background: var(--surface-2);
	}
	.curvature-toggle:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.curvature-legend {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		padding: 0.6rem 0.7rem;
		border-radius: 6px;
		background: var(--surface-2);
	}
	.legend-bar {
		height: 0.5rem;
		border-radius: 4px;
		/* background set inline from curvatureColorCss() -- see the template */
	}
	.legend-endpoints {
		display: flex;
		justify-content: space-between;
		gap: 0.5rem;
	}
	.legend-item {
		display: flex;
		flex: 1;
		flex-direction: column;
		align-items: center;
		gap: 0.15rem;
	}
	.legend-icon {
		width: 2.75rem;
		height: 1.75rem;
	}
	.legend-item span {
		font-size: 0.68rem;
		color: var(--text-muted);
		text-align: center;
	}
	.legend-caption {
		margin: 0;
		font-size: 0.7rem;
		line-height: 1.4;
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
