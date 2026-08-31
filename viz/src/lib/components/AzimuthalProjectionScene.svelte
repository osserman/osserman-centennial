<script module>
	// Stage boundaries. This is a rebuild of the first (Three.js) attempt at
	// this scene as a native 2D scene: a d3-geo projection rendered to
	// Canvas2D, rather than a hand-rolled 3D globe + custom projection math.
	// That gets three things "for free" that were the hardest parts of the
	// first version to get right: d3.geoPath's built-in antimeridian/pole
	// clipping (no more manually detecting and dropping segments near the
	// antipode singularity), correct rendering of great circles all the way
	// to the projection's edge (same clipping machinery), and versor.js's
	// quaternion-based drag-to-rotate (no gimbal-lock/pole issues, the exact
	// technique from the reference notebook the user linked:
	// https://observablehq.com/@vpascual/draggable-svg-world-map).
	//
	// Per explicit direction, the globe-to-map transition is a *jump cut* for
	// now, not an animated peel/stretch -- that's a separate open design
	// question being explored elsewhere. So there are only 3 stages here,
	// not 5.
	export const ROTATE_END = 0.18; // idle-spinning orthographic globe
	export const TISSOT_END = 0.52; // (post jump-cut) fixed-size distortion circles fade in, hold, fade out
	export const CIRCLES_END = 0.9; // the equator + the two great circles draw themselves
	// Past 1.0: dragEnabled (set by the parent once scrolled fully through,
	// same handoff ParallelPostulateScene uses) opens the drag interaction.
	//
	// A second scripted sequence picks back up once the reader is done
	// exploring: dragging closes, the view eases back to the north pole,
	// the great circles/equator fade out, and a spherical-triangle
	// tessellation grows outward from the pole. DRAG_END is exported so the
	// parent can gate dragEnabled to the [1, DRAG_END) window instead of
	// leaving it on forever.
	export const DRAG_END = 1.35; // free-drag exploration window closes here
	export const RETURN_END = 1.5; // eased back to pole-centered + lines fully faded by here
	//
	// A third act: the Tissot circles and great circles reappear (already
	// fully formed, not re-growing from scratch), and once they're back the
	// projection itself morphs from azimuthal equidistant to stereographic
	// -- same center, same angular bearings, only the radial spacing
	// changes -- before the tessellation takes over.
	export const MORPH_REVEAL_END = 1.65; // circles + great circles fully back by here (still equidistant)
	export const MORPH_END = 2.05; // projection fully morphed to stereographic by here
	export const TESSELLATE_END = 2.4; // tessellation fully grown by here -- the scene's overall max progress
</script>

