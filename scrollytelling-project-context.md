# Scrollytelling Project Context

## Project overview

This project is an interactive scrollytelling visualization exploring how ideas from **minimal surface mathematics** spread beyond mathematics into a wide range of scientific disciplines.

The project is **not** intended as a biography of Robert Osserman.

It is intended to tell a broader story about how abstract mathematical ideas evolve, migrate, and eventually find unexpected applications—an idea that Robert Osserman explored repeatedly in *The Poetry of the Universe*.

Osserman's *A Survey of Minimal Surfaces* serves as an unusually useful observational window into that process because it accumulated over 1,000 citations across many disciplines over more than fifty years.

The visualization should present those citations as one way—not the only way—of tracing how knowledge moved through science.

---

# Overall narrative

The story should unfold gradually.

The goal is not simply to show a graph or a large number of papers.

Instead, each section should reveal another layer of the story.

The rough narrative is:

1. A graduate mathematics text published in 1969.
2. More than 1,000 scholarly citations.
3. Most remain within mathematics.
4. Hundreds appear in other, sometimes unexpected, disciplines.
5. Explore several representative fields in more depth via highlighting a few significant papers in the background citation graph visual.
6. Reveal that these seemingly unrelated fields actually represent only a handful of recurring relationships between mathematics and the world.

The final step should feel like a reinterpretation of the prior one. And graph visual should remain interactive for encouraged additional filtering and exploration.

---

# Primary message

The visualization is **not** trying to argue that minimal surfaces "caused" these fields.

Nor is it trying to claim that Osserman's own mathematical research directly enabled every application.

Instead it asks a simpler historical question:

> Where did researchers outside mathematics find lasting value in ideas from minimal-surface mathematics?

The emphasis should remain on:

- knowledge transfer
- intellectual migration
- unexpected reuse
- evolution of ideas

rather than attribution or hero narratives. It should also err on the side of understatement rather than overstatement.

---

# Audience

Primary audience:

- mathematically curious general public
- scientists
- engineers
- mathematicians
- students

The writing should remain accessible to readers with no specialist background.

Whenever possible:

- explain the problem each field was trying to solve
- explain why minimal-surface mathematics became useful
- explain what changed because of that connection

Avoid assuming readers know technical vocabulary.

For example:

Instead of

> block copolymers

prefer something like

> certain plastics whose molecules naturally separate into complex microscopic structures

before introducing more technical language.

---

# Visual philosophy

The visualization should privilege exploration over explanation.

Rather than overwhelming readers with every paper immediately, reveal complexity gradually.

Large datasets should feel approachable.

The graph should support discovery rather than simply illustrating the accompanying text.

It should also acknowledge methodological limitations (misclassified fields for some papers, potential for additional missing citations, etc).

---

# Interaction philosophy

The visualization should encourage curiosity.

The scrollytelling introduces only a small number of representative papers.

The graph itself should invite users to continue exploring.

The ideal ending is not a conclusion but an opening:

> "What other paths can you find?"

---

# Proposed structure

## Introduction

Introduce:

- Robert Osserman's *A Survey of Minimal Surfaces*
- publication year
- citation count
- broad question

---

## Mathematics

Show that most citations remain within mathematics.

This establishes expectations before breaking them.

---

## Beyond mathematics

Reveal citations outside mathematics.

Initially organize by **academic field**, not by interpretation.

Representative fields currently include:

- Engineering & Bioengineering
- Materials Science
- Biology
- Computer Science
- Physics

The exact field list may evolve.

Each field should include only one or two representative papers plus an optional "Explore more" section.

The goal is breadth rather than completeness.

---

## Reinterpretation

After readers have seen several disciplines, reorganize the same papers into a different framework.

Instead of asking

> Which field?

ask

> How did mathematics enter this field?

Current working pathways include:

- Mathematics discovers hidden structure.
- Mathematics becomes a design language.
- Mathematics becomes a computational tool.
- Mathematics becomes part of physical theory.

These pathways are interpretive and should emerge naturally from the evidence shown earlier.

---

## Free exploration

Conclude by returning to the citation graph.

Allow readers to explore beyond the curated examples.

The visualization should feel like an invitation rather than a finished historical account.

---

# Tone

The writing should feel:

- thoughtful
- curious
- historically grounded
- understated

Avoid exaggerated claims.

When the evidence is uncertain, explicitly indicate that more research is needed.

Statements should distinguish between:

- evidence from the papers
- reasonable interpretation
- open questions

---

# Development notes

This project is being developed as:

- Svelte-based interactive web application
- maintained within the existing Claude Code project
- published via GitHub Pages
- data-driven, with citation data generated reproducibly through scripts and a local SQLite database

The visualization should remain largely data-driven.

Narrative text should be easy to revise independently of the visualization components.

Interactive elements should be modular so that additional citation branches, papers, or explanatory sections can be added as the research evolves.

---

# Design principles

Prioritize:

- progressive disclosure
- readability
- restrained visual design
- smooth transitions between narrative sections
- maintaining context as readers scroll
- making large citation networks understandable without oversimplifying them

The project should reward both casual readers and those who wish to spend time exploring the graph in detail.

---

# Current status

This project should be treated as an active research prototype.

The paper selections, field groupings, and interpretive pathways are expected to evolve as additional historical research is completed.

The architecture should therefore make it easy to:

- swap representative papers
- add new branches
- revise explanatory text
- adjust the narrative sequence
- incorporate future discoveries without major restructuring.

---

# A final note

This should not feel like a corporate scrollytelling experience or an infographic. It should feel closer to exploring an evolving scholarly map—quiet, elegant, and intellectually curious. Favor simple, restrained interactions over flashy animations. Use animation to support understanding (revealing structure, maintaining object constancy, showing transitions between different organizational views of the same data), not simply for visual effect.
