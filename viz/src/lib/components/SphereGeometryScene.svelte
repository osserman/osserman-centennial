<script module>
	// Stage boundaries — exported so +page.svelte can derive which scrolling
	// prompt to highlight from the same numbers this scene animates against
	// (same reasoning as the other scroll-scrubbed scenes in this project).
	export const WALK_START = 0.07; // sphere settles, then the triangle walk begins
	export const EDGE1_END = 0.19; // equator -> north pole
	export const EDGE2_END = 0.31; // north pole -> second equator point
	export const EDGE3_END = 0.43; // equator arc back to the start
	export const SUM_END = 0.49; // "270 deg" settles, triangle holds
	export const BEAT_END = 0.54; // a pure pause -- nothing moves -- before turning to the next idea
	export const EXPLAIN_END = 0.62; // camera arrives at the equator baseline; the "90+90=180" diagram fades in
	export const EXPLAIN_HOLD_END = 0.66; // hold on that diagram briefly, then the lines start growing
	// Beyond EXPLAIN_HOLD_END: two meridians grow as one continuous loop
	// (north pole -> far side -> south pole -> back to start). These three
	// aren't independent knobs -- they're exact fractions of that same
	// growth (1/4, 1/2, 3/4 of the way around) so the on-canvas captions
	// below always line up with where the geometry actually is.
	export const NORTH_MEET_END = EXPLAIN_HOLD_END + 0.25 * (1 - EXPLAIN_HOLD_END);
	export const FAR_EQUATOR_END = EXPLAIN_HOLD_END + 0.5 * (1 - EXPLAIN_HOLD_END);
	export const SOUTH_MEET_END = EXPLAIN_HOLD_END + 0.75 * (1 - EXPLAIN_HOLD_END);
</script>