<script>
	import { onMount } from 'svelte';
	import { geoOrthographic, geoAzimuthalEquidistant, geoProjection, geoPath, geoCircle, geoArea, geoDistance } from 'd3-geo';
	import { pointer } from 'd3-selection';
	import versor from 'versor';
	import { activePalette } from '$lib/palette.js';
	import { coastlines } from '$lib/coastlines.js';

	let { progress = 0, dragEnabled = false, debug = false } = $props();

	function remap(t, lo, hi) {
		return Math.max(0, Math.min(1, (t - lo) / (hi - lo)));
	}
	function smoothstep(t) {
		const x = Math.max(0, Math.min(1, t));
		return x * x * (3 - 2 * x);
	}

	// Equator fades fully in during the first third of the [TISSOT_END,
	// CIRCLES_END] window; the meridians grow during the rest of it.
	const EQUATOR_FADE_END = TISSOT_END + (CIRCLES_END - TISSOT_END) * 0.35;

	// --- morphing between azimuthal equidistant and stereographic. Both are
	// azimuthal projections sharing the exact same angular bearing (theta)
	// at every point -- they differ only in the *radial* profile rho(c),
	// the on-screen distance from center as a function of true angular
	// distance c: equidistant is rho=c (linear); stereographic is
	// rho=2*tan(c/2) (finite everywhere except the antipode itself, where
	// it's genuinely infinite -- the well-known reason stereographic maps
	// can't show a full hemisphere-and-more the way equidistant can).
	// Interpolating that one scalar function linearly between the two forms
	// and reusing the standard "azimuthal raw" x/y formula (see d3-geo's
	// own azimuthal.js, same pattern) gives a continuous morph between them
	// -- verified numerically (round-trip through forward+invert) before
	// wiring in here.
	function rhoAt(c, morphT) {
		return c + (2 * Math.tan(c / 2) - c) * morphT;
	}
	function invertRho(target, morphT) {
		// rho(c) is monotonic increasing on [0,pi) for every morphT in
		// [0,1], so plain bisection suffices -- no closed form exists for
		// the linear blend of two different radial profiles.
		let lo = 0,
			hi = Math.PI - 1e-6;
		for (let i = 0; i < 40; i++) {
			const mid = (lo + hi) / 2;
			if (rhoAt(mid, morphT) < target) lo = mid;
			else hi = mid;
		}
		return (lo + hi) / 2;
	}
	function azimuthalMorphRaw(morphT) {
		const project = (lambda, phi) => {
			const cosPhi = Math.cos(phi),
				sinPhi = Math.sin(phi);
			const cosLambda = Math.cos(lambda),
				sinLambda = Math.sin(lambda);
			const c = Math.acos(Math.max(-1, Math.min(1, cosPhi * cosLambda)));
			const k = c > 1e-9 ? rhoAt(c, morphT) / Math.sin(c) : 1;
			return [k * cosPhi * sinLambda, k * sinPhi];
		};
		// geoProjection wires up .invert() automatically when the raw
		// project function carries one, matching d3-geo's own convention
		// (see azimuthalInvert in its source) -- needed here only for the
		// continent-label visibility check below, since dragging is closed
		// by the time this stage runs.
		project.invert = (x, y) => {
			const z = Math.hypot(x, y);
			const c = invertRho(z, morphT);
			const sc = Math.sin(c),
				cc = Math.cos(c);
			return [Math.atan2(x * sc, z * cc), Math.asin(z ? (y * sc) / z : 0)];
		};
		return project;
	}
	// Interpolated clip angle: equidistant can honestly show almost all the
	// way to the antipode (rho stays finite, ~pi), but stereographic's rho
	// grows without bound approaching it -- a fixed pixel scale would send
	// the edge of the map shooting off past the canvas. Clipping earlier as
	// morphT increases is what real stereographic maps do too (never shown
	// anywhere near a full sphere), not a workaround for a limitation.
	const CLIP_DEG_EQUIDISTANT = 179.8;
	const CLIP_DEG_STEREOGRAPHIC = 150;
	function morphClipDeg(morphT) {
		return CLIP_DEG_EQUIDISTANT + (CLIP_DEG_STEREOGRAPHIC - CLIP_DEG_EQUIDISTANT) * morphT;
	}

	// Land as closed polygons (each ring in coastlines.js is already closed,
	// first point === last) so d3.geoPath can fill them -- solid continents
	// read far more clearly than stroked outlines did in the first version.
	// d3-geo's spherical clipping needs each exterior ring wound so its
	// interior area is the *smaller* of the two regions the ring divides the
	// sphere into; coastlines.js was never checked for this, and some rings
	// came out backwards, which only became visually catastrophic (whole
	// map's fill inverted -- ocean filled, land punched out) for certain
	// rotations, since a wrongly-wound ring's effective "interior" depends
	// on how it interacts with the clip circle at the current rotation.
	// geoArea reports > 2*pi (more than half the sphere) exactly when a ring
	// is wound backwards for a region that's actually small; reverse those.
	const land = {
		type: 'FeatureCollection',
		features: coastlines.map((ring) => {
			let coords = ring.map(([lat, lon]) => [lon, lat]);
			if (geoArea({ type: 'Polygon', coordinates: [coords] }) > 2 * Math.PI) coords = coords.slice().reverse();
			return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [coords] } };
		})
	};

	// Continent labels -- rough, hand-picked label points (not computed
	// polygon centroids; coastlines.js isn't grouped by continent, and a
	// true area-weighted centroid would land in odd places anyway for
	// sprawling/concave shapes like Asia or Oceania). Good enough for "label
	// roughly in the middle of each continent."
	const CONTINENT_LABELS = [
		{ name: 'North America', lon: -100, lat: 45 },
		{ name: 'South America', lon: -60, lat: -15 },
		{ name: 'Europe', lon: 15, lat: 50 },
		{ name: 'Africa', lon: 20, lat: 5 },
		{ name: 'Asia', lon: 90, lat: 45 },
		{ name: 'Oceania', lon: 135, lat: -25 },
		{ name: 'Antarctica', lon: 0, lat: -83 } // near, not at, -90 -- the true pole is the antipode of the default view center, right at the map's edge singularity
	];

	// The same two great circles from SphereGeometryScene, re-expressed as
	// meridians at the same two longitudes (PLON_A/B there, in radians,
	// converted to degrees here). Parameterized by theta (0..2*pi) exactly as
	// greatCirclePoint(Q,theta) there does, but carried a full loop instead
	// of just a half: theta=0 sits at the equator on this longitude, pi/2 is
	// the north pole (this map's center), pi is the equator on the
	// antipodal longitude, 3*pi/2 is the *south* pole -- which, centered on
	// the north pole, is not a point but the map's entire outer boundary
	// circle (every bearing at c=pi is simultaneously "the south pole"; this
	// is the projection's genuine antipodal singularity, the same one
	// clipAngle(179.8) below stops just short of -- so the line will visibly
	// run out to the map's edge and jump to re-enter opposite roughly
	// itself, rather than pass through a single point, since there isn't
	// one to pass through). 2*pi returns to the start.
	const R2D = 180 / Math.PI;
	const PLON_A_DEG = 0.5 * R2D;
	const PLON_B_DEG = 0.75 * R2D;
	function meridianLat(theta) {
		if (theta <= Math.PI / 2) return theta * R2D;
		if (theta <= (3 * Math.PI) / 2) return (Math.PI - theta) * R2D;
		return (theta - 2 * Math.PI) * R2D;
	}
	function meridianLon(theta, lonDeg) {
		return theta > Math.PI / 2 && theta <= (3 * Math.PI) / 2 ? lonDeg + 180 : lonDeg;
	}
	function meridianArc(lonDeg, thetaFraction) {
		const n = 360;
		const thetaMax = Math.PI * 2 * thetaFraction;
		const steps = Math.max(1, Math.round(n * thetaFraction));
		const coords = [];
		for (let i = 0; i <= steps; i++) {
			const theta = (thetaMax * i) / steps;
			coords.push([meridianLon(theta, lonDeg), meridianLat(theta)]);
		}
		return { type: 'Feature', geometry: { type: 'LineString', coordinates: coords } };
	}
	const equatorCircle = geoCircle().center([0, 90]).radius(90).precision(1)();

	// Spherical-triangle tessellation, grown outward from the north pole in
	// the final stage: a "polar UV" mesh -- concentric rings of constant
	// point-count at evenly-spaced colatitudes, fanned to the pole for the
	// innermost ring and zigzag-stitched between consecutive rings
	// otherwise. Triangles get more tangentially elongated the further out
	// they are (constant point count, growing circumference) rather than
	// staying equilateral -- a deliberate simplicity tradeoff over a true
	// geodesic (icosahedral) subdivision, acceptable since the point here is
	// "a tessellation expanding from a point," not uniform triangle size.
	// Built once; each triangle carries a `ring` index used to reveal the
	// mesh outward ring-by-ring as the tessellation stage progresses.
	const TESS_RING_COUNT = 16;
	const TESS_MAX_C_DEG = 140; // stays inside CLIP_DEG_STEREOGRAPHIC (150deg), since the tessellation is drawn on the fully-morphed (stereographic) projection
	const TESS_N = 20; // points per ring (constant)
	function tessRingPoints(ringIndex) {
		const c = (TESS_MAX_C_DEG * (ringIndex + 1)) / TESS_RING_COUNT;
		const lat = 90 - c;
		return Array.from({ length: TESS_N }, (_, j) => [(360 * j) / TESS_N, lat]); // [lon,lat]
	}
	function buildTessellation() {
		const rings = Array.from({ length: TESS_RING_COUNT }, (_, i) => tessRingPoints(i));
		const triangles = [];
		const pole = [0, 90];
		const tri = (ring, a, b, c) => triangles.push({ ring, coords: [a, b, c, a] });
		for (let j = 0; j < TESS_N; j++) tri(0, pole, rings[0][j], rings[0][(j + 1) % TESS_N]);
		for (let i = 0; i < TESS_RING_COUNT - 1; i++) {
			const inner = rings[i],
				outer = rings[i + 1];
			for (let j = 0; j < TESS_N; j++) {
				const a = inner[j],
					b = inner[(j + 1) % TESS_N],
					c = outer[j],
					d = outer[(j + 1) % TESS_N];
				tri(i + 1, a, c, d);
				tri(i + 1, a, d, b);
			}
		}
		return triangles;
	}
	const tessTriangles = buildTessellation();

	// Fixed-size ("Tissot's indicatrix"-style) circles: the same true
	// angular radius on the globe, placed every 10 degrees of latitude down
	// a single reference meridian. Because this projection's distortion
	// depends only on angular distance from the pole (not on longitude),
	// one meridian's worth of circles shows the full range -- genuinely
	// undistorted near the pole (the projection's center), progressively
	// stretched tangentially further out, exactly the shape distortion the
	// map itself is introducing rather than a color standing in for it.
	const TISSOT_LON_DEG = 0;
	const TISSOT_RADIUS_DEG = 3.5;
	const TISSOT_LATS = [90, 80, 70, 60, 50, 40, 30, 20, 10, 0, -10, -20, -30, -40, -50, -60, -70, -80];
	const tissotCircles = TISSOT_LATS.map((lat) => geoCircle().center([TISSOT_LON_DEG, lat]).radius(TISSOT_RADIUS_DEG).precision(2)());

	// --- projection rotation, [lambda, phi, gamma] degrees. Default centers
	// on the north pole: rotate([-lon0,-lat0]) with (lat0,lon0)=(90,0). ---
	let rotate = $state([0, -90, 0]);
	const SPIN_TOTAL_DEG = 200;

	// Separate roll control (gamma, the third Euler angle): spins the map
	// in-plane around whatever point drag has centered, independent of
	// recentering itself -- e.g. drag your city to the middle, then roll
	// until north points up for a locally-familiar view. Deliberately a
	// plain assignment to rotate[2], not routed through versor.js at all:
	// rolling around the already-centered point is just an in-plane
	// rotation, none of the drag's "which point is under the cursor"
	// machinery applies.
	function setRoll(deg) {
		rotate = [rotate[0], rotate[1], deg];
	}

	// --- second scripted sequence: once free-drag exploration closes
	// (progress >= DRAG_END), ease back to the scene's home orientation
	// (north pole centered) rather than leaving the view wherever the
	// reader last dragged it. `rotate` itself is left alone here (it still
	// holds "wherever the reader last dragged to"; dragging is disabled by
	// then anyway) -- the interpolation is a pure function of progress, so
	// scrolling back up mid-return smoothly reverses it instead of jumping.
	const HOME_ROTATE = [0, -90, 0];
	let returnFromRotate = $state(null);
	$effect(() => {
		if (progress >= DRAG_END) {
			if (returnFromRotate === null) returnFromRotate = [...rotate];
		} else if (returnFromRotate !== null) {
			returnFromRotate = null;
		}
	});
	function effectiveRotate(prog) {
		if (prog < DRAG_END || returnFromRotate === null) return rotate;
		const t = smoothstep(remap(prog, DRAG_END, RETURN_END));
		return versor.interpolate(returnFromRotate, HOME_ROTATE)(t);
	}

	let container, canvas, ctx;
	let width = 0,
		height = 0;
	let orthographic, azimuthal;

	function layoutProjections() {
		if (!width || !height) return;
		const cx = width / 2,
			cy = height / 2;
		const k = Math.min(width, height) * 0.42;
		orthographic = geoOrthographic().translate([cx, cy]).scale(k).clipAngle(90);
		azimuthal = geoAzimuthalEquidistant()
			.translate([cx, cy])
			.scale(k / Math.PI)
			.clipAngle(179.8);
	}

	function currentProjection(prog) {
		const flat = prog >= ROTATE_END;
		const [lambda, phi, gamma] = effectiveRotate(prog);
		if (!flat) {
			const spin = SPIN_TOTAL_DEG * remap(prog, 0, ROTATE_END);
			orthographic.rotate([lambda + spin, phi, gamma]);
			return { proj: orthographic, flat: false, morphT: 0 };
		}
		const morphT = smoothstep(remap(prog, MORPH_REVEAL_END, MORPH_END));
		if (morphT <= 0) {
			azimuthal.rotate([lambda, phi, gamma]);
			return { proj: azimuthal, flat: true, morphT: 0 };
		}
		// Rebuilt each frame the morph is active -- geoProjection's
		// constructor is cheap (no heavy precomputation), and this only
		// runs on scroll/drag ticks, not a continuous animation loop.
		const clipDeg = morphClipDeg(morphT);
		const clipRad = (clipDeg * Math.PI) / 180;
		const fixedRadius = Math.min(width, height) * 0.42;
		const k = fixedRadius / rhoAt(clipRad, morphT);
		const proj = geoProjection(azimuthalMorphRaw(morphT))
			.translate([width / 2, height / 2])
			.scale(k)
			.clipAngle(clipDeg)
			.rotate([lambda, phi, gamma]);
		return { proj, flat: true, morphT };
	}

	function render() {
		if (!ctx || !width || !height) return;
		const prog = progress;
		ctx.clearRect(0, 0, width, height);

		const { proj, flat, morphT } = currentProjection(prog);
		const path = geoPath(proj, ctx);
		const liveRotate = effectiveRotate(prog);

		// water backdrop -- the visible disc/hemisphere, same in both stages
		// (mapWater), so the globe-to-map jump cut doesn't also change what
		// "ocean" looks like.
		ctx.beginPath();
		path({ type: 'Sphere' });
		ctx.fillStyle = activePalette().mapWater;
		ctx.fill();

		// land -- each feature gets its own beginPath()/fill(), not one path()
		// call over the whole FeatureCollection. Under clipAngle, every
		// polygon that gets cut by the visible boundary circle has its own
		// synthetic boundary-arc spliced in by d3-geo's spherical clipping;
		// batching multiple such polygons into a single canvas path lets
		// their synthetic loops combine under the nonzero fill rule in a
		// rotation-dependent way, which is exactly what caused the whole
		// map's fill to invert (ocean painted, land punched out) at some
		// rotations but not others.
		ctx.fillStyle = activePalette().mapLand;
		for (const feature of land.features) {
			ctx.beginPath();
			path(feature);
			ctx.fill();
		}

		if (flat) {
			// Tissot circles: fade in, hold, fade out -- a triangular window
			// inside [ROTATE_END, TISSOT_END] rather than a straight ramp, so
			// there's a beat where the reader can actually look at them.
			// They reappear a second time (already fully formed, just fading
			// in rather than re-running the triangular window) once free-drag
			// exploration is done and the great circles are back too.
			const tissotWindow = remap(prog, ROTATE_END, TISSOT_END);
			const tissotFirstReveal = Math.min(smoothstep(remap(tissotWindow, 0, 0.35)), 1 - smoothstep(remap(tissotWindow, 0.65, 1)));
			const tissotSecondReveal = smoothstep(remap(prog, RETURN_END, MORPH_REVEAL_END));
			const tissotOpacity = Math.max(tissotFirstReveal, tissotSecondReveal);
			if (tissotOpacity > 0.01) {
				ctx.globalAlpha = tissotOpacity * 0.85;
				ctx.fillStyle = activePalette().orange;
				ctx.strokeStyle = activePalette().orange;
				ctx.lineWidth = 1.5;
				for (const circle of tissotCircles) {
					ctx.beginPath();
					path(circle);
					ctx.fill();
					ctx.stroke();
				}
				ctx.globalAlpha = 1;
			}

			// Once the reader is done exploring (progress >= DRAG_END), these
			// lines fade out over the window the view eases back to the pole
			// in, then fade back in (already fully formed, not re-growing)
			// once the projection starts its morph to stereographic. A clean
			// max() handoff between the two envelopes -- their domains don't
			// overlap, so there's no double-counting to worry about.
			const fadeOut = 1 - smoothstep(remap(prog, DRAG_END, RETURN_END));
			const fadeBackIn = smoothstep(remap(prog, RETURN_END, MORPH_REVEAL_END));
			const linesVisibility = Math.max(fadeOut, fadeBackIn);
			// The dashed equator fades fully in first, on its own, before the
			// meridians start growing -- two sequential beats instead of
			// everything animating in together.
			const equatorT = smoothstep(remap(prog, TISSOT_END, EQUATOR_FADE_END));
			const growthT = smoothstep(remap(prog, EQUATOR_FADE_END, CIRCLES_END));
			if ((equatorT > 0 || growthT > 0) && linesVisibility > 0.001) {
				ctx.globalAlpha = equatorT * 0.5 * linesVisibility;
				ctx.lineWidth = 1.5;
				ctx.strokeStyle = activePalette().textPrimary ?? '#0b0b0b';
				ctx.setLineDash([4, 4]);
				ctx.beginPath();
				path(equatorCircle);
				ctx.stroke();
				ctx.setLineDash([]);

				ctx.globalAlpha = growthT * linesVisibility;
				ctx.lineWidth = 2.5;
				ctx.strokeStyle = activePalette().blue;
				for (const lonDeg of [PLON_A_DEG, PLON_B_DEG]) {
					ctx.beginPath();
					path(meridianArc(lonDeg, growthT));
					ctx.stroke();
				}

				// Both meridians reach the south pole at the same instant
				// (theta = 3*pi/2, i.e. growthT = 0.75 of the full 2*pi
				// loop) -- but centered on the north pole, the south pole
				// isn't a point on this map, it's the *entire* outer edge.
				// So instead of the lines converging somewhere, ring the
				// map's whole circumference in the same color right as they
				// arrive, showing that every point on that boundary is
				// simultaneously "the south pole."
				// Only true while the map is actually centered on the north
				// pole (phi = -90 of the rotation actually being rendered,
				// which during the return animation is effectiveRotate, not
				// the raw drag target) *and* still (close to) equidistant --
				// under the stereographic morph the antipode maps to
				// infinity, not this artificial clip boundary, so the ring's
				// claim stops being true the moment the morph starts and
				// needs to fade out rather than ride along with it.
				const poleAlignT = 1 - smoothstep(remap(Math.abs(liveRotate[1] + 90), 0, 3));
				const equidistantness = 1 - smoothstep(remap(morphT, 0, 0.08));
				const southPoleT = smoothstep(remap(growthT, 0.74, 0.78)) * poleAlignT * equidistantness;
				if (southPoleT > 0.001) {
					// azimuthal.scale() specifically (not proj.scale()) --
					// the ring's radius only ever means anything relative to
					// the plain equidistant object; equidistantness has
					// already faded it to ~invisible by the time proj is
					// actually the morphed projection.
					ctx.globalAlpha = growthT * southPoleT * linesVisibility;
					ctx.lineWidth = 2.5;
					ctx.strokeStyle = activePalette().blue;
					ctx.beginPath();
					ctx.arc(width / 2, height / 2, azimuthal.scale() * Math.PI, 0, Math.PI * 2);
					ctx.stroke();
				}
				ctx.globalAlpha = 1;
			}

			// Continent labels -- skip any whose label point has rotated
			// past the projection's own visible range (relevant mainly once
			// dragging moves the center away from the pole; centroid-ish
			// points can end up right at the antipodal edge).
			const center = proj.invert([width / 2, height / 2]);
			const clipRad = ((proj.clipAngle() ?? 180) * Math.PI) / 180;
			ctx.font = '600 13px sans-serif';
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			for (const c of CONTINENT_LABELS) {
				if (center && geoDistance([c.lon, c.lat], center) > clipRad) continue;
				const p = proj([c.lon, c.lat]);
				if (!p) continue;
				ctx.lineWidth = 3;
				ctx.strokeStyle = activePalette().surface;
				ctx.globalAlpha = 0.85;
				ctx.strokeText(c.name, p[0], p[1]);
				ctx.fillStyle = activePalette().textPrimary ?? '#0b0b0b';
				ctx.globalAlpha = 0.9;
				ctx.fillText(c.name, p[0], p[1]);
			}
			ctx.globalAlpha = 1;

			// Final stage: once back at the pole and the great circles have
			// cleared, tile the sphere in spherical triangles, ring by ring
			// outward from the pole. Each ring's own triangles ease in
			// (rather than popping in as a block) as the reveal sweeps
			// through them, matching "expanding outward" rather than
			// growing in discrete jumps.
			const tessRingReveal = smoothstep(remap(prog, MORPH_END, TESSELLATE_END)) * TESS_RING_COUNT;
			if (tessRingReveal > 0) {
				ctx.strokeStyle = activePalette().textPrimary ?? '#0b0b0b';
				ctx.lineWidth = 1;
				for (const { ring, coords } of tessTriangles) {
					const t = tessRingReveal - ring;
					if (t <= 0) continue;
					ctx.globalAlpha = 0.55 * Math.min(1, t);
					ctx.beginPath();
					path({ type: 'Polygon', coordinates: [coords] });
					ctx.stroke();
				}
				ctx.globalAlpha = 1;
			}

			if (dragEnabled) {
				const cx = width / 2,
					cy = height / 2;
				ctx.beginPath();
				ctx.arc(cx, cy, 5, 0, Math.PI * 2);
				ctx.fillStyle = activePalette().orange;
				ctx.fill();
			}

			// drag diagnostics: down-pixel (fixed, red), the anchor point's
			// live projected position under the current rotation (should sit
			// exactly under the cursor if the drag math is correct, green),
			// and the actual last-seen cursor pixel (blue) -- if green and
			// blue don't coincide, the anchor isn't tracking the cursor.
			if (debug && debugDrag) {
				const dot = (pt, color, label) => {
					if (!pt || Number.isNaN(pt[0]) || Number.isNaN(pt[1])) return;
					ctx.beginPath();
					ctx.arc(pt[0], pt[1], 9, 0, Math.PI * 2);
					ctx.fillStyle = color;
					ctx.globalAlpha = 0.9;
					ctx.fill();
					ctx.lineWidth = 2;
					ctx.strokeStyle = '#ffffff';
					ctx.stroke();
					ctx.globalAlpha = 1;
					ctx.fillStyle = '#000000';
					ctx.font = '12px sans-serif';
					ctx.fillText(label, pt[0] + 12, pt[1] - 8);
				};
				dot(debugDrag.downPixel, '#e5484d', 'down'); // red: where the drag started
				dot(azimuthal(debugDrag.anchorGeo), '#30a46c', 'anchor'); // green: anchor's live position
				dot(debugDrag.cursorPixel, '#0091ff', 'cursor'); // blue: actual cursor
			}
		}
	}

	$effect(() => {
		// re-render whenever progress, drag state, or size changes
		void progress;
		void dragEnabled;
		void rotate;
		render();
	});

	// --- drag-to-recenter, using versor.js exactly as in the reference
	// notebook: grab the geographic point under the cursor at pointerdown,
	// then on each move compute the quaternion that rotates from that point
	// to wherever the cursor is now (evaluated against the rotation at
	// drag-start), and apply it on top of the starting rotation. Verified
	// numerically (outside the browser, chaining this exact algorithm over
	// many steps and checking the down-point's own projected pixel tracks
	// the cursor's actual pixel exactly) -- including starting a drag at the
	// literal center pixel, which is stable too (an earlier attempt to
	// special-case that as a singularity was based on a mistaken test and
	// actively broke ordinary drags near the center, like grabbing Iceland,
	// by deferring which point got "grabbed" -- removed). ---
	let dragging = false;
	let v0, q0, r0;
	// Diagnostic overlay (see the three dots drawn in render() above) plus
	// console logging -- temporary, for tracking down the reported "grabbed
	// point doesn't follow the cursor" behavior live in the browser, since
	// the same algorithm checks out exactly when run standalone in Node.
	let debugDrag = $state(null);
	function pointerXY(evt) {
		return pointer(evt, canvas);
	}
	function onPointerDown(evt) {
		if (!dragEnabled) return;
		const downPixel = pointerXY(evt);
		const p = azimuthal.invert(downPixel);
		if (!p) return;
		dragging = true;
		v0 = versor.cartesian(p);
		r0 = azimuthal.rotate(); // Euler angles [lambda,phi,gamma] -- degrees
		q0 = versor(r0); // the corresponding quaternion, a *different* value from r0
		if (debug) {
			debugDrag = { downPixel, anchorGeo: p, cursorPixel: downPixel };
			// self-consistency check: forward-projecting the just-inverted point
			// should land back on downPixel exactly. If it doesn't, invert/project
			// disagree with each other right here, before any drag math runs.
			const roundTrip = azimuthal(p);
			console.log('[azimuthal-drag] down', {
				downPixel,
				anchorGeo: p,
				r0,
				roundTrip,
				roundTripMismatchPx: roundTrip ? Math.hypot(roundTrip[0] - downPixel[0], roundTrip[1] - downPixel[1]) : null,
				width,
				height,
				canvasRect: canvas.getBoundingClientRect(),
				dpr: window.devicePixelRatio || 1
			});
		}
		canvas.setPointerCapture(evt.pointerId);
	}
	function onPointerMove(evt) {
		if (!dragging) return;
		azimuthal.rotate(r0);
		const cursorPixel = pointerXY(evt);
		const p = azimuthal.invert(cursorPixel);
		if (!p) return;
		const v1 = versor.cartesian(p);
		const q1 = versor.multiply(q0, versor.delta(v0, v1));
		const nextRotate = versor.rotation(q1);
		azimuthal.rotate(nextRotate);
		rotate = nextRotate;
		if (debug && debugDrag) {
			const anchorNowAt = azimuthal(debugDrag.anchorGeo);
			debugDrag = { ...debugDrag, cursorPixel };
			console.log('[azimuthal-drag] move', {
				cursorPixel,
				cursorGeo: p,
				anchorProjectsTo: anchorNowAt,
				mismatchPx: anchorNowAt ? Math.hypot(anchorNowAt[0] - cursorPixel[0], anchorNowAt[1] - cursorPixel[1]) : null,
				nextRotate
			});
		}
	}
	function onPointerUp(evt) {
		dragging = false;
		// leave debugDrag in place (not nulled) so the markers persist after
		// release for a screenshot -- cleared on the next pointerdown instead
		canvas.releasePointerCapture(evt.pointerId);
	}

	onMount(() => {
		ctx = canvas.getContext('2d');
		const resizeObserver = new ResizeObserver((entries) => {
			const rect = entries[0].contentRect;
			if (rect.width === 0 || rect.height === 0) return;
			width = rect.width;
			height = rect.height;
			const dpr = window.devicePixelRatio || 1;
			canvas.width = width * dpr;
			canvas.height = height * dpr;
			canvas.style.width = `${width}px`;
			canvas.style.height = `${height}px`;
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			layoutProjections();
			render();
		});
		resizeObserver.observe(container);

		canvas.addEventListener('pointerdown', onPointerDown);
		canvas.addEventListener('pointermove', onPointerMove);
		canvas.addEventListener('pointerup', onPointerUp);

		return () => {
			resizeObserver.disconnect();
			canvas.removeEventListener('pointerdown', onPointerDown);
			canvas.removeEventListener('pointermove', onPointerMove);
			canvas.removeEventListener('pointerup', onPointerUp);
		};
	});

	// --- on-canvas captions, same pattern as the rest of this stanza ---
	const CAPTION_DEFAULT_BOTTOM = '12%';
	const ROTATE_MID = ROTATE_END * 0.55;
	const CAPTIONS = [
		{ start: 0, end: ROTATE_MID, text: 'Every flat map distorts a round world somehow.' },
		{
			start: ROTATE_MID,
			end: ROTATE_END,
			text: 'This is the Azimuthal Equidistant projection, centered on the north pole.'
		},
		{
			start: ROTATE_END,
			end: TISSOT_END,
			text: 'Every one of these circles is the same true size on the globe. Watch how differently they land on the flat map.'
		},
		{
			start: TISSOT_END,
			end: CIRCLES_END,
			text: 'The equator, and the same two great circles from before — meeting again at the pole, this map’s exact center.'
		},
		{
			start: CIRCLES_END,
			end: 1,
			text: 'Drag anywhere to re-center the projection there, and watch the whole map reflow.'
		},
		{
			start: DRAG_END,
			end: RETURN_END,
			text: 'Back to the north pole.'
		},
		{
			start: RETURN_END,
			end: MORPH_REVEAL_END,
			text: 'The circles and great circles again — this time watch what happens as the projection itself changes.'
		},
		{
			start: MORPH_REVEAL_END,
			end: MORPH_END,
			text: 'Morphing to the Stereographic projection — same center, same bearings, but a different rule for how distance grows outward.'
		},
		{
			start: MORPH_END,
			end: TESSELLATE_END,
			text: 'Tiling the sphere in spherical triangles, growing outward from the pole.'
		}
	];
	function captionOpacity(start, end, prog) {
		if (prog < start || prog > end) return 0;
		const fade = Math.min(0.15, (end - start) * 0.25) || 0.001;
		return Math.min(remap(prog, start, start + fade), 1 - remap(prog, end - fade, end));
	}
	let captionOpacities = $derived(CAPTIONS.map((c) => captionOpacity(c.start, c.end, progress)));
