# Curvature Explorer — Three.js Implementation Spec

## Narrative role

This sequence comes after the Poincaré-disk section of Stanza I.

The reader has seen a model of an infinite hyperbolic world, but has not yet been given a concrete intuition for what **negative curvature** means.

The goal of this sequence is to teach:

1. A surface can bend differently in two perpendicular directions.
2. A sphere bends the same way in both principal directions.
3. A plane has zero curvature in both.
4. A saddle bends opposite ways in its two principal directions.
5. (May or may not try to teach:) The product of those two directional curvatures gives Gaussian curvature:
   - positive on sphere-like patches
   - zero on a plane
   - negative on saddle-like patches

This should later provide visual groundwork for Stanza II, where the same two principal curvatures return in a *different* relationship: mean curvature is their average.

Do not introduce mean curvature here.

---

# Technical approach

Use Three.js.

Prefer one persistent scene, camera, lighting setup, and pair of color-coded curvature directions throughout.

The sequence has two mathematical regimes:

1. **Actual sphere**
2. **Local quadratic surface patch**

The transition between them should visually feel continuous.

---

# Stage 1 — A sphere

## Geometry

Start with a sphere of radius `R`.

Place the marked observation point on the **equator**, e.g.

```js
p = (R, 0, 0)

assuming `z` is vertical.

At that point show two perpendicular colored curve segments:

### Curve A --- north/south direction

Part of the meridian geodesic through the point.

### Curve B --- east/west direction

Part of the equator.

The two curves meet at 90° at the marked point.

Use consistent different colors for these two curves that will persist through the entire sequence.

* * * * *

Stage 2 --- Rotate the point into the viewing position and add legend-like views of the curves
====================================================

Rigidly rotate the entire sphere so the marked point moves to the visual "top" / center-facing position.

Important:

This is only a camera/object orientation change.

Do not alter the geometry.

While rotating fade in 2D representation of the two curves (almost like a legend or control feature like we have in the catenary introduction in stanza II -- but with two curves both showing side by side and color coded)

After the rotation:

-   keep the observation point centered visually;
-   keep the two colored great-circle segments visible;
-   retain the 90° relationship;
-   frame the sphere so both directional bends are easy to read.

* * * * *

Stage 3 --- Increase and then decrease curvature and corresponding R of the sphere
============================

Decrease and then increase the sphere radius continuously while keeping the **local neighborhood around the marked point at approximately the same screen scale**.

Mathematically, on a sphere:

```
κ₁ = κ₂ = 1 / R
```

up to the chosen orientation/sign convention.

As:

```
R → ∞
```

both principal curvatures approach zero and the local surface approaches a plane.

Visual requirement
------------------

Do not simply zoom out to show an ever-larger ball.

Instead, keep the local patch around the observation point framed consistently.

As `R` decreases and then increases:

-   the sphere becomes more and then less visibly curved;
-   both colored curvature sections flatten;
-   the mesh around the marked point approaches a plane.

Eventually the rest of the sphere should leave the visual story entirely.

* * * * *

Stage 4 --- Transition from global sphere to local surface patch
==============================================================

Before reaching an impractically enormous sphere, begin clipping/fading away everything except a local neighborhood around the observation point.

Transition to an explicitly local parameterization.

Recommended Monge patch:

```
z(u,v) = 1/2 (κ₁ u² + κ₂ v²)
```

where:

-   `u` and `v` are perpendicular principal directions;
-   `κ₁` and `κ₂` control curvature independently.

Initially choose:

```
κ₁ = κ₂ = small positive value
```

matching the final visual curvature of the sphere.

Then smoothly reduce:

```
κ₁ → 0
κ₂ → 0
```

to reach the plane.

The handoff from sphere geometry to quadratic patch should happen while curvature is already small enough that the two are visually indistinguishable.

* * * * *

Mesh
====

Keep the surface mesh.

Do NOT replace the surface with curvature circles alone.

The mesh is important for helping readers perceive a surface rather than two abstract curves.

Recommended domain:

```
u,v ∈ [-L, L]
```

with either:

-   circular clipping in parameter space:

```
u² + v² <= L²
```

or

-   a rounded-square patch.

Circular clipping may feel more like taking a magnifying glass to one point on the surface.

Use enough subdivisions that the curvature changes smoothly during scroll.

* * * * *

Principal-curvature curves
==========================

Once using the quadratic patch, the colored curves should be the intersections:

```
v = 0
```

and

```
u = 0
```

giving:

```
z = 1/2 κ₁u²
```

and

```
z = 1/2 κ₂v²
```

These are the principal normal sections through the central point.

Important terminology:

-   On the sphere, the original colored curves are geodesics.
-   On the generic patch, call them **cross-sections in the two principal directions**, not geodesics.

Keep them slightly above the surface or use polygon offset so they remain legible without z-fighting.

* * * * *

Stage 5 --- Plane
===============

Pause briefly at:

```
κ₁ = 0
κ₂ = 0
```

The surface is flat.

Both colored cross-sections are straight.

Display if useful:

```
Curvature 1: 0
Curvature 2: 0
```

This is the neutral hinge of the interaction.

* * * * *

Stage 6 --- Scrub/scroll to move two curvatures opposite directions
===============================================

Now introduce the key conceptual move:

> What if the surface could curve differently in these two directions?

Move one curvature positive:

```
κ₁ > 0
```

while gradually changing the other:

```
κ₂: 0 → negative
```

The surface becomes a saddle.

The two colored section curves now visibly bend in opposite directions.

This should be the strongest visual moment of the sequence.

Suggested progression:

```
sphere-like
κ₁ > 0, κ₂ > 0