<script>
	// Slide 3's scene: "living on the surface of a sphere" — a spherical
	// triangle walked out geodesic by geodesic (equator -> north pole ->
	// second equator point -> back along the equator), each turn a right
	// angle, summing to 270 deg instead of 180; then, after a pause and a
	// small flat-geometry callback (two right angles off the equator sum
	// to 180, so on a flat surface these lines would never meet), two
	// meridians grown from the equator to show they meet twice anyway,
	// once at each pole, and run parallel again for a moment on the far
	// side in between.
	//
	// On-canvas captions (see .caption below) carry the blow-by-blow
	// narration for that second half, timed to the geometry itself,
	// leaving the left text panel for framing/quiet moments only -- a
	// pattern being tried out here before adopting it elsewhere.
	//
	// Guided only (per explicit direction) — no drag sandbox here, unlike
	// the flat-plane parallel-postulate scene. Angle indicators are small
	// wedges built directly in each vertex's own tangent plane (see
	// tangentWedgeGeometry below) so they read as the same "pie slice"
	// language as that earlier scene, without pretending the sphere is flat.
	//
	// Plain scripted camera moves throughout (no OrbitControls) — chosen
	// explicitly so the reader is never at risk of missing the far pole.
	// `debug` is the one exception: pass debug={true} from the parent and
	// OrbitControls takes over so a camera position/target can be found by
	// hand and read off the on-screen readout, then pasted back into the
	// scripted values above -- a debug aid only, not meant to ship on.
	import { onMount } from 'svelte';
	import * as THREE from 'three';
	import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
	import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
	import { activePalette } from '$lib/palette.js';

	let { progress = 0, debug = false } = $props();
	let debugReadout = $state('');

	const R = 1;
	const SEGMENTS = 48;
	const WEDGE_RADIUS = 0.16;
	const WEDGE_OFFSET = 0.006; // nudge outward along the normal, avoids z-fighting with the sphere

	function remap(t, lo, hi) {
		return Math.max(0, Math.min(1, (t - lo) / (hi - lo)));
	}
	function lerp(a, b, t) {
		return a + (b - a) * t;
	}

	// Point on the sphere at (latitude, longitude), both in radians —
	// lat=+-PI/2 at the poles, lat=0 on the equator. World Y is the polar
	// axis (matches how every other scene in this project treats "up").
	function spherePoint(lat, lon) {
		return new THREE.Vector3(R * Math.cos(lat) * Math.cos(lon), R * Math.sin(lat), R * Math.cos(lat) * Math.sin(lon));
	}

	// Samples a geodesic arc at fixed longitude (a meridian segment,
	// lat0->lat1) or fixed latitude=0 (an equator segment, lon0->lon1) —
	// the only two kinds of geodesic this scene ever needs, both trivial
	// to parametrize directly rather than via a generic great-circle slerp.
	function meridianPoints(lon, lat0, lat1, n = SEGMENTS) {
		const pts = [];
		for (let i = 0; i <= n; i++) pts.push(spherePoint(lerp(lat0, lat1, i / n), lon));
		return pts;
	}
	function equatorPoints(lon0, lon1, n = SEGMENTS) {
		const pts = [];
		for (let i = 0; i <= n; i++) pts.push(spherePoint(0, lerp(lon0, lon1, i / n)));
		return pts;
	}

	function tubeFromPoints(points, radius = 0.012) {
		const curve = new THREE.CatmullRomCurve3(points);
		return new THREE.TubeGeometry(curve, Math.max(8, points.length), radius, 8, false);
	}

	// A small filled pie-slice wedge lying in the tangent plane at `vertex`
	// (a point on the unit sphere, so `vertex` itself is also the outward
	// normal direction) — swept from unit tangent `dirA` to unit tangent
	// `dirB`, both assumed to already lie in that tangent plane (true for
	// any geodesic's own tangent at a point on the sphere). Built as a
	// manual triangle fan rather than THREE.Shape/CircleGeometry, since
	// those are inherently flat-then-positioned and this is easier to
	// reason about directly in the tangent plane's own basis.
	function tangentWedgeGeometry(vertex, dirA, dirB, radius) {
		const normal = vertex.clone().normalize();
		const center = vertex.clone().addScaledVector(normal, WEDGE_OFFSET);
		const a = dirA.clone().normalize();
		const b = dirB.clone().normalize();
		// Angle between the two tangent directions, and a basis (a, perp)
		// spanning the tangent plane so points can be swept from a to b
		// the short way — perp is a rotated 90 deg *within the tangent
		// plane* (via the normal), not an arbitrary cross product, so the
		// sweep stays in-plane.
		const angle = Math.acos(Math.max(-1, Math.min(1, a.dot(b))));
		const perp = new THREE.Vector3().crossVectors(normal, a).normalize();
		const sweepSign = perp.dot(b) >= 0 ? 1 : -1;

		const positions = [center.x, center.y, center.z];
		const n = 16;
		for (let i = 0; i <= n; i++) {
			const t = (angle * sweepSign * i) / n;
			const dir = a.clone().multiplyScalar(Math.cos(t)).addScaledVector(perp, Math.sin(t));
			const p = center.clone().addScaledVector(dir, radius);
			positions.push(p.x, p.y, p.z);
		}
		const indices = [];
		for (let i = 1; i < n + 1; i++) indices.push(0, i, i + 1);

		const geo = new THREE.BufferGeometry();
		geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
		geo.setIndex(indices);
		geo.computeVertexNormals();
		return { geometry: geo, angleDeg: (angle * 180) / Math.PI };
	}

	// --- the triangle's three vertices and edge tangents, fixed (no
	// dragging in this scene) ---
	// LON_B negative (not +90 deg) is what actually makes the walk read as
	// three consecutive *right* turns — verified numerically (Node.js,
	// tangent-angle check at all three vertices lands on 90 deg each) rather
	// than by hand, after an earlier version of this file had it backwards.
	const LON_A = 0; // start point, on the equator
	const LON_B = -Math.PI / 2; // second equator point, 90 deg of longitude over
	const V_START = spherePoint(0, LON_A);
	const V_POLE = spherePoint(Math.PI / 2, 0); // longitude is undefined exactly at the pole; any works
	const V_SECOND = spherePoint(0, LON_B);

	// Tangent directions at each vertex, pointing *along* each incident edge,
	// away from the vertex — used both to draw the edges and to orient each
	// vertex's wedge. Built from explicit "which way / toward what" helpers
	// rather than hand-picked epsilon signs, so the direction is always
	// correct by construction instead of by guessing — a hand-derived sign
	// was wrong here once already this session.
	function tangentAlongMeridian(vertex, lon, lat0, towardPole) {
		const p = spherePoint(lat0 + (towardPole ? 0.02 : -0.02), lon);
		return new THREE.Vector3().subVectors(p, vertex).normalize();
	}
	function tangentAlongEquator(vertex, lon0, towardLon) {
		const p = spherePoint(0, lon0 + Math.sign(towardLon - lon0) * 0.02);
		return new THREE.Vector3().subVectors(p, vertex).normalize();
	}

	// Edge 1 leaves START heading toward the pole (increasing latitude).
	const dirStartAlongMeridian = tangentAlongMeridian(V_START, LON_A, 0, true);
	// Edge 3 arrives at START from SECOND; the tangent pointing back along
	// it (away from START) points toward LON_B.
	const dirStartAlongEquatorBack = tangentAlongEquator(V_START, LON_A, LON_B);

	// Edge 1 and edge 2 both leave POLE heading back down their own
	// meridian (decreasing latitude).
	const dirPoleAlongFirstMeridian = tangentAlongMeridian(V_POLE, LON_A, Math.PI / 2, false);
	const dirPoleAlongSecondMeridian = tangentAlongMeridian(V_POLE, LON_B, Math.PI / 2, false);

	// Edge 2 arrives at SECOND from POLE; the tangent pointing back along it
	// (away from SECOND) points toward the pole (increasing latitude).
	const dirSecondAlongMeridian = tangentAlongMeridian(V_SECOND, LON_B, 0, true);
	// Edge 3 leaves SECOND heading toward START, i.e. toward LON_A.
	const dirSecondAlongEquatorForward = tangentAlongEquator(V_SECOND, LON_B, LON_A);

	let container;
	let renderer, scene, camera, resizeObserver, animFrame;
	let debugControls;
	let sphereMaterial;
	let edge1Mesh, edge2Mesh, edge3Mesh;
	let wedgeStartMesh, wedgePoleMesh, wedgeSecondMesh;
	let wedgeStartMat, wedgePoleMat, wedgeSecondMat;
	let sumLabelGroup;
	let meridianAMesh, meridianBMesh;
	let meridianMat;
	let explainWedgeAMat, explainWedgeBMat;
	let explainLabelGroup;

	// --- camera choreography for the triangle walk ---
	// A camera positioned along an edge's own great-circle *plane normal*
	// (the first version of this) is a real bug, not just a style choice:
	// since the arc's whole plane is perpendicular to the view direction,
	// the arc sits exactly on the sphere's own silhouette as seen from
	// that camera — i.e. edge-on, along the visible rim, which is the
	// opposite of "straight on". The fix is to track the point currently
	// being drawn: camera positioned *radially outward* through that
	// point (so it's always looking straight down at the local surface,
	// dead center in frame) rather than fixed per edge.
	// The fixed camera viewpoints this scene sweeps between (CAM_WIDE,
	// CAM_TRIANGLE, CAM_EXPLAIN) are grouped together further down, once
	// Q_MID exists for CAM_EXPLAIN to be defined relative to it -- see the
	// comment there.
	const EDGE_CAM_DIST = 2.3;

	// Spherical lerp between two unit vectors -- used to blend the
	// camera's up vector smoothly rather than snapping it.
	function slerpVec(a, b, t) {
		const dot = Math.max(-1, Math.min(1, a.dot(b)));
		const theta = Math.acos(dot) * t;
		const relative = b.clone().addScaledVector(a, -dot);
		if (relative.lengthSq() < 1e-10) return a.clone();
		relative.normalize();
		return a.clone().multiplyScalar(Math.cos(theta)).addScaledVector(relative, Math.sin(theta));
	}
	// Same idea, but for two arbitrary (non-unit) camera-position vectors:
	// slerp direction, lerp magnitude. A plain lerpVectors between two
	// camera positions cuts a straight line through 3D space, which for
	// two viewpoints on opposite-ish sides of the sphere can dip toward
	// (or swing past) the far side before curving back -- reading as the
	// camera turning away from the subject even though the look-at target
	// never moved. Sweeping along the great-circle arc between the two
	// viewpoints instead keeps the camera "outside looking in" the whole way.
	function slerpPos(a, b, t) {
		const magA = a.length();
		const magB = b.length();
		const dir = slerpVec(a.clone().normalize(), b.clone().normalize(), t);
		return dir.multiplyScalar(lerp(magA, magB, t));
	}

	// Edge 1 ends and edge 2 begins at the *same point* (the pole), but
	// each edge's own tangent-based up vector is built from a different
	// base vertex (V_START vs V_SECOND) -- at the pole those two tangents
	// are 90 deg apart, so switching from one to the other instantly was
	// a real, visible camera-roll jolt, not just a style issue. Blending
	// the up vector across a short window straddling the crossing (rather
	// than switching at a single instant) fixes it. Both sides of the
	// blend must land on the exact same vector at the crossing (blendT=0
	// on edge 2 must equal blendT=1 on edge 1) or the "fix" just moves the
	// jolt to a mismatched handoff instead of removing it -- an earlier
	// version of this got that pairing wrong (used V_START's tangent as
	// edge 2's starting value instead of V_SECOND's), which read as a
	// smooth rotation in, a snap back, then a smooth rotation out.
	const POLE_BLEND = 0.2; // fraction of each edge's own span, blended right at the pole crossing
	// The single shared crossing value both edges blend to/from. Written
	// out directly (rather than calling greatCircleTangent(V_SECOND, PI/2),
	// which reduces to exactly this) because that function is declared
	// further down this script -- fine under plain JS function hoisting,
	// but the production bundle reordered things such that calling it
	// here threw a "Cannot access before initialization" error at runtime,
	// silently breaking the whole scene mount.
	const UP_AT_POLE = V_SECOND.clone().negate();
	function edge1CameraAt(e1T) {
		const theta = (Math.PI / 2) * e1T;
		const tip = greatCirclePoint(V_START, theta);
		let up = greatCircleTangent(V_START, theta);
		if (e1T > 1 - POLE_BLEND) {
			const blendT = (e1T - (1 - POLE_BLEND)) / POLE_BLEND;
			up = slerpVec(up, UP_AT_POLE, blendT);
		}
		return { tip, up };
	}
	// Edge 2 (POLE -> SECOND): same meridian family, theta running from
	// pole (PI/2) back down to the equator (0) as the edge draws.
	function edge2CameraAt(e2T) {
		const theta = (Math.PI / 2) * (1 - e2T);
		const tip = greatCirclePoint(V_SECOND, theta);
		let up = greatCircleTangent(V_SECOND, theta);
		if (e2T < POLE_BLEND) {
			const blendT = e2T / POLE_BLEND;
			up = slerpVec(UP_AT_POLE, up, blendT);
		}
		return { tip, up };
	}
	// Edge 3 (SECOND -> START): the equator itself -- never passes
	// through a pole, so world "up" is never parallel to the view
	// direction and needs no special tangent-based up vector.
	function edge3CameraAt(e3T) {
		const tip = spherePoint(0, LON_B - LON_B * e3T);
		return { tip, up: new THREE.Vector3(0, 1, 0) };
	}

	function applyRadialCamera(tip, up, dist = EDGE_CAM_DIST) {
		camera.up.copy(up);
		camera.position.copy(tip).multiplyScalar(dist);
		camera.lookAt(tip);
	}

	// --- the "parallel lines meet twice" beat: two great circles through
	// the north/south poles, starting close together at the equator (a
	// zoomed-in section, not the full triangle's 90 deg span) and grown
	// out as a single continuous loop back to their own start — rather
	// than growing symmetrically toward both poles at once, per feedback
	// asking for a close-up, single-direction, full-loop version. Every
	// meridian is a great circle through the poles, so parametrizing
	// directly off the pole axis (rather than switching longitude by hand
	// partway through) keeps the loop continuous with no seam. ---
	const NORTH = new THREE.Vector3(0, 1, 0);
	const PLON_A = 0.5; // a bit past the triangle's own vertices, so the two beats don't visually overlap
	const PLON_B = 0.75; // ~14 deg from PLON_A -- close enough together to read as "parallel," not the triangle's 90 deg
	const Q_A = new THREE.Vector3(Math.cos(PLON_A), 0, Math.sin(PLON_A));
	const Q_B = new THREE.Vector3(Math.cos(PLON_B), 0, Math.sin(PLON_B));
	const Q_MID = new THREE.Vector3().addVectors(Q_A, Q_B).multiplyScalar(0.5).normalize();

	function greatCirclePoint(Q, theta) {
		return new THREE.Vector3().addScaledVector(Q, Math.cos(theta)).addScaledVector(NORTH, Math.sin(theta));
	}
	// Unit tangent along the great circle, in the direction of increasing
	// theta -- always perpendicular to the point itself, so it doubles as
	// a camera "up" vector that never goes parallel to the view direction
	// (which would otherwise happen exactly at the poles).
	function greatCircleTangent(Q, theta) {
		return new THREE.Vector3().addScaledVector(Q, -Math.sin(theta)).addScaledVector(NORTH, Math.cos(theta));
	}
	function greatCircleArcPoints(Q, theta0, theta1, n = SEGMENTS) {
		const pts = [];
		for (let i = 0; i <= n; i++) pts.push(greatCirclePoint(Q, lerp(theta0, theta1, i / n)));
		return pts;
	}
	// Unit tangent along the equator itself, in the direction of increasing
	// longitude -- Q x NORTH reduces to exactly this (both are already
	// orthonormal, so no need to normalize). Used for the "explain" wedges
	// below: the angle each line's own base makes with the equator.
	function equatorTangent(Q) {
		return new THREE.Vector3().crossVectors(Q, NORTH);
	}
	// The two base wedges for the "180 deg, so they should never meet"
	// diagram -- each shows the right angle between heading up the
	// meridian (NORTH; always in-plane at an equator point, since every
	// equator point is perpendicular to the polar axis) and heading along
	// the equator toward the other line, so the two wedges visually meet
	// in the middle the same way ParallelPostulateScene's co-interior
	// angles do.
	const dirExplainAUp = NORTH;
	const dirExplainAAlongEquator = equatorTangent(Q_A); // toward increasing longitude, i.e. toward Q_B
	const dirExplainBUp = NORTH;
	const dirExplainBAlongEquator = equatorTangent(Q_B).negate(); // toward decreasing longitude, i.e. toward Q_A

	// --- fixed camera viewpoints -----------------------------------------
	// Every non-tracking camera move in this scene (see updateScene below)
	// is a sweep between two of these {pos, look} pairs, via slerpPos/
	// slerpVec so the sweep itself doesn't care what the endpoints are.
	// That means each pair can be tweaked independently and rebuilt to see
	// the result -- found by hand with the debug camera (pass debug={true}
	// from the parent, or visit with ?debug=sphere) rather than derived
	// from the geometry, so there's no formula to preserve here.
	const CAM_WIDE = { pos: new THREE.Vector3(2.6, 1.8, 2.6), look: new THREE.Vector3(0.2, 0.3, 0.2) }; // opening establishing shot
	const CAM_TRIANGLE = { pos: new THREE.Vector3(5.65, 3.13, -2.69), look: new THREE.Vector3(0.3, 0.5, 0.3) }; // pulled back to show the whole triangle + 270 deg label
	// 1.3 (only 0.3 above the unit sphere's own surface) was too close --
	// at that range perspective distortion made the two close-together
	// starting meridians look like they crossed in an X instead of
	// running side by side. 1.9 is a still-tight-but-legible distance --
	// this same position also seeds the growth-tracking camera below.
	const CAM_EXPLAIN = { pos: Q_MID.clone().multiplyScalar(1.9).addScaledVector(NORTH, 0.15), look: Q_MID.clone() }; // zoomed to the equator "90+90=180" diagram
	// -----------------------------------------------------------------------

	// --- growth-beat camera: a handful of fixed viewpoints swept through
	// (great-circle arc, not the line-drawing tip) instead of continuously
	// tracking the growing tip -- tracking read as aimless orbiting once
	// the lines got going; a few deliberate stops timed to each caption
	// reads more like a directed flight past the globe. All four look at
	// the sphere's center; only position changes between them. ---
	const GROWTH_CAM_KEYFRAMES = [
		{ t: EXPLAIN_HOLD_END, pos: CAM_EXPLAIN.pos, look: CAM_EXPLAIN.look },
		{ t: NORTH_MEET_END, pos: new THREE.Vector3(5.2, 2.7, 0.2), look: new THREE.Vector3(0, 0, 0) },
		{ t: FAR_EQUATOR_END, pos: new THREE.Vector3(-0.52, 1.4, -5.6), look: new THREE.Vector3(0, 0, 0) },
		{ t: SOUTH_MEET_END, pos: new THREE.Vector3(-1.7, -1.7, -5.3), look: new THREE.Vector3(0, 0, 0) },
		{ t: 1, pos: new THREE.Vector3(5.5, -1, 1.5), look: new THREE.Vector3(0, 0, 0) }
	];
	function growthCameraAt(prog) {
		let i = 0;
		while (i < GROWTH_CAM_KEYFRAMES.length - 1 && prog > GROWTH_CAM_KEYFRAMES[i + 1].t) i++;
		const a = GROWTH_CAM_KEYFRAMES[i];
		const b = GROWTH_CAM_KEYFRAMES[Math.min(i + 1, GROWTH_CAM_KEYFRAMES.length - 1)];
		const span = b.t - a.t;
		const localT = span > 0 ? Math.max(0, Math.min(1, (prog - a.t) / span)) : 0;
		return {
			pos: slerpPos(a.pos, b.pos, localT),
			look: new THREE.Vector3().lerpVectors(a.look, b.look, localT)
		};
	}

	function updateScene(prog) {
		const e1T = remap(prog, WALK_START, EDGE1_END);
		const e2T = remap(prog, EDGE1_END, EDGE2_END);
		const e3T = remap(prog, EDGE2_END, EDGE3_END);
		const sumT = remap(prog, EDGE3_END, SUM_END);
		const growthT = remap(prog, EXPLAIN_HOLD_END, 1);

		// --- camera: track the point currently being drawn (radially, so
		// it's always dead-center and never on the sphere's silhouette)
		// through the triangle walk, pause on the finished triangle, move
		// to and hold on the equator "explain" diagram, then (once the
		// lines start growing) hand off to the great-circle-tracking
		// camera further below. Skipped entirely in debug mode so it
		// doesn't fight the manual OrbitControls on every scroll event --
		// geometry still updates with progress, camera doesn't. ---
		if (!debug && growthT <= 0) {
			const introBlend = remap(prog, 0, WALK_START);
			const holdBlend = remap(prog, EDGE3_END, SUM_END);
			const explainZoomT = remap(prog, BEAT_END, EXPLAIN_END);

			if (prog < WALK_START) {
				const { tip } = edge1CameraAt(0);
				camera.up.set(0, 1, 0);
				camera.position.lerpVectors(CAM_WIDE.pos, tip.clone().multiplyScalar(EDGE_CAM_DIST), introBlend);
				const look = new THREE.Vector3().lerpVectors(CAM_WIDE.look, tip, introBlend);
				camera.lookAt(look);
			} else if (prog <= EDGE1_END) {
				const { tip, up } = edge1CameraAt(e1T);
				applyRadialCamera(tip, up);
			} else if (prog <= EDGE2_END) {
				const { tip, up } = edge2CameraAt(e2T);
				applyRadialCamera(tip, up);
			} else if (prog <= EDGE3_END) {
				const { tip, up } = edge3CameraAt(e3T);
				applyRadialCamera(tip, up);
			} else if (prog <= SUM_END) {
				// Position sweeps along the great-circle arc between the two
				// viewpoints (slerpPos) rather than a straight 3D line --
				// a straight lerp between two points on opposite-ish sides
				// of the sphere visibly swings away from the triangle before
				// curving back, even with the look-at target fixed. Look-at
				// still starts exactly at the edge-3 camera's own target
				// (continuous, no jump) and eases to the triangle's center
				// quickly, rather than swinging independently the whole way.
				const { tip } = edge3CameraAt(1);
				camera.up.set(0, 1, 0);
				camera.position.copy(slerpPos(tip.clone().multiplyScalar(EDGE_CAM_DIST), CAM_TRIANGLE.pos, holdBlend));
				const lookBlend = Math.min(1, holdBlend * 4);
				camera.lookAt(new THREE.Vector3().lerpVectors(tip, CAM_TRIANGLE.look, lookBlend));
			} else if (prog <= BEAT_END) {
				// A pure pause: nothing moves, giving the finished triangle
				// (and its 270 deg label) a beat to sit before we turn to
				// the next idea.
				camera.up.set(0, 1, 0);
				camera.position.copy(CAM_TRIANGLE.pos);
				camera.lookAt(CAM_TRIANGLE.look);
			} else if (prog <= EXPLAIN_END) {
				// Same slerpPos fix as the pull-back into the triangle
				// overview above -- a straight lerp between these two
				// viewpoints happens to swing close past the triangle's own
				// corner en route to the equator, reading as zooming back
				// in on the triangle instead of moving on to the next idea.
				camera.up.set(0, 1, 0);
				camera.position.copy(slerpPos(CAM_TRIANGLE.pos, CAM_EXPLAIN.pos, explainZoomT));
				const look = new THREE.Vector3().lerpVectors(CAM_TRIANGLE.look, CAM_EXPLAIN.look, explainZoomT);
				camera.lookAt(look);
			} else {
				// EXPLAIN_END..EXPLAIN_HOLD_END: hold on the diagram so
				// there's time to read it before the lines start growing.
				camera.up.set(0, 1, 0);
				camera.position.copy(CAM_EXPLAIN.pos);
				camera.lookAt(CAM_EXPLAIN.look);
			}
		}

		// --- edge 1: equator start -> north pole ---
		edge1Mesh.visible = e1T > 0;
		if (e1T > 0) {
			const pts = meridianPoints(LON_A, 0, (Math.PI / 2) * e1T);
			edge1Mesh.geometry.dispose();
			edge1Mesh.geometry = tubeFromPoints(pts);
		}
		// wedge at START, once edge1 has drawn a little and edge3 (closing
		// the loop back to START) exists — shown from EDGE3_END onward,
		// since only then do both of its incident edges exist.
		wedgeStartMesh.visible = e3T > 0;

		// --- edge 2: north pole -> second equator point ---
		edge2Mesh.visible = e1T >= 1 && e2T > 0;
		if (e2T > 0) {
			const pts = meridianPoints(LON_B, Math.PI / 2, Math.PI / 2 - (Math.PI / 2) * e2T);
			edge2Mesh.geometry.dispose();
			edge2Mesh.geometry = tubeFromPoints(pts);
		}
		wedgePoleMesh.visible = e2T > 0;

		// --- edge 3: second equator point -> back to start ---
		edge3Mesh.visible = e2T >= 1 && e3T > 0;
		if (e3T > 0) {
			const pts = equatorPoints(LON_B, LON_B - LON_B * e3T);
			edge3Mesh.geometry.dispose();
			edge3Mesh.geometry = tubeFromPoints(pts);
		}
		wedgeSecondMesh.visible = e3T > 0;

		const wedgeOpacity = Math.min(1, remap(prog, EDGE3_END, EDGE3_END + 0.06) * 1);
		wedgeStartMat.opacity = wedgeOpacity;
		wedgePoleMat.opacity = Math.min(1, remap(prog, EDGE2_END, EDGE2_END + 0.06));
		wedgeSecondMat.opacity = wedgeOpacity;

		sumLabelGroup.visible = sumT > 0;
		sumLabelGroup.children.forEach((c) => {
			if (c.material) c.material.opacity = sumT;
		});

		// --- fade the triangle out, meridians in, as we move to the globe framing ---
		const triangleFadeT = 1 - remap(prog, BEAT_END, EXPLAIN_END);
		for (const m of [edge1Mesh, edge2Mesh, edge3Mesh]) m.material.opacity = triangleFadeT;
		wedgeStartMat.opacity *= triangleFadeT;
		wedgePoleMat.opacity *= triangleFadeT;
		wedgeSecondMat.opacity *= triangleFadeT;
		sumLabelGroup.children.forEach((c) => {
			if (c.material) c.material.opacity *= triangleFadeT;
		});

		// --- the "90 + 90 = 180, so they should never meet" diagram: two
		// right-angle wedges at the equator, fading in as the triangle
		// fades out, held while EXPLAIN_END..EXPLAIN_HOLD_END gives it a
		// moment to read, then fading back out as the lines start growing. ---
		const explainFadeIn = remap(prog, BEAT_END, EXPLAIN_END);
		const explainFadeOut = 1 - remap(prog, EXPLAIN_HOLD_END, EXPLAIN_HOLD_END + 0.03);
		const explainOpacity = explainFadeIn * explainFadeOut;
		explainWedgeAMat.opacity = explainOpacity;
		explainWedgeBMat.opacity = explainOpacity;
		explainLabelGroup.visible = explainOpacity > 0;
		explainLabelGroup.children.forEach((c) => {
			if (c.material) c.material.opacity = explainOpacity;
		});

		// --- two great circles, starting close together at the equator,
		// grown as one continuous loop: north pole (first meeting) ->
		// around the far side -> south pole (second meeting) -> back to
		// the equator near their own start. The camera does NOT track the
		// growing tip here -- it flies through a handful of fixed
		// viewpoints (see GROWTH_CAM_KEYFRAMES), one per caption, which
		// reads as a deliberate flight past the globe rather than an
		// aimless orbit around the growing line. ---
		meridianMat.opacity = growthT > 0 ? 1 : 0;
		meridianAMesh.visible = growthT > 0;
		meridianBMesh.visible = growthT > 0;
		if (growthT > 0) {
			const growthTheta = 2 * Math.PI * growthT;
			meridianAMesh.geometry.dispose();
			meridianAMesh.geometry = tubeFromPoints(greatCircleArcPoints(Q_A, 0, growthTheta, SEGMENTS * 2), 0.012);
			meridianBMesh.geometry.dispose();
			meridianBMesh.geometry = tubeFromPoints(greatCircleArcPoints(Q_B, 0, growthTheta, SEGMENTS * 2), 0.012);

			if (!debug) {
				const { pos, look } = growthCameraAt(prog);
				camera.up.set(0, 1, 0);
				camera.position.copy(pos);
				camera.lookAt(look);
			}
		}
	}

	$effect(() => {
		const p = progress;
		if (scene) updateScene(p);
	});

	onMount(() => {
		scene = new THREE.Scene();
		camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
		camera.position.copy(CAM_TRIANGLE.pos);

		renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
		container.appendChild(renderer.domElement);

		const pmremGenerator = new THREE.PMREMGenerator(renderer);
		const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
		scene.environment = envTexture;
		pmremGenerator.dispose();

		// Lower ambient / stronger directional than a "neutral" lighting
		// setup would use -- a flatter light makes it hard to read the
		// camera orbiting the globe by shading alone; a clearer light/dark
		// gradient across the surface makes the rotation legible.
		scene.add(new THREE.AmbientLight(0xffffff, 0.28));
		const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
		dirLight.position.set(3, 4, 5);
		scene.add(dirLight);

		// Fully opaque, not translucent: this is a real correctness fix, not
		// just a style choice. A transparent sphere material lands in
		// three.js's transparent render queue alongside the edges/wedges/
		// meridians (also transparent, for their own fade in/out), which
		// sorts by a single per-object distance rather than per-pixel depth
		// -- for a curved tube arcing across the globe that produces exactly
		// the "lines show through the sphere" artifact. An opaque sphere
		// renders in the (reliably depth-tested) opaque queue first, so
		// anything behind it is correctly hidden.
		sphereMaterial = new THREE.MeshStandardMaterial({
			color: 0x9a9a94,
			roughness: 0.95,
			metalness: 0
		});
		const sphereMesh = new THREE.Mesh(new THREE.SphereGeometry(R, 48, 32), sphereMaterial);
		scene.add(sphereMesh);
		// Faint lat/long grid so the sphere reads as a surface with
		// orientation, not a flat disc — a wireframe overlay is cheap and
		// avoids needing a texture.
		const gridMat = new THREE.MeshBasicMaterial({ color: activePalette().muted ?? 0x898781, wireframe: true, transparent: true, opacity: 0.14 });
		const gridMesh = new THREE.Mesh(new THREE.SphereGeometry(R * 1.001, 24, 16), gridMat);
		scene.add(gridMesh);

		// Faint equator reference line, always visible once the sphere
		// settles in — orients the reader before the triangle walk starts.
		const equatorMat = new THREE.MeshBasicMaterial({ color: activePalette().muted ?? 0x898781, transparent: true, opacity: 0.35, depthWrite: false });
		const equatorMesh = new THREE.Mesh(tubeFromPoints(equatorPoints(0, Math.PI * 2, 96), 0.006), equatorMat);
		scene.add(equatorMesh);

		const edgeColor = activePalette().textPrimary ?? 0x0b0b0b;
		const edgeMat = () => new THREE.MeshBasicMaterial({ color: edgeColor, transparent: true, opacity: 1, depthWrite: false });
		edge1Mesh = new THREE.Mesh(tubeFromPoints([V_START, V_START]), edgeMat());
		edge2Mesh = new THREE.Mesh(tubeFromPoints([V_POLE, V_POLE]), edgeMat());
		edge3Mesh = new THREE.Mesh(tubeFromPoints([V_SECOND, V_SECOND]), edgeMat());
		scene.add(edge1Mesh, edge2Mesh, edge3Mesh);

		// --- tangent-plane wedges at each of the triangle's vertices ---
		wedgeStartMat = new THREE.MeshBasicMaterial({ color: activePalette().aqua, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
		wedgePoleMat = new THREE.MeshBasicMaterial({ color: activePalette().orange, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
		wedgeSecondMat = new THREE.MeshBasicMaterial({ color: activePalette().violet, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });

		const startWedge = tangentWedgeGeometry(V_START, dirStartAlongMeridian, dirStartAlongEquatorBack, WEDGE_RADIUS);
		wedgeStartMesh = new THREE.Mesh(startWedge.geometry, wedgeStartMat);
		const poleWedge = tangentWedgeGeometry(V_POLE, dirPoleAlongFirstMeridian, dirPoleAlongSecondMeridian, WEDGE_RADIUS);
		wedgePoleMesh = new THREE.Mesh(poleWedge.geometry, wedgePoleMat);
		const secondWedge = tangentWedgeGeometry(V_SECOND, dirSecondAlongMeridian, dirSecondAlongEquatorForward, WEDGE_RADIUS);
		wedgeSecondMesh = new THREE.Mesh(secondWedge.geometry, wedgeSecondMat);
		scene.add(wedgeStartMesh, wedgePoleMesh, wedgeSecondMesh);

		// --- "270°" sum label, a simple sprite so it always faces the camera ---
		sumLabelGroup = new THREE.Group();
		const canvas = document.createElement('canvas');
		canvas.width = 256;
		canvas.height = 96;
		const ctx = canvas.getContext('2d');
		ctx.fillStyle = activePalette().textPrimary ?? '#0b0b0b';
		ctx.font = 'bold 64px system-ui, sans-serif';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText('270°', 128, 52);
		const tex = new THREE.CanvasTexture(canvas);
		const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false });
		const sprite = new THREE.Sprite(spriteMat);
		sprite.scale.set(0.9, 0.34, 1);
		sprite.position.set(0.55, 0.75, 0.55);
		sumLabelGroup.add(sprite);
		sumLabelGroup.visible = false;
		scene.add(sumLabelGroup);

		// --- "90 + 90 = 180" explain diagram: two right-angle wedges at
		// the equator (where the lines are about to start), plus a label
		// -- the flat-geometry reasoning for why these should never meet,
		// right before the scene shows they do. ---
		explainWedgeAMat = new THREE.MeshBasicMaterial({ color: activePalette().aqua, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
		explainWedgeBMat = new THREE.MeshBasicMaterial({ color: activePalette().violet, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
		const explainWedgeA = tangentWedgeGeometry(Q_A, dirExplainAUp, dirExplainAAlongEquator, WEDGE_RADIUS * 0.7);
		const explainWedgeB = tangentWedgeGeometry(Q_B, dirExplainBUp, dirExplainBAlongEquator, WEDGE_RADIUS * 0.7);
		scene.add(new THREE.Mesh(explainWedgeA.geometry, explainWedgeAMat), new THREE.Mesh(explainWedgeB.geometry, explainWedgeBMat));

		explainLabelGroup = new THREE.Group();
		const explainCanvas = document.createElement('canvas');
		explainCanvas.width = 384;
		explainCanvas.height = 96;
		const explainCtx = explainCanvas.getContext('2d');
		explainCtx.fillStyle = activePalette().textPrimary ?? '#0b0b0b';
		explainCtx.font = 'bold 48px system-ui, sans-serif';
		explainCtx.textAlign = 'center';
		explainCtx.textBaseline = 'middle';
		explainCtx.fillText('90° + 90° = 180°', 192, 52);
		const explainTex = new THREE.CanvasTexture(explainCanvas);
		const explainSpriteMat = new THREE.SpriteMaterial({ map: explainTex, transparent: true, opacity: 0, depthWrite: false });
		const explainSprite = new THREE.Sprite(explainSpriteMat);
		explainSprite.scale.set(0.7, 0.175, 1);
		explainSprite.position.copy(Q_MID.clone().multiplyScalar(1.05).addScaledVector(NORTH, 0.24));
		explainLabelGroup.add(explainSprite);
		explainLabelGroup.visible = false;
		scene.add(explainLabelGroup);

		// --- two great circles for the "meet twice" beat ---
		meridianMat = new THREE.MeshBasicMaterial({ color: activePalette().blue, transparent: true, opacity: 0, depthWrite: false });
		meridianAMesh = new THREE.Mesh(tubeFromPoints(greatCircleArcPoints(Q_A, 0, 0.01), 0.012), meridianMat);
		meridianBMesh = new THREE.Mesh(tubeFromPoints(greatCircleArcPoints(Q_B, 0, 0.01), 0.012), meridianMat);
		meridianAMesh.visible = false;
		meridianBMesh.visible = false;
		scene.add(meridianAMesh, meridianBMesh);

		updateScene(progress);

		if (debug) {
			debugControls = new OrbitControls(camera, renderer.domElement);
			debugControls.enableDamping = true;
			const formatDebugReadout = () => {
				const p = camera.position;
				const t = debugControls.target;
				debugReadout =
					`pos:    new THREE.Vector3(${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)})\n` +
					`lookAt: new THREE.Vector3(${t.x.toFixed(2)}, ${t.y.toFixed(2)}, ${t.z.toFixed(2)})`;
			};
			debugControls.addEventListener('change', formatDebugReadout);
			formatDebugReadout();
		}

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
			renderer.dispose();
		};
	});

	// --- on-canvas captions for the parallel-lines beat -- a pattern
	// being tried out here: once the animation is doing something specific
	// (the explain diagram, each meeting/crossing), the blow-by-blow text
	// sits directly over the scene, timed tightly to the geometry, instead
	// of living in the left panel. The left panel keeps only the quieter
	// framing text (see nonEuclideanGeometry.js's last 'sphere' stage). ---
	const CAPTIONS = [
		{
			start: BEAT_END,
			end: EXPLAIN_HOLD_END,
			text: 'Draw two lines perpendicular to the equator. Their base angles add up to 180° — on a flat surface, that guarantees they never meet.'
		},
		{ start: EXPLAIN_HOLD_END, end: NORTH_MEET_END, text: 'But here, they meet — at the north pole.' },
		{ start: NORTH_MEET_END, end: FAR_EQUATOR_END, text: 'Crossing to the far side, they run parallel again at the equator.' },
		{ start: FAR_EQUATOR_END, end: SOUTH_MEET_END, text: 'Then they meet a second time, at the south pole.' },
		{ start: SOUTH_MEET_END, end: 1, text: '...before closing the loop back where they began.' }
	];
	function captionOpacity(start, end, prog) {
		if (prog < start || prog > end) return 0;
		const fade = Math.min(0.15, (end - start) * 0.25) || 0.001;
		return Math.min(remap(prog, start, start + fade), 1 - remap(prog, end - fade, end));
	}
	let captionOpacities = $derived(CAPTIONS.map((c) => captionOpacity(c.start, c.end, progress)));
</script>

<div class="scene-container" bind:this={container}></div>

<div class="caption-overlay">
	{#each CAPTIONS as c, i}
		{#if captionOpacities[i] > 0.01}
			<p class="caption" style="opacity: {captionOpacities[i]}">{c.text}</p>
		{/if}
	{/each}
</div>

{#if debug}
	<pre class="debug-readout">{debugReadout}</pre>
{/if}

<style>
	.scene-container {
		width: 100%;
		height: 100%;
	}
	.scene-container :global(canvas) {
		display: block;
	}
	.caption-overlay {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 12%;
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
	.debug-readout {
		position: absolute;
		top: 1rem;
		left: 1rem;
		margin: 0;
		padding: 0.6rem 0.8rem;
		border-radius: 6px;
		background: rgba(0, 0, 0, 0.75);
		color: #6fffb0;
		font-family: ui-monospace, 'SF Mono', Menlo, monospace;
		font-size: 0.8rem;
		line-height: 1.4;
		white-space: pre;
		pointer-events: none;
		z-index: 10;
	}
</style>