</script>

<div class="scene-container" bind:this={container}>
	<canvas bind:this={canvas}></canvas>
</div>

<div class="caption-overlay">
	{#each CAPTIONS as c, i}
		{#if captionOpacities[i] > 0.01}
			<p class="caption" style="opacity: {captionOpacities[i]}; bottom: {c.bottom ?? CAPTION_DEFAULT_BOTTOM};">{c.text}</p>
		{/if}
	{/each}
	{#if dragEnabled}
		<p class="caption drag-hint" style="opacity: {1 - captionOpacities.reduce((a, b) => a + b, 0)};">Drag the map to re-center it</p>
	{/if}
</div>

{#if dragEnabled}
	<div class="rotate-control">
		<label>
			Rotate
			<input type="range" min="-180" max="180" step="1" value={rotate[2]} oninput={(e) => setRoll(Number(e.currentTarget.value))} />
		</label>
	</div>
{/if}

{#if debug}
	<pre class="debug-readout">rotate: [{rotate.map((v) => v.toFixed(1)).join(', ')}]</pre>
{/if}

<style>
	.scene-container {
		width: 100%;
		height: 100%;
	}
	.scene-container canvas {
		display: block;
		touch-action: none;
	}
	.caption-overlay {
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
	.drag-hint {
		font-size: 0.85rem;
		color: var(--text-muted);
		background: transparent;
		box-shadow: none;
		backdrop-filter: none;
	}
	.rotate-control {
		position: absolute;
		top: 1rem;
		right: 1rem;
		padding: 0.5rem 0.85rem;
		border-radius: 10px;
		background: color-mix(in srgb, var(--surface-1) 82%, transparent);
		backdrop-filter: blur(6px);
		box-shadow: 0 6px 24px rgba(0, 0, 0, 0.12);
	}
	.rotate-control label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.8rem;
		color: var(--text-muted);
	}
	.rotate-control input[type='range'] {
		width: 8rem;
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