↓

plane
κ₁ = 0, κ₂ = 0

↓

saddle
κ₁ > 0, κ₂ < 0
```

The exact animation path does not have to be a single mathematically meaningful family of global surfaces.

It is teaching the **local curvature at one point**.

* * * * *

Camera and orientation
======================

Use a stable three-quarter camera orientation during the local-patch phase.

The view should make both principal bends obvious.

Avoid:

-   looking directly down either principal direction;
-   looking directly along the normal;
-   extreme perspective distortion.

A useful starting point may be approximately:

```
azimuth: 35--45°
elevation: 25--35°
```

Tune visually.

The saddle should read immediately as one direction curving upward and the perpendicular direction downward.

* * * * *

Surface normals / sign convention
=================================

Do not make the narrative depend on whether an individual principal curvature is labeled "+" or "-", because reversing the surface normal reverses both signs.

What matters visually and geometrically is:

### Sphere-like

Both principal curvatures have the **same sign**.

### Saddle-like

They have **opposite signs**.

Gaussian curvature is independent of this normal choice because:

```
K = κ₁ κ₂
```

So:

```
sphere-like: K > 0
plane:       K = 0
saddle-like: K < 0
```

This is the quantity to emphasize in this stanza.

* * * * *

Optional formula reveal [Skip at least for initial build]
=======================

Only after the saddle is visually understood, show:

```
Gaussian curvature

K = κ₁ × κ₂
```

Then animate:

### Sphere

```
(+) × (+) = positive
```

### Plane

```
0 × 0 = 0
```

### Saddle

```
(+) × (-) = negative
```

Avoid introducing mean curvature here.

That will be a separate payoff in Stanza II:

```
H = (κ₁ + κ₂) / 2
```

* * * * *

Relationship to the Poincaré disk
=================================

The sequence should begin with a narrative question roughly equivalent to:

> The Poincaré disk represents a world of constant negative curvature. But what does "negative curvature" actually mean? To understand lets look again at our sphere. 

After the saddle appears, clarify:

> A saddle gives us a local picture of negative curvature.

Do NOT imply that the Poincaré disk represents one literal ordinary saddle embedded in 3D.

The hyperbolic plane has constant negative curvature everywhere and extends infinitely.

A complete smooth surface with that geometry cannot be globally embedded isometrically in ordinary Euclidean 3-space.

That fact may become the bridge into the project's discussion of increasing mathematical abstraction.

* * * * *

Possible copy beats
===================

These are placeholders, not final prose.

### Beat 1

> Curvature of a surface can be defined looking at two principle curves. Starting at the equator on a sphere, one curves in the East / West direction. And the other in the North South direction. 

### Beat 2

> A sphere's constant curvature, means these two primary curves don't change anywhere on the sphere. 

### Beat 3

> The steeper the curve, the smaller there sphere; and the flatter the curve, the bigger the sphere. 

### Beat 4

> With zero curvature, you have a flat plane. 

### Beat 5

> But the two directions don't have to curve together.

### Beat 6

> Let start with a smaller area and bend one one curve one way and the other the opposite way.

### Beat 7

> This may look like a saddle, or a Pringles, or a section of an hourglass. Mathematically it is negative curvature.

### Beat 8

> Mathematicians asked what is a surface which has constant negative curvature. It would be infinite, but that is exactly the surface the Poincaré disk describes. 

* * * * *

Possible triangle extension --- NOT required for v1
=================================================

Do not implement initially unless it proves useful after testing.

A later layer could add a fixed-size geodesic triangle and show:

```
positive curvature → angle sum > 180°
zero curvature     → angle sum = 180°
negative curvature → angle sum < 180°
```

However, generating the actual geodesics on the changing quadratic patch is a separate mathematical problem.

Do not simply draw arbitrary projected line segments and label them geodesics.

The two principal-curvature cross-sections are sufficient for the core negative-curvature lesson.

* * * * *

Performance
===========

The local quadratic patch should be inexpensive enough to regenerate each frame.

Recommended:

-   fixed `(u,v)` grid;
-   update vertex `z` values as `κ₁,κ₂` change;
-   recompute normals;
-   reuse BufferGeometry;
-   avoid remeshing/topology changes during scroll.

The colored principal sections can be recomputed from the same curvature parameters.

The initial sphere can use standard `SphereGeometry`.

During the sphere → local patch handoff, either:

1.  crossfade while geometry matches closely, or
2.  build the sphere cap parametrically so it can morph directly into the quadratic patch.

Option 1 is likely simpler and visually sufficient if the transition occurs at low curvature.

* * * * *

Success criterion
=================

A reader who never sees an equation should be able to explain:

> A sphere curves the same way in two perpendicular directions. A saddle curves opposite ways. That's what makes its Gaussian curvature negative.

A reader who does look at the formula should understand why:

```
K = κ₁κ₂
```

changes sign.

The visualization should leave the reader ready to recognize the same two directional curvatures when they reappear in Stanza II under the different condition of zero **mean curvature**.