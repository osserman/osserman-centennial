# Stanza III revision brief

## Purpose

Substantially tighten Stanza III while preserving its central conceit:
following citations of Robert Osserman's *A Survey of Minimal Surfaces*
outward from mathematics into a surprisingly broad range of other
fields.

The revision should make the stanza feel less like a sequence of mini
paper summaries and more like a coherent narrative about how
mathematical ideas travel. At the same time, the breadth of disciplines
is important and should remain visible.

The main changes are:

1.  **Keep the field-based structure**, but treat fields as overlapping
    and in dialogue rather than isolated buckets.
2.  **Move individual paper descriptions into collapsed
    `<details>/<summary>` elements.** The main scroll narrative should
    describe the broader relationship between minimal-surface
    mathematics and each field; readers who want evidence/details can
    expand individual papers.
3.  **Use transitions between fields to carry ideas forward.** In
    particular, Biology → Bioengineering → Materials Science should feel
    like a progression rather than three unrelated categories, and the
    Computer Science examples can loop back into Biology.
4.  **Drop the separate end section that reclassifies papers into
    abstract "pathways."** Instead, let different roles of mathematics
    emerge through verbs and recurring language in the field narratives:
    recognizing, modeling, designing, computing, theorizing, etc.
5.  Preserve the citation graph as the evidentiary and visual backbone.
    Do not add examples simply because they are good examples of
    minimal-surface applications unless they occur in the citation graph
    being used for this project.

------------------------------------------------------------------------

## Narrative principle

The fields are useful orientation devices, but the intellectual history
should not imply that ideas move neatly from one silo to another.

A useful underlying idea is:

> We can sort papers into academic fields. The mathematics itself is
> less respectful of those boundaries.

This does **not necessarily need to appear verbatim** in the published
text. Ideally the transitions and examples demonstrate it.

The stanza should show a wide range of fields while also showing
relationships among them:

-   a geometry can be **recognized** in a natural system;
-   related mathematics can be used to **model** that system;
-   the geometry can then be deliberately **designed** into an
    engineered structure;
-   similar forms can appear through **self-assembly** in materials;
-   mathematical methods can be repurposed as **computational tools**;
-   those computational tools can circle back into biological research;
-   minimal surfaces and related mathematics can also become part of
    **physical theory**.

These are not stages in a pipeline and should not become a new formal
taxonomy. The same field or paper may embody more than one relationship.

------------------------------------------------------------------------

# Structural changes

## Current structure to remove

The current Stanza III plan gives each field an introduction plus
multiple separate scroll steps for individual exemplar papers, followed
by a distinct reinterpretation section that groups papers into four
pathways:

-   mathematics discovers hidden structure;
-   mathematics becomes a design language;
-   mathematics becomes a computational tool;
-   mathematics becomes part of physical theory.

Remove that final categorical/pathway movement.

Also reduce the number of narrative scroll states devoted to individual
papers.

## New structure

For each field or closely related field:

1.  A **short main narrative passage** explains the range of ways
    minimal-surface mathematics appears in that field.
2.  Beneath it, show the selected papers as a compact list of collapsed
    `<details>` elements.
3.  The `<summary>` should primarily be the paper title (with year or
    another small metadata item if useful).
4.  Expanding a paper reveals approximately the amount of explanatory
    copy currently used in its left-panel paper step: what problem the
    researchers were addressing, how minimal-surface mathematics enters,
    and why the example is interesting.
5.  Keep links/citation metadata available inside the expanded detail
    where appropriate.
6.  The citation graph should respond primarily to the **field-level
    narrative step**, showing/highlighting the relevant citation branch
    or papers together. Expanding a paper does not necessarily need to
    create a new scrollytelling state.

Conceptually:

``` html
<section class="field">
  <div class="field-narrative">
    <!-- concise field-level story -->
  </div>

  <div class="papers">
    <details>
      <summary>Paper title</summary>
      <!-- existing paper-level explanation, tightened as needed -->
    </details>

    <details>
      <summary>Another paper title</summary>
      <!-- paper-level explanation -->
    </details>
  </div>
</section>
```

Use the existing component system rather than literal HTML if there is
already an appropriate Svelte abstraction. A reusable
`PaperDetails`/`PaperList` component is preferable if it keeps content
data-driven.

The interaction should be visually restrained. These are scholarly
footpaths for readers who want to go deeper, not large cards competing
with the main narrative.

------------------------------------------------------------------------

# Proposed narrative sequence

The exact field labels can follow the dataset's classifications, but
narratively aim for this progression:

