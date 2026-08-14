// Profile-curve generation shared between ProfileEditor.svelte (which draws
// the 2D r(z) curve and owns the draggable handles) and CatenoidScene.svelte
// (which revolves the same points into a 3D mesh and integrates their area).
// One source of truth for the geometry, not two parallel generators that
// could drift apart.
//
// R (ring radius) and L (half-separation) are parameters (not baked into
// sampleProfile) so CatenoidScene and ProfileEditor can both build from the
// same numbers, even though — after a debug-slider round of tuning — they're
// fixed constants again rather than reactive state (dynamically changing R/L
// after `midR`/`spread` were initialized from the old values caused a real
// bug: a cinch radius from before could end up larger than the new ring
// radius. Fixed values sidestep that entirely, no resync logic needed).
//
// GOLDSCHMIDT_LIMIT (L/R ≈ 0.6627) is a hard mathematical fact, not a rough
// approximation: a catenoid connecting rings of radius R at z=±L requires
// solving c·cosh(L/c) = R for the catenary parameter c, and that equation
// has a real positive solution only when R is at least the minimum of
// c·cosh(L/c) over all c>0 — which works out to exactly L/R ≤ 0.6627. Past
// that ratio there is no catenoid at all connecting the rings (not a
// "stretched" or "zoomed" one — none), and the true area-minimizer is the
// disconnected Goldschmidt solution (two flat disks) instead. L/R = 0.65
// here keeps a later Euler-reveal step landing on an actual catenoid, with
// a small margin under the limit (numerics get sensitive very close to the
// fold, where the two catenary solutions that exist below the limit merge
// into one and then vanish above it).
export const DEFAULT_R = 1;
export const DEFAULT_L = 0.65;
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

function cubicBezier1D(p0, p1, p2, p3, t) {
	const mt = 1 - t;
	return mt * mt * mt * p0 + 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t * p3;
}

// A true symmetric cubic Bezier through (-L,R) -> (-s,m) -> (s,m) -> (L,R) —
// same curve family Figma's "bend" tool produces, constrained here to a
// horizontal-only second handle. Always smooth (one polynomial, no piecewise
// join, so no possibility of the kink or overshoot the earlier Catmull-Rom
// and smootherstep-plateau versions had). z(t) is guaranteed monotonic
// (a Bezier's coordinate function is monotonic whenever its control points
// are themselves ordered along that axis, which -L <= -s <= s <= L always
// is for 0 <= s < L) — required for r to stay a valid function of z.
//
// A Bezier doesn't pass through its middle control points, so `m` (the
// control height) isn't the same as `midR` (the curve's actual value at
// z=0, i.e. its true minimum by symmetry). By symmetry, r(t=0.5) works out
// to (R + 3m)/4 regardless of s — so m is solved backwards from that so the
// vertical handle still directly represents the curve's real low point
// wherever it's dragged, even though the handle itself sits off the curve.
export function curveProfile(R, L, midR, spread) {
	const s = Math.max(0, Math.min(spread, L * 0.98));
	const m = (4 * midR - R) / 3;
	const points = [];
	for (let i = 0; i <= PROFILE_SEGMENTS; i++) {
		const t = i / PROFILE_SEGMENTS;
		const z = cubicBezier1D(-L, -s, s, L, t);
		const r = Math.max(0, cubicBezier1D(R, m, m, R, t));
		points.push({ r, z });
	}
	return points;
}

// Generic surface-of-revolution area — sums the exact lateral area of the
// frustum between each pair of consecutive sampled points. Unlike a
// Simpson's-rule integrator (the previous approach here), this makes no
// assumption that points are evenly spaced in z, so it stays exactly
// correct for curveProfile's Bezier samples (uniform in the curve's own
// parameter t, not in z) without needing a separate resampling step.
// Works unchanged for any profile (cylinder, V, smooth curve) regardless of
// R/L — one implementation, not a per-shape formula. Sanity-checked against
// the closed-form cylinder area 2*pi*R*2L.
export function surfaceArea(points) {
	let area = 0;
	for (let i = 0; i < points.length - 1; i++) {
		const p0 = points[i];
		const p1 = points[i + 1];
		const dz = p1.z - p0.z;
		const dr = p1.r - p0.r;
		const slant = Math.sqrt(dz * dz + dr * dr);
		area += 2 * Math.PI * ((p0.r + p1.r) / 2) * slant;
	}
	return area;
}
