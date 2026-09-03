// Poincaré-disc geometry, shared by AzimuthalProjectionScene (the narrative's
// hyperbolic beats) and CircleLimitScene (the Escher aside). Pure maths only —
// nothing here touches a canvas — so the two scenes cannot drift apart on what
// a geodesic is while drawing it differently.

/** Screen radius of a point a hyperbolic distance d from the centre. */
export const hypRadial = (d) => Math.tanh(d / 2);

/**
 * A circle of fixed hyperbolic radius p, centred d from the origin. It is
 * still a genuine circle on screen — the model is conformal — and only its
 * size can lie, which is exactly what the narrative uses it to show.
 */
export function hypCircle(d, p) {
	const near = hypRadial(d - p);
	const far = hypRadial(d + p);
	return { c: (near + far) / 2, r: (far - near) / 2 };
}

/**
 * The geodesic through two ideal points on the rim: the circle orthogonal to
 * the boundary, centre sec(h) along the bisector, radius tan(h). Meets the rim
 * at exactly 90° for every pair. Returns null for the limiting case h → π/2 —
 * a diameter, whose radius is infinite and which is drawn as a straight line.
 */
export function hypGeodesic(a, b) {
	const m = (a + b) / 2;
	const h = (b - a) / 2;
	if (Math.abs(Math.cos(h)) < 1e-6) return null; // diameter
	return { cx: Math.cos(m) / Math.cos(h), cy: Math.sin(m) / Math.cos(h), r: Math.abs(Math.tan(h)) };
}

/**
 * Möbius translation z → (z+a)/(1+conj(a)z). It moves the origin to `a` and is
 * an ISOMETRY of the hyperbolic plane — the counterpart of dragging the map's
 * centre earlier in the narrative. Boundary points stay on the boundary, so a
 * geodesic moves by transforming just its two ideal endpoints.
 */
export function mobius(z, a) {
	const nx = z[0] + a[0];
	const ny = z[1] + a[1];
	const cx = 1 + (a[0] * z[0] + a[1] * z[1]);
	const cy = a[0] * z[1] - a[1] * z[0];
	const den = cx * cx + cy * cy || 1;
	return [(nx * cx + ny * cy) / den, (ny * cx - nx * cy) / den];
}

/** Carry an ideal point (given as an angle on the rim) through `mobius`. */
export const shiftAngle = (t, a) => {
	const w = mobius([Math.cos(t), Math.sin(t)], a);
	return Math.atan2(w[1], w[0]);
};

/**
 * The geodesic through point P with tangent direction `phi`, returned as its
 * two ideal endpoint angles.
 *
 * A circle orthogonal to the unit circle has |C|² = 1 + r², so passing through
 * P forces C onto the line C·P = (|P|²+1)/2. Writing C = P + t·n with n normal
 * to the direction pins t down, and the ideal points then satisfy X·C = 1 —
 * i.e. they sit acos(1/|C|) either side of C's own bearing.
 *
 * Returns null when the geodesic is a diameter (n·P = 0, meaning the direction
 * points along P, so the line runs through the origin) — the caller draws that
 * case straight.
 */
export function geodesicThroughPoint(P, phi) {
	const n = [-Math.sin(phi), Math.cos(phi)];
	const np = n[0] * P[0] + n[1] * P[1];
	if (Math.abs(np) < 1e-9) return null; // diameter through the origin
	const t = (1 - (P[0] * P[0] + P[1] * P[1])) / 2 / np;
	const C = [P[0] + t * n[0], P[1] + t * n[1]];
	const mag = Math.hypot(C[0], C[1]);
	if (mag <= 1) return null;
	const g = Math.atan2(C[1], C[0]);
	const psi = Math.acos(1 / mag);
	return { a: g - psi, b: g + psi };
}
