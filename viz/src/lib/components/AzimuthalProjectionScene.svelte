<script module>
	// Map-projection sequence.
	//
	//   1. [0 .. MERIDIANS_START]  shaded globe, side view, spinning to rest
	//   2. [.. MERIDIANS_END]      12 orange cuts draw in, pole to pole
	//   3. [.. TISSOT_END]         same-size circles down ONE gore's centre
	//   4. [.. SPLIT_START]        brief hold on the finished globe
	//   5. [.. SPLIT_END]          globe tilts to the pole view WHILE it
	//                              shrinks left and the gore map arrives
	//   6. [.. FLATTEN_END]        gores close into azimuthal equidistant;
	//                              the rim becomes the south pole
	//   7. [.. EQUATOR_END]        the equator draws in on both panels
	//   8. [.. ANGLES_END]         all but two adjacent meridians fade;
	//                              right-angle marks at their equator crossings
	//   9. [.. TOUR_END]           recentres on four places Osserman lived
	//  10. past TOUR_END           free rotation (drag either panel)
	//
	// Both panels are driven by ONE geographic view point, so they always
	// show the same place -- verified that the pole-native flat projection
	// and the equator-native globe centre the same (lon,lat) given their
	// respective rotations.
	export const MERIDIANS_START = 0.2;
	export const MERIDIANS_END = 0.36;
	export const TISSOT_END = 0.52;
	export const SPLIT_START = 0.62;
	export const SPLIT_END = 1;
	export const FLATTEN_END = 1.3;
	export const EQUATOR_END = 1.45;
	export const ANGLES_END = 1.7;
	export const TOUR_END = 2.6;
	//  11. [.. DRAG_END]       free rotation
	//  12. [.. RETURN_END]     back to the pole; all twelve meridians return
	//  13. [.. STEREO_END]     morph to stereographic -- shapes become true
	//                          again, but the map runs off the page
	//  14. [.. ZOOM_END]       keep zooming out; the inhabited world dwindles
	//  15. [.. DISC_END]       cut to the Poincare disc: the mirror case --
	//                          an infinite surface inside a finite circle
	//  16. [.. GEODESIC_END]   its straight lines, meeting the rim at 90 deg
	//  17. [.. ARCS_END]       the two geodesics hold, named as arcs
	//  18. [.. POSTULATE_END]  a reference line through the centre, a point off it
	//  19. [.. MANY_END]       many lines through that point that never reach it
	//  20. [.. RECENTRE_END]   the centre slides onto the point; all of them straighten
	export const DRAG_END = 3.0;
	export const RETURN_END = 3.25;
	export const STEREO_END = 3.8;
	export const ZOOM_END = 4.35;
	export const DISC_END = 4.85;
	export const GEODESIC_END = 5.35;
	// The arcs caption used to run on the old centre-shift beat. With that beat
	// repurposed it needs its own window, before the postulate sequence starts.
	export const ARCS_END = 5.75;
	export const POSTULATE_END = 6.2;
	export const MANY_END = 6.6;
	export const RECENTRE_END = 7.2;
	// Exported so the narrative page can pace its scroll by how much text
	// each beat actually carries. The animation spans were tuned for
	// choreography, not for reading time, and the two disagree by ~9x --
	// pacing uniformly would flash the longest captions past the reader.
	export const CAPTIONS = [
		{ start: 0, end: MERIDIANS_START, text: "To see an example, we'll construct a map that shows the whole world (not just one hemisphere at a time) within a single circle." },
		{ start: MERIDIANS_START, end: MERIDIANS_END, text: 'To make this map we start by making cuts from pole to pole — like scoring an orange before peeling it.' },
		{ start: MERIDIANS_END, end: TISSOT_END, text: "As a visual aid - we'll add some equally sized circles on the surface that we'll track as we look at different versions of our map."},
		{ start: TISSOT_END, end: SPLIT_START, text: "Now we unfold the sliced peels up towards the north pole, and press them flat." },
		{ start: SPLIT_START, end: SPLIT_END, text: 'The North Pole is in the center...' },
		{ start: SPLIT_END, end: FLATTEN_END, text: 'We can make a circular map of the world by stretching out each segment to meet each other. Look how increasingly distorted our reference circles are now.' },
		{ start: FLATTEN_END, end: EQUATOR_END, text: 'The whole rim is the south pole. The equator (the blue circle) is spaced halfway from the center of our circular map to the edge.' },
		{
			start: EQUATOR_END,
			end: ANGLES_END,
			text: 'The "parallel lines" from before - now in orange - appear as straight lines, intersecting at the north pole, and both reaching the edge as they "intersect" again at the South Pole.'
		},
		{ start: ANGLES_END, end: TOUR_END, text: 'But these lines - both the equator and "parallel lines" - shift as we rotate the center of the map to some places Osserman spent time.' },
		{ start: TOUR_END, end: DRAG_END, text: 'Now drag either view to put yourself at the center.' },
		{
			start: DRAG_END,
			end: STEREO_END,
			text: "Now that we've explored this view of the world, let's look at a related one."
		},

		{
			start: STEREO_END,
			end: ZOOM_END,
			text: "If we want to make our reference circles circular once again we can achieve that by stretching the map out in all directions. But in doing so our map is no longer finite, as the South Pole moves off the map to infinity."
		},
		// NOTE: there is deliberately no caption for ZOOM_END..DISC_END. That
		// beat's text became the sidebar for the 'a-different-kind-of-map'
		// slide, which is where the stanza splits in two. The beat still needs
		// its scroll, though -- the reader still has to read those words, just
		// in the left panel -- so +page.svelte folds that slide's subtitle into
		// the pacing table at this exact span. Delete this gap without doing
		// that and the beat introducing the Poincare disk loses most of its room.
		{
			start: DISC_END,
			end: GEODESIC_END,
			text: 'Here, instead of reference circles (all of the same size on actual surface) growing as they extend from the center, here they shrink. The outer rim of the circle, instead of representing a pole opposite the center, represents all points that are infinitely far away in the space.'
		},
		{
			start: GEODESIC_END,
			end: ARCS_END,
			text: 'Infinitely long lines in our space appear as arcs, only looking straight when they pass through the center.'
		},
		{
			start: ARCS_END,
			end: POSTULATE_END,
			text: 'One consequence of the parallel postulate: for any line, and a point off that line, there is only one line through that point that will never intersect it, however far both are extended.'
		},
		{
			start: POSTULATE_END,
			end: MANY_END,
			text: 'Here there are many.'
		},
		{
			start: MANY_END,
			end: RECENTRE_END,
			text: 'They might not look straight. But shifting the centre of our map onto that point shows that they are.'
		}
	];

</script>