**Biology → Bioengineering / Engineering → Materials Science → Computer
Science → Physics**

This ordering is intentional. Each transition should complicate or
extend the relationship established by the previous field.

Do **not** imply that these fields are historically dependent on one
another unless the citation evidence actually establishes that. This is
a narrative ordering of examples, not a claim about a single lineage.

------------------------------------------------------------------------

# Draft main narrative

These are drafts, not immutable final copy. Preserve factual caution
when adapting them to the exact selected papers.

## Biology

Minimal-surface and closely related geometries have appeared in research
on living systems at remarkably different scales. Researchers have used
them to describe and model structures ranging from the organization of
muscle fibers in the heart to the microscopic necks formed when cell
membranes bend, merge, and divide.

Here, mathematics can provide a language for **recognizing and modeling
forms found in nature**.

### Transition to bioengineering

The next examples reverse that relationship. Rather than using
mathematics to describe structures found in living systems, researchers
use related geometries to help **design structures for biological
purposes**.

------------------------------------------------------------------------

## Bioengineering / Engineering

Advances in computation and fabrication have made it possible to
manufacture intricate structures based on triply periodic
minimal-surface geometries. In bioengineering, researchers have
investigated these forms as porous scaffolds intended to support the
growth of bone and other tissues.

The geometry is no longer only something to recognize or describe. It
becomes a starting point for **design**.

### Accuracy note

Avoid implying that mathematical minimality itself automatically
produces desirable biological or mechanical properties. Researchers are
generally interested in properties of the resulting geometry and
topology --- interconnected pores, surface area, transport, mechanical
behavior, etc. --- and different TPMS designs involve different
tradeoffs.

### Transition to materials science

Bioengineered scaffolds already sit near the boundary between
engineering, biology, and materials science. Following the mathematics
into materials makes those boundaries blur further: some
minimal-surface-like structures are deliberately designed, while others
emerge through the behavior of the materials themselves.

------------------------------------------------------------------------

## Materials Science

At microscopic scales, some materials can organize themselves into
intricate networks resembling triply periodic minimal surfaces.
Researchers studying systems such as self-assembling block copolymers
have used minimal-surface geometry to help **recognize and describe**
these structures. Other work explores related curved geometries in
deliberately conceived materials, including forms of curved carbon.

Here the relationship runs in both directions: mathematics can help
researchers understand structures that emerge through self-assembly and
imagine structures that might be made.

### Accuracy note

Be careful about saying that physical structures *are* exact minimal
surfaces. Depending on the paper/system, the observed structure may
resemble or approximate an ideal minimal surface, or be more accurately
described by a related constant-mean-curvature geometry. Use the
terminology of the selected papers.

### Transition to computer science

So far, much of the story has involved the **forms** studied by
minimal-surface mathematics. But an idea can travel without its original
shape. Sometimes what crosses into another field is the mathematical
machinery itself.

------------------------------------------------------------------------

## Computer Science / Computational Research

Methods developed around minimal surfaces have also been adapted as
computational tools for other geometric problems. In the selected
papers, these ideas appear in work ranging from image segmentation to
the reconstruction and analysis of complex three-dimensional motion.

One particularly useful connection is that a computational method can
cross disciplinary boundaries again: a computer-science technique can
become part of a biological investigation, such as research
reconstructing the movement of the tongue.

Here, what travels is not necessarily a recognizable catenoid, helicoid,
or gyroid. It can be a **method for finding, separating, reconstructing,
or analyzing surfaces**.

### Implementation/research note

Verify the wording above against the exact selected CS papers before
treating it as final. Preserve the distinction between a paper that
literally uses a minimal-surface method and one whose citation
relationship is more indirect.

### Transition to physics

Elsewhere, the mathematics moves in a different direction again: not
toward a structure that can be fabricated or necessarily observed
directly, but into mathematical theories of the physical world.

------------------------------------------------------------------------

## Physics

Minimal surfaces and mathematical ideas developed around them appear in
areas of theoretical physics far removed from soap films: in work
involving fields and branes, and in geometry related to black holes and
spacetime.

In these settings, the mathematics can become part of the framework
scientists use to **reason about physical systems that may be difficult
or impossible to observe directly**.

### Accuracy note

Do not imply that every object in the selected physics papers is
literally a classical minimal surface in Euclidean three-space. In
particular, "trapped surfaces" in general relativity are not simply
minimal surfaces. The field-level copy should use a broad formulation
such as "minimal surfaces and mathematical ideas developed around them"
unless the individual paper supports a stronger statement.

