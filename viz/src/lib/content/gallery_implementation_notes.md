# Scherk Minimal Surface Explorer — Technical Notes

## Purpose

This document provides implementation guidance for adding a Scherk minimal surface explorer to the "One Surface Becomes Infinitely Many" section of the scrollytelling piece.

Unlike Enneper, where the interactive mainly exposes more or less of the same surface, Scherk provides a genuine **one-parameter family** of different minimal surfaces.

The goal is to demonstrate that, by the late nineteenth century, mathematicians could generate *families* of exact minimal surfaces rather than discovering isolated examples one at a time.

---

# Recommendation

Implement the **singly periodic Scherk family**.

Do **not** use Scherk's first doubly-periodic graph

```
z = log(cos(y)/cos(x))
```

as though changing a coefficient produces the same family.

That graph is an excellent gallery example, but it is **not** the parameterized angle family.

The singly periodic Scherk surfaces form a genuine one-parameter family of embedded minimal surfaces whose four planar ends meet at varying angles.

Primary mathematical reference:

Pérez & Traizet

*The classification of singly periodic minimal surfaces with genus zero and Scherk-type ends.*

---

# Mathematical Representation

Represent the surface using the Weierstrass representation.

Complex parameter:

```
z ∈ Ĉ \ {±e^{±iθ}}
```

with

```
0 < θ < π/2
```

Use

```
g(z) = z
```

and height differential

```
dh =
4 sin(2θ) z dz
-----------------------------
z⁴ − 2 cos(2θ) z² + 1
```

The immersion is then obtained from the standard Weierstrass formula

```
X(z)
=
Re ∫
(
½(1/g − g),
i/2(1/g + g),
1
)
dh
```

Before implementation, verify the exact convention against the existing Weierstrass implementation already used for Enneper / Catenoid–Helicoid.

---

# User Parameter

Expose a **geometric** parameter rather than θ.

Suggested label:

> **Angle between ends**

Internally map this onto

```
0 < θ < π/2
```

Avoid displaying θ itself.

Default:

Orthogonal Scherk.

Do **not** allow θ to approach zero where the representation degenerates.

---

# Visual Effect

Changing the parameter should

- rotate the four planar ends
- smoothly deform the saddle
- preserve topology
- preserve minimality
- preserve single periodicity

This is the pedagogical point:

The slider changes **which member of the mathematical family** is being viewed.

---

# Domain Strategy

Avoid sampling directly through the punctures.

Recommended workflow

1. Work in the complex domain.
2. Remove small disks around each puncture.
3. Triangulate the remaining region.
4. Numerically integrate the Weierstrass representation.
5. Clip the resulting geometry to a fixed bounding volume.

If this proves difficult:

Precompute 30–60 meshes across parameter values.

Interpolate only between adjacent verified meshes.

That is preferable to inventing a simpler deformation.

---

# Handling the Ends

The Scherk ends are asymptotic.

Do **not** render arbitrarily close to them.

Recommended approach

Parameter-space exclusion

```
|z − pᵢ| > ε
```

for every puncture.

Then

world-space clipping.

Avoid opacity fades.

The visualization is simply showing a finite window into an infinite surface.

---

# Display

Prefer approximately

2–3 visible periods

rather than a single fundamental patch.

A lone patch looks like an isolated saddle.

Several periods communicate the defining periodic character.

Do **not** tile arbitrarily in two dimensions.

This family is singly periodic.

---

# Camera

Normalize every mesh using the central saddle region rather than the furthest vertices.

Otherwise the object appears to "pulse" in scale as θ changes.

Suggested framing

- perspective camera
- three-quarter view
- periodic direction vertical
- fixed camera across all slider values

---

# Numerical Verification

Implementation should include verification.

For several slider positions

1. Compute the mesh.
2. Estimate mean curvature numerically.
3. Confirm

```
|H|
```

remains close to zero across the interior.

Ignore

- puncture neighborhoods
- clipping boundaries

The residual should decrease as mesh resolution increases.

Also verify

- correct periodicity
- no accidental self-intersections
- expected symmetry in the orthogonal case

---

# If Scherk Becomes Too Expensive

Do **not** let Scherk dominate development effort.

If robust implementation becomes a project of its own:

- keep Catenoid ↔ Helicoid
- keep Enneper
- replace Scherk's slider with a verified static mesh

The narrative only requires demonstrating that

> one equation became many surfaces.

It does **not** require every displayed surface to be interactive.

---

# Gallery of Additional Minimal Surfaces

Following the parameterized examples, include a gallery of additional mathematically verified surfaces.

These do **not** require sliders.

Suggested order

### Scherk's First Surface (1834)

Doubly periodic.

Graph

```
z = log(cos(y)/cos(x))
```

Excellent static example.

---

### Enneper Surface (1864)

Exact polynomial parameterization.

Cheap and stable.

---

### Riemann Minimal Example

Historically important.

Include if a reliable implementation is available.

---

### Schwarz P

Triply periodic.

Use a verified numerical mesh rather than a simple implicit approximation.

---

### Schwarz D

Triply periodic.

Pairs well visually with Schwarz P.

---

### Gyroid (Schoen, 1970)

Ideal final gallery piece.

Serves as the visual bridge into Stanza III.

Use a verified numerical minimal-surface mesh if presenting it as an exact gyroid.

---

# Recommended v1

Interactive

1. Catenoid ↔ Helicoid
2. Enneper
3. Scherk (only if implementation proves robust)

Gallery

- Scherk First Surface
- Riemann Example
- Schwarz P
- Schwarz D
- Gyroid

The gallery should finish on the **gyroid**, naturally setting up the next stanza exploring how minimal-surface mathematics spread beyond geometry into materials science, biology, engineering, computer graphics, and physics.