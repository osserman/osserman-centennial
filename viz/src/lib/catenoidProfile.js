// Profile-curve generation shared between ProfileEditor.svelte (which draws
// the 2D r(z) curve and owns the draggable handles) and CatenoidScene.svelte
// (which revolves the same points into a 3D mesh and integrates their area).
// One source of truth for the geometry, not two parallel generators that
// could drift apart.
//
// R (ring radius) and L (half-separation) are parameters, not constants —
// +page.svelte owns them as reactive state so a ?debug=true panel can tune
// them live. GOLDSCHMIDT_LIMIT is the hard ceiling: past L/R ≈ 0.6627, no
// smooth catenoid can connect two rings that far apart relative to their
// radius — it wants to pinch into two flat disks instead — so a later Euler
// solve needs L/R comfortably under this, not just "a valid-looking shape."
export const DEFAULT_R = 1.05;
export const DEFAULT_L = 0.67;
export const GOLDSCHMIDT_LIMIT = 0.6627;
export const PROFILE_SEGMENTS = 40;

function sampleProfile(R, L, radiusAt) {
	const points = [];
	for (let i = 0; i <= PROFILE_SEGMENTS; i++) {
		const z = -L + (2 * L * i) / PROFILE_SEGMENTS;
		points.push({ r: radiusAt(z), z });
	}
	return points;
}

export function cylinderProfile(R, L) {
	return sampleProfile(R, L, () => R);
}

// Piecewise-linear "V" profile: constant radius R at both rings, tapering
// to midR at the midpoint via two straight segments. A fully closed waist
// (midR=0, two cones meeting at a point on the axis) is a normal,
// non-degenerate case for LatheGeometry — same as the tip of a cone.
export function vProfile(R, L, midR) {
	return sampleProfile(R, L, (z) => (z <= 0 ? R + ((midR - R) * (z + L)) / L : midR + ((R - midR) * z) / L));
}

// Smooth profile through (-L,R) -> (-spread,midR) -> (spread,midR) -> (L,R),
// each segment a cubic Hermite curve with Catmull-Rom tangents, parameterized
// directly by z (not by curve arc-length) so r stays a proper function of z —
// required for a valid surface-of-revolution profile (it can't double back).
// spread=0 collapses the two middle control points together, which is a
// valid (if slightly soft-cornered) degenerate case, not the exact V —
// stage 2 uses vProfile directly for the sharp-corner look the spec
// describes; this is only used once the spread handle is unlocked.
export function curveProfile(R, L, midR, spread) {
	const s = Math.max(spread, 0.001); // avoid a zero-length middle segment
	const key = [
		{ z: -L, r: R },
		{ z: -s, r: midR },
		{ z: s, r: midR },
		{ z: L, r: R }
	];
	function rAt(z) {
		let i = 0;
		while (i < key.length - 2 && z > key[i + 1].z) i++;
		const p0 = key[Math.max(0, i - 1)];
		const p1 = key[i];
		const p2 = key[Math.min(key.length - 1, i + 1)];
		const p3 = key[Math.min(key.length - 1, i + 2)];
		const dz = p2.z - p1.z || 1;
		const t = (z - p1.z) / dz;
		const m1 = ((p2.r - p0.r) / (p2.z - p0.z || 1)) * dz;
		const m2 = ((p3.r - p1.r) / (p3.z - p1.z || 1)) * dz;
		const t2 = t * t;
		const t3 = t2 * t;
		const h00 = 2 * t3 - 3 * t2 + 1;
		const h10 = t3 - 2 * t2 + t;
		const h01 = -2 * t3 + 3 * t2;
		const h11 = t3 - t2;
		return h00 * p1.r + h10 * m1 + h01 * p2.r + h11 * m2;
	}
	return sampleProfile(R, L, rAt);
}

// Generic surface-of-revolution area integrator — Simpson's rule over
// Area = 2*pi * integral( r(z) * sqrt(1 + (dr/dz)^2) dz ). Works unchanged
// for any profile (cylinder, V, smooth curve) regardless of R/L, so there's
// one implementation instead of a per-shape formula. Sanity-checked against
// the closed-form cylinder area 2*pi*R*2L.
export function surfaceArea(points) {
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