------------------------------------------------------------------------

# Paper details

For each field, preserve the strongest selected citation-graph examples
already identified.

Current example families include:

-   **Biology:** heart myofibers; membrane necks
-   **Bioengineering / Engineering:** bone/tissue scaffolds and porous
    biomaterials
-   **Materials Science:** self-assembling block copolymers; curved
    graphite/carbon
-   **Computer Science / computational work:** object segmentation;
    XROMM/tongue mechanics
-   **Physics:** Born--Infeld/branes; trapped-surface-related work

Do not replace these with outside examples merely to make disciplinary
categories cleaner. The conceit of this stanza is that these are paths
visible through the citation graph of *A Survey of Minimal Surfaces*.

If the underlying citation dataset contains stronger examples within a
field, flag them for consideration rather than silently changing the
curated set.

For each expanded paper description, aim to answer three questions in
plain language:

1.  **What was the researcher trying to understand or do?**
2.  **Where does minimal-surface mathematics enter?**
3.  **What makes this an interesting example of mathematical ideas
    traveling?**

Avoid making the paper detail into an abstract summary. It should
explain why the paper matters to *this story*.

------------------------------------------------------------------------

# Drop the end-of-stanza pathway taxonomy

Remove the separate section that reorganizes the papers into categories
such as:

-   hidden structure
-   design language
-   computational tool
-   physical theory

The insight behind those categories should survive, but as recurring
language woven into the field narratives.

Possible recurring verbs/concepts include:

-   **recognize**
-   **describe**
-   **model**
-   **design**
-   **compute**
-   **theorize**

Do not turn these into a rigid six-part framework or require every paper
to have one label. Their purpose is to create echoes across fields.

For example:

-   Biology and Materials may both return to **recognition**.
-   Biology and Physics may both involve **modeling**, but in very
    different senses.
-   Bioengineering and Materials may both involve **design**.
-   Computer Science can show that sometimes the **method**, rather than
    the form, is what travels.
-   A CS example used in biological research can explicitly or visually
    loop the reader back to Biology.

If useful visually, these verbs can appear as very quiet recurring
typographic cues, but avoid anything that looks like a formal
classification system unless it proves useful in implementation.

------------------------------------------------------------------------

# Citation graph behavior

The citation graph remains essential. This revision should **not** turn
Stanza III into ordinary prose with citations appended.

The graph should continue to demonstrate:

-   the book at the center/start;
-   the dominance of mathematics among its citations;
-   branches reaching into a broad range of other fields;
-   the selected exemplar papers within those branches;
-   relationships and overlaps that make disciplinary boundaries porous.

Where feasible, transitions between fields should maintain enough graph
context that the reader feels they are moving through one connected
scholarly network rather than loading five unrelated datasets.

The expandable paper details provide depth; the graph provides evidence
of breadth and connection.

------------------------------------------------------------------------

# Tone and claims

Continue the project's existing preference for understatement and
precision.

Especially:

-   Do not imply that Robert Osserman's own original theorems directly
    caused all of these applications. The citation graph begins with his
    survey as a useful lens into the intellectual migration of the
    broader field.
-   Do not imply a clean theory → application pipeline.
-   Do not imply that a field "adopted minimal surfaces" wholesale based
    on one or two papers.
-   Prefer formulations such as "researchers have used," "appears in
    research on," "one example uses," or "the selected papers show."
-   Distinguish exact minimal surfaces from TPMS-inspired,
    minimal-surface-like, constant-mean-curvature, or otherwise related
    geometries where the source requires it.
-   Preserve disciplinary breadth without pretending disciplinary
    boundaries are clean.
-   Let surprising recurrence and cross-field dialogue do more work than
    explicit claims about the "poetry" of mathematics.

------------------------------------------------------------------------

# Desired effect

After this revision, a reader who **never opens a paper detail** should
still understand the main Stanza III story:

Robert Osserman's survey sits within a mathematical tradition that
continued to travel in unexpected directions. Minimal-surface forms and
methods now appear across biology, engineering, materials science,
computer science, and physics --- sometimes as forms to recognize,
sometimes as models, sometimes as designs, sometimes as computational
methods, and sometimes as parts of physical theory. These uses overlap
and feed across disciplinary boundaries rather than fitting into a neat
sequence.

A reader who **does open the paper details** should be able to inspect
the concrete scholarship supporting that story.

The result should feel less like a literature-review slideshow and more
like exploring a connected scholarly landscape.
