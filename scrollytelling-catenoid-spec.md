# Chapter 2 Prototype: Euler and the First Minimal Surface

## Purpose

This interaction is the opening section of a larger chapter introducing minimal surfaces.

The immediate goal is **not** to teach the entire field, but to let readers experience the same intellectual progression Euler made:

1. The obvious answer isn't optimal.
2. A better shape exists.
3. Mathematics can discover that shape.
4. That solution eventually became part of a much larger mathematical theory.

Subsequent interactions (not yet designed) will introduce zero mean curvature, soap films, Riemann's family of minimal surfaces, and eventually the maturation of the field through the twentieth century before connecting to the citation-network chapter.

This interaction should therefore feel like the beginning of a journey rather than a complete lesson.

---

# Interaction 1 — Can you beat the cylinder?

## Initial state

Display two identical circular rings aligned along a common axis.

Initially connect them with the obvious surface:

a cylinder.

Show:

**Surface Area**

with a live numerical value.

Prompt:

> Is this the smallest possible surface connecting these two rings?

No mention of Euler yet.

---

## User interaction

Allow the user to "cinch" the surface inward by dragging a single control or moving a slider.

For this first prototype the profile can simply become two straight segments meeting at the midpoint (a V shape in profile).

Revolve this profile to produce two joined truncated cones.

As the midpoint moves inward:

- update the 3D surface continuously;
- update the area continuously.

The important discovery:

Even this crude shape has **less** surface area than the cylinder.

The reader should naturally conclude:

> The cylinder is not the optimal solution.

---

## Mathematics

The V-shaped profile is only a pedagogical approximation.

Surface area can be computed analytically or numerically.

Accuracy is more important than exact implementation details.

The reader does **not** need to see equations.

---

# Euler enters

Once the user has experimented,

fade in new text.

---

In 1744, Leonhard Euler asked a much harder question.

Rather than trying a few simple shapes, he asked:

**Among every smooth curve that could connect these rings, which one produces the least possible surface area when rotated?**

He solved the problem mathematically.

---

The user's V-shaped profile should now smoothly morph into Euler's solution.

Show the area decreasing slightly further.

Keep the user's attempted profile faintly visible for comparison.

---

# Reveal the catenary

Now explain the surprising result.

---

The winning curve was not a new invention.

It was a curve mathematicians already knew:

the **catenary**, from the Latin *catena* ("chain"),

the shape naturally formed by a freely hanging chain.

Rotating that curve produces a surface called the **catenoid**.

---

Visually rotate or transform the diagram so the profile is now recognizable as a hanging chain between two supports.

The goal is to create a satisfying "aha" moment.

Readers should realize that a familiar physical object was quietly hiding the solution all along.

---

# Looking ahead

Conclude with only a brief hint.

---

Euler had solved one remarkable optimization problem.

Over the following centuries, mathematicians discovered something even deeper:

the catenoid was only one member of an entire family of surfaces sharing a simple geometric property.

Many of those surfaces were imagined mathematically long before they were observed in nature or engineered by humans.

---

No further explanation yet.

That becomes the next interaction.

---

# Design notes

The interaction should feel playful.

The reader should first think:

"I can probably improve on the cylinder."

Then:

"I can improve on it."

Then:

"Euler still beat me."

Only afterwards should mathematics explain why.

The interaction should reward curiosity rather than lecture the reader.

The mathematics is the payoff, not the prerequisite.

---

# Future interaction (placeholder)

The next section will introduce:

- soap films
- mean curvature
- why every stable soap film has zero mean curvature
- how this became the defining property of minimal surfaces
- the transition from one remarkable solution (Euler's catenoid) to an entire mathematical landscape (Riemann and beyond)

This interaction should leave enough narrative space for that conceptual leap.


## Additional notes: (changes suggested after seeing first draft)
1. Make horizontal instead of vertical cylinder (and their rings). Instead of the slider start with a straight line with a central control point to pull up and down. Instead of surface area as a number have a bar chart with the cylinder surface area as the first bar, the dynamic V surface area as the second. (And then an option to add some smoothing curve along with the V control point will come later and be the third. )
2. So steps are: A. introduce the two rings and ask about connecting them. Then on scroll draw a straight line from the top of one to the other. And pull that line around circumfrance of the ring to make our cylander. 
3. Populate the surface area bar chart mentioned above with just the first bar, and introduce the interactive "what if we modified the line? Can you lower the surface area?" Populate the second part of the bar chart. As they slide the control point on the middle of the line up and down, move the end of the bar, while continuing to show the range of surface areas they've uncovered. 
4. What if we used a curve. Add a second control point that moves horizontally instead of up and down and spreads out the curve. And with it a third bar, showing the surface areas they are now acheiving. 
5. Then we'll go to animated step intrucing that Euler asked this question in 1744 and mathematically found a proof for the absolute minimum. Show a catenary and compare to the range produced by the smooth curve. (continue on to show it as a portion of a hanging rope or chain and introduce the catenary; maybe later zooming in on the same visual showing the property of negative curvature everywhere, and zero mean curvature everywhere)  