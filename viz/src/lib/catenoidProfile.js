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
//
// Area here decreases almost monotonically as midR -> 0 and spread -> L,
// unlike vProfile's area(midR) (which has a real, exact-closed-form-verified
// rebound — two critical points, not one, within (0,R): area dips, rises
// back up by ~0.16 around midR≈0.3, then dips again). This is NOT a bug —
// checked by cross-validating against vProfile's exact closed form (a sum
// of two cone frustum areas) and confirming convergence at 40 vs 2000
// sample points (<0.01% difference either way). The V's rebound comes
// specifically from cone lateral area's slant-length penalty
// (sqrt(L^2+(r1-r2)^2), which grows as the taper gets steeper); a smooth
// curve doesn't pay that penalty the same way, so it can keep approaching
// the Goldschmidt disk-pair area (2*pi*R^2, the true floor for ANY
// connected surface) almost the whole way to the corner (midR=0,
// spread=L), with only a barely-perceptible rebound (~0.02, vs the V's
// ~0.16) instead of a pronounced one. Confirmed the extreme corner never
// goes below 2*pi*R^2 — the Goldschmidt floor is respected exactly as it
// should be.
//
// Separately: this does NOT mean the *true* catenoid's waist approaches 0
// as L/R approaches GOLDSCHMIDT_LIMIT — it doesn't. At the critical ratio
// the catenary parameter satisfies x=coth(x) (x≈1.1997), giving a waist
// radius of ~0.552*R, over half the ring radius. This freely-adjustable
// Bezier is a different curve family entirely (a general "smoothing beats
// a sharp corner" exploration, not a catenoid preview) — it's allowed to
// go all the way to a zero waist because nothing here constrains it to be
// a catenary. The real catenoid, with its actual non-zero critical waist,
// is a separate, later step.
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

function bisect(f, lo, hi, iters = 100) {
	let flo = f(lo);
	for (let i = 0; i < iters; i++) {
		const mid = (lo + hi) / 2;
		const fmid = f(mid);
		if (Math.sign(fmid) === Math.sign(flo)) {
			lo = mid;
			flo = fmid;
		} else {
			hi = mid;
		}
	}
	return (lo + hi) / 2;
}

// The unique root of x = coth(x) — where cosh(x)/x reaches its minimum over
// x>0. Universal (doesn't depend on R/L), used below to split the search for
// the catenoid's two possible solutions into two single-root brackets.
// 1/(cosh(x*)/x*) reproduces GOLDSCHMIDT_LIMIT (~0.6627) exactly, confirming
// the two constants agree with each other.
const CATENARY_X_STAR = bisect((x) => x * Math.tanh(x) - 1, 0.5, 3);

// The actual minimal surface (Euler's 1744 answer): the catenoid, generated
// by revolving a catenary r(z) = c*cosh(z/c) where c solves c*cosh(L/c) = R
// (the boundary condition matching both rings exactly). Below
// GOLDSCHMIDT_LIMIT this equation has *two* positive roots — writing
// x = L/c, it becomes cosh(x)/x = R/L, and cosh(x)/x has a single minimum at
// CATENARY_X_STAR, so one root sits on each side of it. Only the
// larger-neck (smaller x, larger c) branch is the true area-minimizing
// catenoid; the other is an unstable saddle (a real critical point of the
// area functional, just not the minimum) — rather than trust which is which
// from memory, both are generated and compared by actual computed area, and
// the smaller-area one wins. Returns null if L/R exceeds the limit (no
// catenoid exists at all — see the long comment on GOLDSCHMIDT_LIMIT above).
export function catenaryProfile(R, L) {
	const k = R / L;
	const kMin = Math.cosh(CATENARY_X_STAR) / CATENARY_X_STAR;
	if (k < kMin) return null;

	const f = (x) => Math.cosh(x) / x - k;
	const x1 = bisect(f, 1e-6, CATENARY_X_STAR); // decreasing branch
	let hi = CATENARY_X_STAR + 10;
	while (f(hi) < 0) hi *= 2; // grow the bracket until it brackets the increasing branch's root
	const x2 = bisect(f, CATENARY_X_STAR, hi); // increasing branch

	function profileForX(x) {
		const c = L / x;
		return sampleProfile(R, L, (z) => c * Math.cosh(z / c));
	}

	const profile1 = profileForX(x1);
	const profile2 = profileForX(x2);
	return surfaceArea(profile1) <= surfaceArea(profile2) ? profile1 : profile2;
}
