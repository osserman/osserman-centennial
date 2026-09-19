import { TOUCH } from 'three';

/**
 * Hand single-finger touches back to the page, for an OrbitControls scene
 * that sits in the normal scroll flow.
 *
 * OrbitControls stamps `touch-action: none` on its canvas when it connects --
 * and that CSS is the entire mechanism, since its touch path never calls
 * preventDefault. In a piece that is mostly scrolling, that turns every 3D
 * scene into a scroll dead zone on a tablet: the scene panel fills most of
 * the screen, so a reader's swipe lands on a canvas that silently eats it,
 * leaving only the narrow text column to move the page with.
 *
 * So: one finger scrolls the page, two fingers manipulate the scene -- the
 * same split map apps use, and the same intent as the conditional
 * touch-action in the two hand-rolled scenes (ParallelPostulateScene,
 * AzimuthalProjectionScene) that don't use OrbitControls at all.
 *
 * Mouse and trackpad behaviour is untouched: `touches` governs touch input
 * only, so drag-to-rotate still works exactly as before. Two-finger DOLLY_
 * ROTATE respects each scene's own `enableZoom` internally, so the scenes
 * here (all of which turn zoom off so the wheel keeps scrolling the page)
 * get two-finger rotate without also getting pinch-zoom back.
 *
 * Call AFTER constructing the controls -- the constructor's connect() is what
 * sets touchAction to 'none', so an earlier call would just be overwritten.
 */
export function letOneFingerScroll(controls) {
	controls.touches = { ONE: null, TWO: TOUCH.DOLLY_ROTATE };
	controls.domElement.style.touchAction = 'pan-y';
}