<script>
	import { onMount } from 'svelte';
	import {
		geoOrthographic,
		geoProjection,
		geoPath,
		geoCircle,
		geoArea,
		geoDistance,
		geoClipAntimeridian
	} from 'd3-geo';
	import { pointer } from 'd3-selection';
	import versor from 'versor';
	import { geoPolarPetalPreclip } from 'radial-petal-projection';
	import { activePalette } from '$lib/palette.js';
	// Poincare-disc maths lives in $lib/hyperbolic.js so the Circle Limit aside
	// can share it rather than keeping a second copy that quietly diverges.
	import {
		hypRadial,
		hypCircle,
		hypGeodesic,
		mobius,
		shiftAngle,
		geodesicThroughPoint
	} from '$lib/hyperbolic.js';
	import { landFeatures } from '$lib/coastlines.js';

	// The stereographic morph's framing knobs, exposed so they can be tuned
	// live from the projection lab. Defaults are the current values.
	let {
		progress = 0,
		dragEnabled = false,
		debug = false,
		// how far out the map is clipped once fully stereographic (deg from
		// the centre). Lower = less of the far hemisphere, so less Antarctica.
		// Must stay ABOVE the deepest land colatitude (175.5) or Antarctica
		// straddles the clip circle and floods (see MIN_LAT in coastlines.js).
		stereoClipDeg = 176,
		// The colatitude held at a fixed place in frame. It eases from
		// ANCHOR_START (Antarctica's coast) to this target ACROSS the morph, so
		// the framing opens out as the shapes deform: at stereoT = 0 it still
		// matches the equidistant stage exactly (no jump), and by the end it
		// has swung round to frame the inhabited north, leaving Antarctica far
		// outside the picture.
		anchorColat = 120,
		// where that anchor sits, as a fraction of the frame radius, during
		// the morph and after the zoom-out. RAISE holdMorph to push Antarctica
		// toward (or past) the rim and show more ocean.
		// 1.10 makes the morph scale-neutral: zoomMorph lands on 1.0, matching
		// the start, so the ride is flat-then-out. Above ~1.10 the scale rises
		// above its starting value, giving a zoom IN before the zoom out -- a
		// visible bounce. Antarctica clears the frame either way, because
		// flatRadius(153.5) alone grows 2.68 -> 8.49 across the morph.
		holdMorph = 1.1,
		// lands the pulled-back scale on 0.22
		holdZoom = 0.2426
	} = $props();

	// Where the framing starts: Antarctica's coast, at the fraction of the
	// frame radius it already occupies on the equidistant map. Fixed, so the
	// pre-frame begins with no jump from the stage before it.
	const ANCHOR_START = 153.5;
	const HOLD_START = 0.853;

	const D2R = Math.PI / 180;

	const remap = (t, lo, hi) => Math.max(0, Math.min(1, (t - lo) / (hi - lo)));
	const smoothstep = (t) => {
		const x = Math.max(0, Math.min(1, t));
		return x * x * (3 - 2 * x);
	};
	const lerp = (a, b, t) => a + (b - a) * t;

	const LOBES = 12;
	const SECTOR_DEG = 360 / LOBES;
	const SECTOR = (2 * Math.PI) / LOBES;
	const SPIN_TOTAL_DEG = 300;

	// Seams sit halfway between lobe centres: 15 deg + 30k.
	const SEAM_LONS = Array.from({ length: LOBES }, (_, k) => 15 + k * SECTOR_DEG);
	// The two lines kept for the right-angle demonstration are full GREAT
	// CIRCLES, not single meridians -- a meridian is only half of one, and
	// the whole point is that each line is closed and meets its neighbour at
	// BOTH poles. A great circle through the poles is the meridian at L plus
	// the one at L+180, and since seams sit every 30 degrees the antipodal
	// half is always itself a seam (15 -> 195, 45 -> 225), so no extra
	// geometry is needed -- just keep four of the twelve.
	const KEPT_CIRCLES = [
		[0, 6], // longitudes 15 and 195
		[1, 7] // longitudes 45 and 225
	];
	const KEPT_SEAMS = KEPT_CIRCLES.flat();
	// Which way each circle's INSIDE lies -- toward its partner. The right
	// angles are drawn in that quadrant so they read the way the parallel
	// lines were introduced on the sphere earlier: the two interior angles
	// with the equator, both square, on the side where the lines are heading
	// before they meet. Marking the outside angles instead would be equally
	// true and say nothing. Derived from the two circles' actual longitudes
	// (shortest signed separation) rather than hard-coded, so it stays right
	// if the chosen pair ever changes.
	const CIRCLE_INWARD = (() => {
		const a = SEAM_LONS[KEPT_CIRCLES[0][0]];
		const b = SEAM_LONS[KEPT_CIRCLES[1][0]];
		const d = Math.sign(((b - a + 540) % 360) - 180);
		return [d, -d];
	})();

	// ---------------------------------------------------------------------
	// The flat panel's projection. r = rho throughout (it is already flat);
	// only the gore WIDTH morphs:
	//
	//   wT = 1  ->  w = sin(rho)/rho   the orange-peel gores
	//   wT = 0  ->  w = 1              azimuthal equidistant (a full disc)
	//
	// Verified: at wT=1 this reproduces geoPolarPetal().profile('gore') to
	// 0.00px, and the twelve gores' coverage of the bounding disc sweeps
	// 40.5% (= 4/pi^2, the equal-area value) up to 99.9% as they close.
	// ---------------------------------------------------------------------
	const goreW = (rho) => (rho < 1e-9 ? 1 : Math.sin(rho) / rho);

	// Radial profile. Equidistant keeps r = rho (true distance from the
	// centre, which is the whole selling point of the map so far).
	// Stereographic swaps it for r = 2*tan(rho/2): shapes come back true
	// (it is conformal) at the cost of distance, and because tan runs away
	// the picture has no outer edge at all.
	const flatRadius = (rho, stereoT) => rho + (2 * Math.tan(rho / 2) - rho) * stereoT;
	function invFlatRadius(target, stereoT) {
		let lo = 0,
			hi = Math.PI - 1e-7;
		for (let i = 0; i < 60; i++) {
			const mid = (lo + hi) / 2;
			if (flatRadius(mid, stereoT) < target) lo = mid;
			else hi = mid;
		}
		return (lo + hi) / 2;
	}
	function petalMorphRaw(wT, stereoT = 0) {
		const forward = (lambda, phi) => {
			const rho = Math.PI / 2 - phi;
			const w = 1 + (goreW(rho) - 1) * wT;
			const l0 = Math.round(lambda / SECTOR) * SECTOR;
			const theta = l0 + (lambda - l0) * w;
			const r = flatRadius(rho, stereoT);
			return [r * Math.cos(theta), r * Math.sin(theta)];
		};
		forward.invert = (x, y) => {
			const rho = invFlatRadius(Math.hypot(x, y), stereoT);
			const w = 1 + (goreW(rho) - 1) * wT;
			const theta = Math.atan2(y, x);
			const l0 = Math.round(theta / SECTOR) * SECTOR;
			return [l0 + (w > 1e-9 ? (theta - l0) / w : 0), Math.PI / 2 - rho];
		};
		return forward;
	}
	// Stereographic must stop short of the antipode (it is at infinity).
	// 172 deg still puts the edge ~9x beyond the framed disc, which is what
	// sells "this keeps going".


	// Once the gores have closed the lobe structure is irrelevant (theta =
	// lambda everywhere), so the flat map is just an ordinary azimuthal
	// projection -- and it can be written EQUATOR-NATIVE, in the standard d3
	// form centred on (0,0).
	//
	// That matters because d3's clipAngle clips a circle around the rotated
	// ORIGIN. Against the pole-native raw (whose centre is the rotated pole,
	// 90 deg away) it clips the wrong region entirely -- which is what cut
	// away the ocean and Antarctica the moment the gores finished closing.
	// Verified this form reproduces the pole-native one to 1e-13 when paired
	// with rotate([-lon,-lat,0]) and no angle offset.
	function flatRawEquatorNative(stereoT) {
		const forward = (lambda, phi) => {
			const cy = Math.cos(phi);
			const cosc = Math.max(-1, Math.min(1, Math.cos(lambda) * cy));
			const c = Math.acos(cosc);
			const k = c < 1e-9 ? 1 : flatRadius(c, stereoT) / Math.sin(c);
			return [k * cy * Math.sin(lambda), k * Math.sin(phi)];
		};
		forward.invert = (x, y) => {
			const r = Math.hypot(x, y);
			const c = invFlatRadius(r, stereoT);
			const sc = Math.sin(c),
				cc = Math.cos(c);
			return [Math.atan2(x * sc, r * cc), r === 0 ? 0 : Math.asin(Math.max(-1, Math.min(1, (y * sc) / r)))];
		};
		return forward;
	}

	// ---------------------------------------------------------------------
	// Geometry
	// ---------------------------------------------------------------------
	function meridianArc(lon, grow = 1) {
		const n = 90;
		const steps = Math.max(1, Math.round(n * grow));
		const coords = [];
		for (let i = 0; i <= steps; i++) coords.push([lon, 90 - (180 * i) / n]);
		return { type: 'LineString', coordinates: coords };
	}
	function parallelLine(lat) {
		const coords = [];
		for (let i = 0; i <= 180; i++) coords.push([-180 + i * 2, lat]);
		return { type: 'LineString', coordinates: coords };
	}
	const equatorLine = parallelLine(0);
	// The south pole, drawn just shy of it. Under this projection the pole is
	// not a point but the outer boundary, so this renders as twelve tiny arcs
	// at the gore tips and opens into the full rim as they close -- the same
	// geometry doing both jobs, with no special-casing.
	// Just inside the clip boundary. At -89.9 it sits exactly ON it and gets
	// dropped, which is why the south-pole ring had gone missing.
	const southRimLine = parallelLine(-89.5);

	// Each seam is drawn as the two gore edges that meet there, one just
	// inside each neighbouring lobe. Drawing it as a single meridian instead
	// renders it on only ONE of the two gores -- round(lambda/sector) sends
	// longitude 15 into the lobe centred on 30, leaving lobe 0's matching
	// edge bare -- which is what made the petal outlines look two-toned.
	const SEAM_EPS = 1e-6;
	const seamEdges = SEAM_LONS.map((lon) => [meridianArc(lon - SEAM_EPS), meridianArc(lon + SEAM_EPS)]);

	// One spherical lune per gore, for the ocean fill. Built around a lobe
	// centre and inset inside both seams for the same rounding reason. The
	// run of points along the bottom keeps the tip/rim well-defined as the
	// gores close.
	function goreLune(centreLon) {
		const a = centreLon - SECTOR_DEG / 2 + SEAM_EPS;
		const b = centreLon + SECTOR_DEG / 2 - SEAM_EPS;
		const n = 60;
		const c = [];
		for (let i = 0; i <= n; i++) c.push([a, 90 - (180 * i) / n]);
		for (let i = 1; i < 20; i++) c.push([a + (b - a) * (i / 20), -90 + 0.05]);
		for (let i = 0; i <= n; i++) c.push([b, -90 + (180 * i) / n]);
		c.push([a, 90]);
		const g = { type: 'Polygon', coordinates: [c] };
		return geoArea(g) > 2 * Math.PI ? { type: 'Polygon', coordinates: [c.slice().reverse()] } : g;
	}
	const goreLunes = Array.from({ length: LOBES }, (_, k) => goreLune(k * SECTOR_DEG));

	const TISSOT_LON = SPIN_TOTAL_DEG;
	const TISSOT_LATS = [75, 60, 45, 30, 15, 0, -15, -30, -45, -60, -75];
	const tissotCircles = TISSOT_LATS.map((lat) => ({
		lat,
		feature: geoCircle().center([TISSOT_LON, lat]).radius(3.5).precision(2)()
	}));

	const CONTINENT_LABELS = [
		{ name: 'North America', lon: -100, lat: 45 },
		{ name: 'South America', lon: -60, lat: -15 },
		{ name: 'Europe', lon: 15, lat: 50 },
		{ name: 'Africa', lon: 20, lat: 5 },
		{ name: 'Asia', lon: 90, lat: 45 },
		{ name: 'Oceania', lon: 135, lat: -25 },
		{ name: 'Antarctica', lon: 0, lat: -83 }
	];

	// Places Osserman lived, visited in order before free rotation opens.
	const TOUR = [
		{ name: 'New York', lon: -73.94, lat: 40.73 },
		{ name: 'Berkeley, California', lon: -122.27, lat: 37.87 },
		{ name: 'Japan', lon: 138.25, lat: 36.2 },
		{ name: 'Rome', lon: 12.5, lat: 41.9 }
	];

	const LARGEST_LAND_SPHERE_FRACTION = Math.max(...landFeatures.map((f) => geoArea(f))) / (4 * Math.PI);

	let container, canvas, ctx;
	let width = $state(0),
		height = $state(0);
	// Set while the reader is dragging; overrides the scripted view point.
	let freeView = $state(null);

	function stageParams(prog) {
		const spinLon = SPIN_TOTAL_DEG * smoothstep(remap(prog, 0, MERIDIANS_START));
		// Tilt and split share one window, so the globe swings to the pole
		// view as it shrinks aside and the gore map comes in.
		const splitT = smoothstep(remap(prog, SPLIT_START, SPLIT_END));
		const tiltLat = 90 * splitT;
		const wT = 1 - smoothstep(remap(prog, SPLIT_END, FLATTEN_END));
		// after the tour: settle back, restore the full set of cuts, then
		// trade equidistance for conformality and let the map run away
		const restoreT = smoothstep(remap(prog, DRAG_END, RETURN_END));
		const stereoT = smoothstep(remap(prog, RETURN_END, STEREO_END));
		const zoomT = smoothstep(remap(prog, STEREO_END, ZOOM_END));
		const discT = smoothstep(remap(prog, ZOOM_END, DISC_END));
		// Each element clears the stage before the next arrives, so the disc is
		// never carrying three separate ideas at once.
		const SETTLE = 0.18;
		// circles: in with the disc, out as the geodesics arrive
		const circlesT =
			smoothstep(remap(prog, ZOOM_END, DISC_END)) * (1 - smoothstep(remap(prog, DISC_END, DISC_END + SETTLE)));
		// The two demonstration geodesics: in, held while the caption names them
		// as arcs, then out -- the postulate sequence draws its own lines and
		// these would only crowd them.
		const geoT =
			smoothstep(remap(prog, DISC_END + SETTLE * 0.5, GEODESIC_END)) *
			(1 - smoothstep(remap(prog, ARCS_END, ARCS_END + SETTLE)));
		// The postulate demonstration. The reference line and the point off it
		// arrive first; then the family of lines through that point that never
		// reach it; then the centre of the map slides onto that point, which is
		// what turns every one of them straight.
		const setupT = smoothstep(remap(prog, ARCS_END, POSTULATE_END));
		const manyT = smoothstep(remap(prog, POSTULATE_END, MANY_END));
		// This IS the old centre-shift beat, no longer a free-standing
		// demonstration but the payoff of the two before it: it is doing work
		// now rather than just showing that the model can move.
		const shiftT = smoothstep(remap(prog, MANY_END, RECENTRE_END));
		const equatorT = smoothstep(remap(prog, FLATTEN_END, EQUATOR_END));
		const focusT = smoothstep(remap(prog, EQUATOR_END, ANGLES_END));
		// The other ten meridians clear out over the FIRST part of this beat
		// rather than the whole of it. Fading them across the entire window meant
		// they were still going as the caption describing what was left had begun
		// to fade too -- so the isolated pair of lines was never actually on
		// screen alongside the sentence about them. focusT still runs the full
		// beat for the right-angle marks, which should arrive later, once there
		// is something uncluttered for them to mark.
		const seamFadeT = smoothstep(remap(prog, EQUATOR_END, lerp(EQUATOR_END, ANGLES_END, 0.4)));
		// The right angles make their point while the view is still; once it
		// starts turning they'd just be clutter riding along, so they go as
		// the tour begins. The two great circles stay.
		const rightAngleT = focusT * (1 - smoothstep(remap(prog, ANGLES_END, ANGLES_END + 0.06)));

		// City tour: each leg travels along a great circle, then holds.
		let viewLon = spinLon,
			viewLat = tiltLat,
			guided = false,
			tourName = '',
			tourNameAlpha = 0;
		if (prog > ANGLES_END) {
			const u = remap(prog, ANGLES_END, TOUR_END);
			const s = Math.min(u * TOUR.length, TOUR.length - 1e-9);
			const i = Math.floor(s);
			const f = s - i;
			const from = i === 0 ? [SPIN_TOTAL_DEG, 90] : [TOUR[i - 1].lon, TOUR[i - 1].lat];
			const to = [TOUR[i].lon, TOUR[i].lat];
			// Component-wise, longitude the short way round -- NOT a great-circle
			// interpolation. Longitude is degenerate at a pole (every meridian
			// meets there), so a great circle leaves the pole already on the
			// destination's meridian: the first leg begins at the north pole,
			// so longitude leapt 300 -> -73.9 in a single frame while latitude
			// had barely moved, and the map appeared to snap round.
			const travel = smoothstep(remap(f, 0, 0.55));
			const dLon = ((to[0] - from[0] + 540) % 360) - 180;
			viewLon = from[0] + dLon * travel;
			viewLat = from[1] + (to[1] - from[1]) * travel;
			tourName = TOUR[i].name;
			tourNameAlpha = smoothstep(remap(f, 0.45, 0.65)) * (1 - smoothstep(remap(f, 0.92, 1)));
			guided = true;
		}
		if (freeView) {
			viewLon = freeView[0];
			viewLat = freeView[1];
			guided = true;
			tourName = '';
			tourNameAlpha = 0;
		}
		// The gore seams only coincide with the geographic meridians while the
		// flat projection is pole-centred -- off the pole its lobe structure is
		// measured in the rotated frame, and the orange cuts would drift off
		// the gore edges. So the flat panel holds at the pole through the tilt
		// and only follows the view once the tour takes over, by which point
		// the globe has caught up with it anyway.
		// Ease back to the pole once free rotation closes, so the stereographic
		// morph starts from the same view the reader already understands.
		if (restoreT > 0) {
			// Interpolate longitude and latitude separately, longitude the short
			// way round. A great-circle interpolation to the pole looks wrong
			// here: longitude is degenerate AT the pole, so the map spins as it
			// arrives and then snaps to the home orientation at the last frame.
			const from = freeView || [viewLon, viewLat];
			let dLon = ((SPIN_TOTAL_DEG - from[0] + 540) % 360) - 180;
			viewLon = from[0] + dLon * restoreT;
			viewLat = from[1] + (90 - from[1]) * restoreT;
			tourName = '';
			tourNameAlpha = 0;
		}
		const globeLat = viewLat;
		const flatLat = restoreT > 0 ? viewLat : guided ? viewLat : 90;
		return {
			viewLon, viewLat, globeLat, flatLat, splitT, wT, equatorT, focusT, seamFadeT, rightAngleT,
			restoreT, stereoT, zoomT, discT, circlesT, geoT, setupT, manyT, shiftT, tourName, tourNameAlpha
		};
	}

	// A seam's opacity: the two kept meridians stay, the rest fade out as the
	// right-angle demonstration takes over.
	// The ten set aside for the right-angle demonstration return afterwards.
	const seamAlpha = (k, focusT, restoreT = 0) =>
		KEPT_SEAMS.includes(k) ? 1 : 1 - focusT * (1 - restoreT);

	// The flat panel needs TWO projections, because the two kinds of geometry
	// need different clipping and no single preclip serves both:
	//
	//  * lines (seam edges, equator, south rim) cross seams and must be SPLIT
	//    at them -- that's geoPolarPetalPreclip, wrapped in the antimeridian
	//    clip exactly as the library's own line preclip is.
	//
	//  * fills must NOT use geoPolarPetalFillPreclip here. That preclip
	//    reconstructs rings by walking a lobe's boundary, and it is only
	//    valid at the true gore width. At intermediate widths a ring that
	//    encircles the pole -- Antarctica -- closes the wrong way round and
	//    comes back as its own COMPLEMENT, flooding the entire disc with
	//    land. Measured: with it, Antarctica covers 100% of both gores and
	//    gaps at every intermediate width; without it, a sane 2%-13% of gore
	//    area, spilling only into the gaps via chords across the cuts.
	//    Those chords are then removed by clipping to the gores on the
	//    canvas, which is exact and width-independent.
	function buildFlat(wT, viewLon, viewLat, scale, cx, cy, stereoT = 0) {
		const base = () =>
			geoProjection(petalMorphRaw(wT, stereoT))
				.scale(scale)
				.translate([cx, cy])
				// centre is read in the rotated frame, so it stays pinned to the
				// raw's own natural centre (its pole); the view moves via rotate
				.center([0, 90])
				.rotate([-viewLon, 90 - viewLat, 0])
				.angle(-90);
		// Once the gores have closed there are no seams to split at, so the
		// petal preclip is unnecessary -- and dropping it frees up clipAngle,
		// which stereographic genuinely needs (the antipode is at infinity).
		if (wT <= 0.02) {
			// Tighten the clip almost at once. Held at 179.9 the meridians run
			// to within a whisker of the antipode, where tan is astronomical --
			// so they shot off the page while the continents had barely moved.
			// Clamping early makes the whole map expand as one piece.
			// The ANGULAR clip stays generous and constant so no polygon ever
			// straddles it (see the note in coastlines.js). What the reader
			// actually sees is bounded on the canvas instead, by a plain
			// circular clip -- exact, and it can tighten freely as the
			// stereographic map runs away without risking the complement bug.
			// CONSTANT, not eased. Easing it down from 179.9 fought the radial
			// growth: the clip shrinks the edge while stereographic expands it,
			// and right at 180 -- where tan is most violent -- the two crossed
			// over. The edge shot to 1.28 frames and then fell back to 1.14,
			// which is the bulge. Holding the clip fixed makes the edge grow
			// monotonically the whole way. The cost is that the equidistant map
			// is cropped at 176 rather than 179.9, about 2% shy of the true
			// antipode -- under the eye's threshold, and the clip can never
			// reach 180 anyway since stereographic sends that point to infinity.
			// 179.9 until the morph actually starts, then the tighter clip.
			//
			// Both parts matter. Easing BETWEEN them mid-morph caused a bulge
			// (the clip shrinks the edge while stereographic expands it, and
			// near 180 tan makes that fight violent). But holding the tight
			// clip during the return caused a worse bug: off the pole,
			// Antarctica's boundary swings out past 176 from the view centre,
			// so it straddles the clip circle and resolves to its complement --
			// flooding the map with land for viewLat 87.5..88.5, right in the
			// middle of the rotation home. At 179.9 nothing straddles at any
			// view latitude.
			//
			// So: switch once, at stereoT = 0, where the only visible change is
			// a 2% sliver at the very rim rather than a moving boundary.
			const clipDeg = stereoT > 0 ? stereoClipDeg : 179.9;
			const proj = geoProjection(flatRawEquatorNative(stereoT))
				.scale(scale)
				.translate([cx, cy])
				.rotate([-viewLon, -viewLat, 0])
				.clipAngle(clipDeg);
			return { proj, fillProj: proj, plain: true, horizonRad: clipDeg * D2R };
		}
		const lineProj = base();
		lineProj.preclip((sink) => geoClipAntimeridian(geoPolarPetalPreclip(LOBES)(sink)));
		return { proj: lineProj, fillProj: base() };
	}

	const buildGlobe = (viewLon, viewLat, scale, cx, cy) =>
		geoOrthographic().scale(scale).translate([cx, cy]).rotate([-viewLon, -viewLat, 0]).clipAngle(90);

	function drawRightAngle(path2, proj, lon, size, inward, visible) {
		if (!visible) return;
		const P = proj([lon, 0]);
		if (!P || Number.isNaN(P[0])) return;
		// North along the meridian, and along the equator TOWARD the other
		// circle -- so the mark occupies the interior angle between the two
		// lines rather than an arbitrary outer quadrant.
		const A = proj([lon, 1.2]);
		const B = proj([lon + 1.2 * inward, 0]);
		if (!A || !B) return;
		const unit = (p, q) => {
			const dx = q[0] - p[0],
				dy = q[1] - p[1];
			const m = Math.hypot(dx, dy) || 1;
			return [dx / m, dy / m];
		};
		const u = unit(P, A);
		const v = unit(P, B);
		ctx.beginPath();
		ctx.moveTo(P[0] + u[0] * size, P[1] + u[1] * size);
		ctx.lineTo(P[0] + (u[0] + v[0]) * size, P[1] + (u[1] + v[1]) * size);
		ctx.lineTo(P[0] + v[0] * size, P[1] + v[1] * size);
		ctx.stroke();
	}

	function drawMap(proj, o) {
		const { radiusPx, flat, alpha, shade, meridianGrow, tissotT, cx, cy, labelAlpha, focusT, seamFadeT, equatorT } = o;
		if (alpha <= 0.01) return;
		const pal = activePalette();
		const path = geoPath(proj, ctx);
		// fills go through their own projection on the flat panel (see buildFlat)
		const fillPath = o.fillProj ? geoPath(o.fillProj, ctx) : path;
		const viewCentre = proj.invert ? proj.invert([cx, cy]) : null;
		const horizon = o.horizonRad ?? (flat ? Math.PI : 90 * D2R);
		const onScreen = (lon, lat) => !viewCentre || geoDistance([lon, lat], viewCentre) <= horizon;

		// ocean
		ctx.globalAlpha = alpha;
		ctx.fillStyle = pal.mapWater;
		if (flat && !o.plain) {
			ctx.strokeStyle = pal.mapWater;
			ctx.lineWidth = 1;
			for (const l of goreLunes) {
				ctx.beginPath();
				fillPath(l);
				ctx.fill();
				ctx.stroke();
			}
		} else {
			ctx.beginPath();
			path({ type: 'Sphere' });
			ctx.fill();
		}

		// land. The guard rejects an impossible result: d3-geo's spherical
		// clipping has a tangency case where a small ring sitting almost
		// exactly on the clip limb resolves to its own COMPLEMENT and emits
		// the whole clip circle, flooding the map. Reproduced with stock
		// geoOrthographic too, and densifying doesn't avoid it. No landmass
		// covers most of a hemisphere, so anything claiming to is the bug.
		// GLOBE ONLY. The bug being guarded against is specific to d3-geo's
		// clipCircle, which only the globe uses (via clipAngle); the flat
		// panel clips at its seams instead and never floods -- swept every
		// rotation and it peaks around 12% coverage.
		//
		// Applying it to the flat panel actively broke things: Antarctica
		// encircles the pole, so under the seam preclip it comes back as a
		// ring in ~17 reconstructed pieces, and summing their signed areas
		// reports more than the whole disc even though the shape is right
		// (its centroid sits ~1px from centre, as a symmetric ring should).
		// The guard then suppressed it, which is why Antarctica was missing
		// from the gores and only appeared once the map finished flattening.
		const floodLimit = Math.PI * radiusPx * radiusPx * Math.max(0.5, LARGEST_LAND_SPHERE_FRACTION * 3);
		ctx.fillStyle = pal.mapLand;
		if (flat && !o.plain) {
			// Confine land to the gores. Each lune covers exactly one lobe and
			// never crosses a seam, so it projects cleanly with no preclip --
			// which makes this clip exact at every gore width, and removes the
			// chords land would otherwise draw across the gaps.
			ctx.save();
			ctx.beginPath();
			for (const l of goreLunes) fillPath(l);
			ctx.clip();
			for (const f of landFeatures) {
				ctx.beginPath();
				fillPath(f);
				ctx.fill();
			}
			ctx.restore();
		} else {
			for (const f of landFeatures) {
				// GLOBE ONLY. On the flat map nothing straddles the clip circle
				// (see MIN_LAT in coastlines.js), so the complement bug can't
				// arise -- and Antarctica's area there is legitimately vast,
				// because it contains the pole and stereographic sends the pole
				// to infinity. Guarding it just deleted Antarctica.
				if (!flat && Math.abs(path.area(f)) > floodLimit) continue;
				ctx.beginPath();
				path(f);
				ctx.fill();
			}
		}

		if (shade > 0.01 && !flat) {
			ctx.save();
			ctx.beginPath();
			path({ type: 'Sphere' });
			ctx.clip();
			// Two CONCENTRIC gradients rather than one offset one. A radial
			// gradient between two circles that don't share a centre is a
			// cone, not a sphere: its falloff isolines bulge into a lobe with
			// a visible edge, which read as a blob sitting on the globe --
			// invisible against a light ocean, glaring against a dark one.
			// Each pass here has its start and end circle on the same centre,
			// so both fall off cleanly.
			const s = shade * alpha;

			// limb darkening: the sphere curving away at its edge
			const limb = ctx.createRadialGradient(cx, cy, radiusPx * 0.5, cx, cy, radiusPx);
			limb.addColorStop(0, 'rgba(0,0,0,0)');
			limb.addColorStop(1, `rgba(0,0,0,${0.4 * s})`);
			ctx.fillStyle = limb;
			ctx.fillRect(cx - radiusPx, cy - radiusPx, radiusPx * 2, radiusPx * 2);

			// highlight: soft, off-centre, but concentric about its own point
			const lx = cx - radiusPx * 0.34,
				ly = cy - radiusPx * 0.36;
			const hi = ctx.createRadialGradient(lx, ly, 0, lx, ly, radiusPx * 1.2);
			hi.addColorStop(0, `rgba(255,255,255,${0.15 * s})`);
			hi.addColorStop(1, 'rgba(255,255,255,0)');
			ctx.fillStyle = hi;
			ctx.fillRect(cx - radiusPx, cy - radiusPx, radiusPx * 2, radiusPx * 2);
			ctx.restore();
		}

		// the cuts
		if (meridianGrow > 0) {
			ctx.strokeStyle = pal.orange;
			ctx.lineWidth = 2;
			for (let k = 0; k < LOBES; k++) {
				const a = alpha * 0.95 * seamAlpha(k, seamFadeT ?? focusT, o.restoreT ?? 0);
				if (a <= 0.01) continue;
				ctx.globalAlpha = a;
				if (flat) {
					for (const edge of seamEdges[k]) {
						ctx.beginPath();
						path(edge);
						ctx.stroke();
					}
				} else {
					ctx.beginPath();
					path(meridianArc(SEAM_LONS[k], meridianGrow));
					ctx.stroke();
				}
			}
		}

		// the south pole -- a rim on the flat map, a point on the globe, so
		// only drawn where it means something
		// The south pole: a finite ring while the map is equidistant, and it
		// flies away to infinity as stereographic takes over.
		// The ring is only the SOUTH POLE while the view is centred on the
		// north pole. Rotate away and the map's edge becomes the antipode of
		// wherever you have moved to, so the ring stops meaning what the
		// caption says it means -- it fades out with the tilt as well as with
		// the stereographic morph.
		const poleAlign = 1 - smoothstep(remap(Math.abs(90 - (o.viewLat ?? 90)), 0, 8));
		const rimAlpha = (1 - smoothstep(remap(o.stereoT ?? 0, 0, 0.02))) * poleAlign;
		if (flat && meridianGrow > 0 && rimAlpha > 0.01) {
			ctx.strokeStyle = pal.orange;
			ctx.lineWidth = 2;
			ctx.globalAlpha = alpha * 0.95 * rimAlpha;
			ctx.beginPath();
			if (o.plain && o.edgePx) {
				// Draw the ring at the map's ACTUAL edge, in screen space.
				// As a geographic parallel it sat at colatitude 179.5 while the
				// clip runs to 179.9 -- and Antarctica, which contains the pole,
				// fills everything from its coastline out to that clip. So the
				// ring appeared as a circle sitting INSIDE a band of Antarctica
				// rather than bounding the map.
				ctx.arc(cx, cy, o.edgePx, 0, Math.PI * 2);
			} else {
				path(southRimLine);
			}
			ctx.stroke();
		}

		// the equator
		if (equatorT > 0.01) {
			ctx.strokeStyle = pal.blue;
			ctx.lineWidth = 2;
			ctx.globalAlpha = alpha * equatorT * 0.95;
			ctx.beginPath();
			path(equatorLine);
			ctx.stroke();
		}

		// Right angles wherever a kept great circle crosses the equator. Each
		// circle crosses twice (once per half), so there are four in all --
		// the globe hides whichever are round the back on its own.
		if (o.rightAngleT > 0.01 && equatorT > 0.5) {
			ctx.strokeStyle = pal.blue;
			ctx.lineWidth = 2;
			ctx.globalAlpha = alpha * o.rightAngleT;
			KEPT_CIRCLES.forEach((circle, ci) => {
				for (const k of circle) {
					drawRightAngle(
						path,
						proj,
						SEAM_LONS[k],
						Math.max(7, radiusPx * 0.035),
						CIRCLE_INWARD[ci],
						onScreen(SEAM_LONS[k], 0)
					);
				}
			});
		}

		// equal-size circles
		if (tissotT > 0) {
			ctx.fillStyle = pal.orange;
			ctx.strokeStyle = pal.orange;
			ctx.lineWidth = 1.25;
			for (const { lat, feature } of tissotCircles) {
				const delay = (Math.abs(lat) / 75) * 0.45;
				const a = smoothstep(remap(tissotT, delay, delay + 0.55));
				if (a <= 0.01) continue;
				ctx.globalAlpha = alpha * a * 0.55;
				ctx.beginPath();
				path(feature);
				ctx.fill();
				ctx.globalAlpha = alpha * a * 0.95;
				ctx.stroke();
			}
		}

		// outline: the globe's own limb only -- the flat map's edge is the
		// south pole rim drawn above
		if (!flat) {
			ctx.strokeStyle = pal.textPrimary ?? '#0b0b0b';
			ctx.globalAlpha = alpha * 0.45;
			ctx.lineWidth = 1;
			ctx.beginPath();
			path({ type: 'Sphere' });
			ctx.stroke();
		}

		// The point the projection is currently centred on. Both panels are
		// azimuthal about the same place, so this is literally the panel
		// centre in each -- it marks the same spot on the globe and on the
		// map, which is what ties the two together while the view moves.
		if ((o.centreDot ?? 0) > 0.01) {
			// Aqua, not orange. The cuts and the Tissot circles are already
			// orange and the equator and right angles are blue; aqua is the
			// only free hue well clear of both (54 deg from blue, 142 from
			// orange -- violet and yellow each collide with one of them). The
			// surface-coloured ring is the same halo trick the labels use, so
			// it stays legible over land, ocean or a line.
			const r = Math.max(4, radiusPx * 0.022);
			ctx.globalAlpha = alpha * o.centreDot;
			ctx.beginPath();
			ctx.arc(cx, cy, r, 0, Math.PI * 2);
			ctx.fillStyle = pal.aqua;
			ctx.fill();
			ctx.lineWidth = 2;
			ctx.strokeStyle = pal.surface;
			ctx.stroke();
		}

		if (labelAlpha > 0.01) {
			// Scale the type with the map itself, so the labels stay pinned to
			// their continents and dwindle along with them -- unreadable by the
			// time the map has run away, which is the point of the beat.
			const labelPx = Math.max(3, radiusPx * 0.045 * (o.labelScale ?? 1));
			ctx.font = `600 ${labelPx.toFixed(1)}px sans-serif`;
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			for (const c of CONTINENT_LABELS) {
				if (!onScreen(c.lon, c.lat)) continue;
				const p = proj([c.lon, c.lat]);
				if (!p || Number.isNaN(p[0])) continue;
				ctx.lineWidth = Math.max(1, labelPx * 0.22);
				ctx.strokeStyle = pal.surface;
				ctx.globalAlpha = alpha * labelAlpha * 0.85;
				ctx.strokeText(c.name, p[0], p[1]);
				ctx.fillStyle = pal.textPrimary ?? '#0b0b0b';
				ctx.globalAlpha = alpha * labelAlpha * 0.9;
				ctx.fillText(c.name, p[0], p[1]);
			}
		}
		ctx.globalAlpha = 1;
	}

	// ---------------------------------------------------------------------
	// The Poincare disc. NOT a projection of the sphere -- a different space
	// entirely, and the mirror of the stereographic case: stereographic puts
	// a FINITE surface onto an INFINITE sheet, this puts an INFINITE surface
	// inside a FINITE circle.
	//
	// Radial map r = tanh(d/2). tanh saturates at 1, so however far you walk
	// the rim only creeps closer -- it is infinitely far away, and is not
	// part of the space.
	// ---------------------------------------------------------------------

	// The point off the line, and the directions of the lines drawn through it.
	// Both chosen against the geometry rather than by eye: with the reference
	// line as the horizontal diameter, a geodesic through P misses it exactly
	// when both of P's ideal endpoints stay in the upper arc, which holds for
	// directions between about -48 and +39 degrees. These five sit inside that
	// window with at least 6 degrees of clearance at the tightest.
	const POSTULATE_P = [0.1, 0.4];
	const POSTULATE_DIRS = [-42, -25, -8, 10, 30].map((d) => (d * Math.PI) / 180);

	function drawPoincare(cx, cy, R, o) {
		const { alpha, circlesT, geoT, setupT, manyT, shiftT } = o;
		if (alpha <= 0.01) return;
		const pal = activePalette();
		// The centre slides onto P itself, rather than to an arbitrary offset:
		// mobius(z, -P) sends P to 0, so at shiftT = 1 every line through P is a
		// line through the centre -- and lines through the centre are the ones
		// this model draws straight. That is the whole argument of the beat.
		const a = [-POSTULATE_P[0] * shiftT, -POSTULATE_P[1] * shiftT];

		ctx.globalAlpha = alpha;
		ctx.beginPath();
		ctx.arc(cx, cy, R, 0, Math.PI * 2);
		ctx.fillStyle = pal.mapWater;
		ctx.fill();

		// Everything inside the disc is clipped to it: the disc IS the world,
		// and the parts of a geodesic's circle lying outside are not in the
		// space at all.
		ctx.save();
		ctx.beginPath();
		ctx.arc(cx, cy, R, 0, Math.PI * 2);
		ctx.clip();

		// equal-sized circles marching out along ONE direction
		const P = 0.42,
			STEPS = 10;
		for (let i = 1; i <= STEPS; i++) {
			const reveal = smoothstep(remap(circlesT, (i - 1) / (STEPS + 2), (i + 1) / (STEPS + 2)));
			if (reveal <= 0.01) continue;
			const d = 0.55 + (i - 1) * 0.72;
			// step out along a ray, then carry the centre through the shift
			const base = Math.tanh(d / 2);
			const w = mobius([base * Math.cos(-Math.PI / 2), base * Math.sin(-Math.PI / 2)], a);
			const mag = Math.min(0.999999, Math.hypot(w[0], w[1]));
			const dd = 2 * Math.atanh(mag),
				ang = Math.atan2(w[1], w[0]);
			const near = Math.tanh((dd - P) / 2),
				far = Math.tanh((dd + P) / 2);
			const c = ((near + far) / 2) * R,
				rr = ((far - near) / 2) * R;
			if (rr < 0.4) continue;
			ctx.beginPath();
			ctx.arc(cx + c * Math.cos(ang), cy + c * Math.sin(ang), rr, 0, Math.PI * 2);
			ctx.fillStyle = pal.orange;
			ctx.globalAlpha = alpha * reveal * 0.32;
			ctx.fill();
			ctx.strokeStyle = pal.orange;
			ctx.lineWidth = 1.1;
			ctx.globalAlpha = alpha * reveal * 0.9;
			ctx.stroke();
		}

		// the straight lines of this world
		if (geoT > 0.01) {
			ctx.strokeStyle = pal.blue;
			ctx.lineWidth = 2;
			ctx.globalAlpha = alpha * geoT;
			for (const [p0, p1] of [
				[0.5, 2.4],
				[2.9, 4.9]
			]) {
				drawGeodesic(cx, cy, R, shiftAngle(p0, a), shiftAngle(p1, a), shiftT < 0.02);
			}
			// through the centre: the limiting case of the same construction,
			// drawn straight -- exactly as on the map
			if (geoT > 0.45) {
				ctx.globalAlpha = alpha * smoothstep(remap(geoT, 0.45, 0.8));
				drawGeodesic(cx, cy, R, shiftAngle(0, a), shiftAngle(Math.PI, a), false);
			}
		}

		// --- the parallel postulate, put to the test -------------------------
		// The reference line is the horizontal diameter, so it starts out drawn
		// straight; the marked point sits off it.
		if (setupT > 0.01) {
			ctx.strokeStyle = pal.blue;
			ctx.lineWidth = 2.4;
			ctx.globalAlpha = alpha * setupT;
			drawGeodesic(cx, cy, R, shiftAngle(0, a), shiftAngle(Math.PI, a), false);
		}

		// Lines through P that never reach it. A geodesic misses another exactly
		// when their ideal endpoints do not interleave on the rim -- here, when
		// both of its own ends stay in the upper arc. Euclid's plane allows one
		// such line; this one allows a family, and the family is the point.
		if (manyT > 0.01) {
			ctx.strokeStyle = pal.orange;
			ctx.lineWidth = 2;
			POSTULATE_DIRS.forEach((phi, i) => {
				const reveal = smoothstep(remap(manyT, i / (POSTULATE_DIRS.length + 1), (i + 2) / (POSTULATE_DIRS.length + 1)));
				if (reveal <= 0.01) return;
				const g = geodesicThroughPoint(POSTULATE_P, phi);
				if (!g) return;
				ctx.globalAlpha = alpha * reveal * 0.9;
				drawGeodesic(cx, cy, R, shiftAngle(g.a, a), shiftAngle(g.b, a), false);
			});
		}

		// The point itself, drawn last of the three so neither line crosses over
		// it. It rides the shift like everything else, ending at the centre.
		if (setupT > 0.01) {
			const w = mobius(POSTULATE_P, a);
			const pr = Math.max(4, R * 0.022);
			ctx.globalAlpha = alpha * setupT;
			ctx.beginPath();
			ctx.arc(cx + w[0] * R, cy + w[1] * R, pr, 0, Math.PI * 2);
			ctx.fillStyle = pal.aqua;
			ctx.fill();
			ctx.lineWidth = 2;
			ctx.strokeStyle = pal.surface;
			ctx.stroke();
		}

		ctx.restore();

		// rim last, so it sits above everything
		ctx.beginPath();
		ctx.arc(cx, cy, R, 0, Math.PI * 2);
		ctx.strokeStyle = pal.textPrimary ?? '#0b0b0b';
		ctx.lineWidth = 2;
		ctx.globalAlpha = alpha * 0.75;
		ctx.stroke();
		ctx.globalAlpha = 1;
	}

	// Panel layout, shared by render() and the drag hit-test.
	function layout(splitT) {
		const fullR = Math.min(width, height) * 0.42;
		const goreR = Math.min(width * 0.32, height * 0.44);
		return {
			goreR,
			globeR: lerp(fullR, goreR * 0.36, splitT),
			globeX: lerp(width / 2, width * 0.14, splitT),
			goreX: width * 0.62,
			cy: height / 2
		};
	}

	function render() {
		if (!ctx || !width || !height) return;
		const prog = progress;
		const pal = activePalette();
		const { viewLon, globeLat, flatLat, splitT, wT, equatorT, focusT, seamFadeT, rightAngleT, restoreT, stereoT, zoomT, discT, circlesT, geoT, setupT, manyT, shiftT, tourName, tourNameAlpha } = stageParams(prog);
		const meridianGrow = smoothstep(remap(prog, MERIDIANS_START, MERIDIANS_END));
		const tissotT = smoothstep(remap(prog, MERIDIANS_END, TISSOT_END));
		const { goreR, globeR, globeX, goreX, cy } = layout(splitT);
		// Once the map starts running off the page the globe has said its
		// piece, so it steps aside and the map takes the centre.
		const soloT = smoothstep(remap(prog, DRAG_END, RETURN_END));
		const flatX = lerp(goreX, width / 2, soloT);
		const flatR = lerp(goreR, Math.min(width, height) * 0.42, soloT);
		// Hold the scale fixed through the stereographic morph so the map
		// visibly bursts its frame, then pull back until it fits again --
		// by which point the inhabited world is a speck.
		const stereoEdge = flatRadius((stereoT > 0 ? stereoClipDeg : 179.9) * D2R, stereoT);
		// Anchor the framing to Antarctica's northern coast, holding it at a
		// fixed fraction of the frame radius.
		//
		// At a fixed scale, stereographic magnifies the antipodal region
		// enormously while the centre barely moves, so the morph reads as
		// "Antarctica inflating" rather than "shapes changing" -- Antarctica
		// drove the whole transition. Pinning it still inverts that: the
		// composition holds, the map edge grows past 5x the frame (it floods),
		// and what visibly changes is the shapes, which is the point of the
		// beat. The continents compress toward the centre, which is exactly
		// what stereographic does to the near side.
		//
		// HOLD_MORPH is where Antarctica already sits on the equidistant map,
		// so the framing is continuous with the stage before it.
		// Interpolate the SCALE between its endpoints, rather than
		// interpolating the anchor and hold and deriving the scale each frame.
		// Doing the latter is not monotonic -- anchor, hold and flatRadius all
		// move at once, and the product dipped to 0.87 around a third of the
		// way in before climbing to 1.18, which is the bounce-out-then-in.
		// The anchor/hold knobs now define the two ENDPOINTS; everything
		// between is a straight ride.
		const zoomStart = (HOLD_START * Math.PI) / flatRadius(ANCHOR_START * D2R, 0);
		const zoomMorph = (holdMorph * Math.PI) / flatRadius(anchorColat * D2R, 1);
		const zoomBack = (holdZoom * Math.PI) / flatRadius(anchorColat * D2R, 1);
		const zoomMul = lerp(lerp(zoomStart, zoomMorph, stereoT), zoomBack, zoomT);
		const flatScale = (flatR / Math.PI) * zoomMul;
		const flatAlpha = (1 - discT) * (splitT > 0 ? 1 : 0);
		// The centre marker arrives with the tour, when where-we-are-centred
		// starts changing and therefore starts mattering.
		const centreDot = smoothstep(remap(prog, ANGLES_END, ANGLES_END + 0.08));

		ctx.clearRect(0, 0, width, height);

		drawMap(buildGlobe(viewLon, globeLat, globeR, globeX, cy), {
			radiusPx: globeR,
			flat: false,
			alpha: Math.max(0, 1 - soloT - discT),
			shade: 1,
			meridianGrow,
			tissotT,
			cx: globeX,
			cy,
			labelAlpha: 1 - smoothstep(remap(splitT, 0.15, 0.5)),
			focusT,
			seamFadeT,
			equatorT,
			rightAngleT,
			restoreT,
			centreDot
		});

		const goreAlpha = smoothstep(remap(splitT, 0.35, 0.85)) * flatAlpha;
		if (goreAlpha > 0.01) {
			const flatPair = buildFlat(wT, viewLon, flatLat, flatScale, flatX, cy, stereoT);
			drawMap(flatPair.proj, {
				fillProj: flatPair.fillProj,
				plain: flatPair.plain,
				horizonRad: flatPair.horizonRad,
				edgePx: flatPair.horizonRad ? flatRadius(flatPair.horizonRad, stereoT) * flatScale : 0,
				radiusPx: flatR,
				flat: true,
				alpha: goreAlpha,
				shade: 0,
				meridianGrow,
				tissotT,
				cx: flatX,
				cy,
				// stay on through the morph and the pull-back; they only go when
				// the Poincare disc replaces the map
				labelAlpha: goreAlpha * (1 - discT),
				labelScale: zoomMul,
				focusT,
				seamFadeT,
				equatorT,
				rightAngleT,
				restoreT,
				stereoT,
				viewLat: flatLat,
				centreDot
			});
		}

		// the mirror case
		if (discT > 0.01) {
			drawPoincare(width / 2, cy, Math.min(width, height) * 0.42, {
				alpha: discT,
				circlesT,
				geoT,
				setupT,
				manyT,
				shiftT
			});
		}

		if (tourNameAlpha > 0.01) {
			ctx.globalAlpha = tourNameAlpha;
			ctx.fillStyle = pal.textPrimary ?? '#0b0b0b';
			ctx.font = '600 1.1rem sans-serif';
			ctx.textAlign = 'center';
			ctx.textBaseline = 'top';
			ctx.fillText(tourName, width / 2, height * 0.06);
			ctx.globalAlpha = 1;
		}

		if (debug) {
			ctx.fillStyle = pal.textPrimary;
			ctx.globalAlpha = 0.75;
			ctx.font = '11px ui-monospace, monospace';
			ctx.textAlign = 'left';
			ctx.textBaseline = 'alphabetic';
			ctx.fillText(
				`prog ${prog.toFixed(3)}  view ${viewLon.toFixed(1)},${globeLat.toFixed(1)}  split ${splitT.toFixed(2)}  wT ${wT.toFixed(2)}  eq ${equatorT.toFixed(2)}  focus ${focusT.toFixed(2)}${freeView ? '  [free]' : ''}`,
				12,
				18
			);
			ctx.globalAlpha = 1;
		}
	}

	$effect(() => {
		void progress;
		void width;
		void height;
		void freeView;
		render();
	});

	// --- free rotation. versor's quaternion drag, so the grabbed point
	// tracks the cursor without the instability a naive lat/lon delta hits
	// near the poles. Whichever panel is grabbed drives the shared view
	// point, so both stay locked together. ---
	let dragging = false;
	let v0, q0, r0, dragProj, dragIsFlat, dragFlatPoleNative;
	const canDrag = $derived((dragEnabled || progress >= TOUR_END) && progress < DRAG_END);

	function panelAt(x, y) {
		const { splitT } = stageParams(progress);
		const { goreR, globeR, globeX, goreX, cy } = layout(splitT);
		// match render()'s solo shift, or the hit target sits where the map
		// used to be rather than where it is
		const soloT = smoothstep(remap(progress, DRAG_END, RETURN_END));
		const flatX = lerp(goreX, width / 2, soloT);
		const flatR = lerp(goreR, Math.min(width, height) * 0.42, soloT);
		if (Math.hypot(x - flatX, y - cy) <= flatR * 1.05) return 'flat';
		if (Math.hypot(x - globeX, y - cy) <= globeR * 1.05) return 'globe';
		return null;
	}

	function onPointerDown(evt) {
		if (!canDrag) return;
		const [x, y] = pointer(evt, canvas);
		const which = panelAt(x, y);
		if (!which) return;
		const { viewLon, globeLat, flatLat, splitT, wT, stereoT, zoomT } = stageParams(progress);
		const { goreR, globeR, globeX, goreX, cy } = layout(splitT);
		// Rebuild the SAME projection render() is drawing -- including the
		// solo shift and the zoom. Grabbing through a projection built at a
		// different scale or position would mean the point under the cursor
		// was never the point being dragged.
		const soloT = smoothstep(remap(progress, DRAG_END, RETURN_END));
		const flatX = lerp(goreX, width / 2, soloT);
		const flatR = lerp(goreR, Math.min(width, height) * 0.42, soloT);
		const zoomStart = (HOLD_START * Math.PI) / flatRadius(ANCHOR_START * D2R, 0);
		const zoomMorph = (holdMorph * Math.PI) / flatRadius(anchorColat * D2R, 1);
		const zoomBack = (holdZoom * Math.PI) / flatRadius(anchorColat * D2R, 1);
		const zoomMul = lerp(lerp(zoomStart, zoomMorph, stereoT), zoomBack, zoomT);
		const flatScale = (flatR / Math.PI) * zoomMul;

		dragIsFlat = which === 'flat';
		dragFlatPoleNative = false;
		if (dragIsFlat) {
			const fp = buildFlat(wT, viewLon, flatLat, flatScale, flatX, cy, stereoT);
			// pole-native only while there are still gores; once closed it is
			// equator-native, the same convention as the globe
			dragFlatPoleNative = !fp.plain;
			dragProj = fp.proj;
		} else {
			dragProj = buildGlobe(viewLon, globeLat, globeR, globeX, cy);
		}
		const p = dragProj.invert([x, y]);
		if (!p || Number.isNaN(p[0])) return;
		dragging = true;
		v0 = versor.cartesian(p);
		r0 = dragProj.rotate();
		q0 = versor(r0);
		canvas.setPointerCapture(evt.pointerId);
	}

	function onPointerMove(evt) {
		if (!dragging) return;
		dragProj.rotate(r0);
		const p = dragProj.invert(pointer(evt, canvas));
		if (!p || Number.isNaN(p[0])) return;
		const next = versor.rotation(versor.multiply(q0, versor.delta(v0, versor.cartesian(p))));
		// Both panels are parameterised by one geographic view point, so the
		// dragged rotation is converted back into that: the flat projection
		// is pole-native (rotate = [-lon, 90-lat]), the globe equator-native
		// (rotate = [-lon, -lat]).
		freeView = [-next[0], dragFlatPoleNative ? 90 - next[1] : -next[1]];
	}

	function onPointerUp(evt) {
		dragging = false;
		canvas.releasePointerCapture(evt.pointerId);
	}

	// Scrubbing back out of the free-rotation window hands control back to
	// the script rather than stranding the view wherever it was left.
	$effect(() => {
		if (!canDrag && freeView) freeView = null;
	});

	onMount(() => {
		ctx = canvas.getContext('2d');
		const ro = new ResizeObserver(([entry]) => {
			const r = entry.contentRect;
			if (!r.width || !r.height) return;
			width = r.width;
			height = r.height;
			const dpr = window.devicePixelRatio || 1;
			canvas.width = r.width * dpr;
			canvas.height = r.height * dpr;
			canvas.style.width = `${r.width}px`;
			canvas.style.height = `${r.height}px`;
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			render();
		});
		ro.observe(container);
		canvas.addEventListener('pointerdown', onPointerDown);
		canvas.addEventListener('pointermove', onPointerMove);
		canvas.addEventListener('pointerup', onPointerUp);
		return () => {
			ro.disconnect();
			canvas.removeEventListener('pointerdown', onPointerDown);
			canvas.removeEventListener('pointermove', onPointerMove);
			canvas.removeEventListener('pointerup', onPointerUp);
		};
	});

	const captionOpacity = (start, end, prog) => {
		if (prog < start || prog > end) return 0;
		const fade = Math.min(0.12, (end - start) * 0.28) || 0.001;
		return Math.min(remap(prog, start, start + fade), 1 - remap(prog, end - fade, end));
	};
	let captionOpacities = $derived(CAPTIONS.map((c) => captionOpacity(c.start, c.end, progress)));
</script>

<div class="scene-container" bind:this={container}>
	<canvas bind:this={canvas} class:grabbable={canDrag}></canvas>
</div>

<div class="caption-overlay">
	{#each CAPTIONS as c, i}
		{#if captionOpacities[i] > 0.01}
			<p class="caption" style="opacity: {captionOpacities[i]};">{c.text}</p>
		{/if}
	{/each}
</div>

<style>
	.scene-container {
		width: 100%;
		height: 100%;
	}
	.scene-container canvas {
		display: block;
		touch-action: none;
	}
	.scene-container canvas.grabbable {
		cursor: grab;
	}
	.scene-container canvas.grabbable:active {
		cursor: grabbing;
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
		bottom: 8%;
		max-width: 32rem;
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
