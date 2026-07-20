# Research Plan: Mapping the Migration of Minimal Surface Mathematics

## Project Goal

This project aims to reconstruct how ideas from the mathematical theory of minimal surfaces spread into a diverse set of scientific and engineering disciplines.

The goal is **not** to build a comprehensive citation graph of all minimal surface literature. Instead, it is to identify a diverse handful of major intellectual pathways through which theoretical mathematics became influential in fields such as materials science, biology, architecture, computer graphics, engineering, and theoretical physics.

The final output is expected to be:

1. a rigorously documented research dataset, which will enable
2. a visualization of the evolution and migration of mathematical ideas.

The visualization will be manually made (not in this repo), and needs to be grounded in real bibliographic evidence while acknowledging that not every important intellectual influence is preserved through direct citation.

---

# Research Questions

The project is motivated by several related questions:

* How do abstract mathematical ideas migrate into other disciplines?
* Which papers served as "bridge papers" between pure mathematics and applied sciences?
* Which mathematicians and theoretical works were most influential across disciplines?
* Do different application domains converge on common mathematical ancestors?
* Can we distinguish between direct citation, conceptual influence, and historical lineage?

This is inspired by themes explored in Robert Osserman's *The Poetry of the Universe*, particularly:

* mathematics as imagination (parallel to poetry in expanding beyond existing mental models of the world);
* theory, experiment, engineering intertwining in producing growing understanding on many different scales; 
* collaboration, evolution and lineage across generations,
* and the unexpected applicability of abstract ideas (both in descriptive and proscriptive applications).

It will be ideally released at the centennial of Osserman's birth, but it is **not** intended as a biography of Robert Osserman. It is intended to honor his intellectual, artistic, and narrative values and instincts. His work and his role within the community of geometers will likely appear naturally in the resulting network.

---

# Overall Strategy

Rather than beginning with the mathematical literature and following citations outward, begin from carefully selected influential papers in several applied disciplines and trace their intellectual ancestry backward.

This approach should reveal where different branches make the link from their common (though varied) mathematical heritage to their diverse applications.

Initial application domains could include:

* lipid cubic phases
* block copolymers
* photonic crystals
* biomembranes
* tissue engineering
* porous transport materials
* computer graphics
* geometry processing
* architecture / form-finding
* general relativity
* quantum information

To start exploration we will begin with a small number of historically important "terminal papers." These are not necessarily the most cited, but most influential. 

These will be expanded backwards through citation analysis.

---

# Database Philosophy

Separate **raw bibliographic data**, **derived analyses**, and **human interpretation**.

The project should distinguish between three layers:

### Raw bibliographic data

Data harvested directly from external sources (primarily OpenAlex). This data should remain reproducible and immutable.

### Derived analyses

Data computed from the raw graph, such as:

* centrality measures
* community detection
* shortest paths
* clustering
* inferred bridge papers
* timeline metrics
* other network analyses

These should always be reproducible from the raw data and should never overwrite it.

### Human interpretation

Manual classifications, notes, and judgments.

These should always be stored separately from both raw data and derived analyses, allowing subjective interpretation to evolve independently of the underlying evidence.

The database should therefore distinguish between:

* evidence
* computation
* interpretation

rather than mixing them.

---

# Data Sources

Primary source:

OpenAlex API

Potential future sources:

* Semantic Scholar
* Crossref
* DOI metadata
* manual review of papers
* manual citation context extraction

---

# Suggested SQLite Schema

## works

Bibliographic metadata.

Suggested fields:

* openalex_id
* doi
* title
* publication_year
* publication_date
* source_id
* type
* language
* abstract
* cited_by_count
* is_open_access
* source_json
* harvested_at

---

## authors

Author metadata.

Suggested fields:

* openalex_id
* display_name
* orcid
* works_count
* cited_by_count
* source_json

---

## institutions

Institution metadata.

Suggested fields:

* openalex_id
* display_name
* country_code
* country
* region
* city
* latitude
* longitude
* institution_type
* ror
* wikidata
* homepage
* works_count
* cited_by_count
* source_json

---

## sources

Publication venues (journals, conference proceedings, books, etc.).

Suggested fields:

* openalex_id
* display_name
* publisher
* issn
* is_open_access
* works_count
* cited_by_count
* source_json

---

## work_authorships

Relationship between works, authors, and institutional affiliations.

Suggested fields:

* work_id
* author_id
* institution_id
* author_position
* is_corresponding
* raw_affiliation_string

This preserves the affiliation associated with a particular publication rather than attempting to maintain a single affiliation for each author.

---

## references

Directed citation graph.

Fields:

* citing_work
* cited_work

---

## concepts

OpenAlex concepts.

---

## work_concepts

Many-to-many relationship.

---

## topics

OpenAlex topics / fields / subfields (depending on API version).

---

## work_topics

Many-to-many relationship.

---

## seed_sets

Allows multiple independent research experiments.

Examples:

* pilot_v1
* biology
* graphics
* relativity
* tpms
* visualization_v2

---

## work_roles

Human classifications.

Possible values might include:

* terminal paper
* bridge paper
* mathematical root
* review
* historical milestone
* computational milestone
* experimental milestone
* excluded

Include:

* confidence
* rationale
* reviewer
* review_date

---

## paper_tags

Flexible labels that are not mutually exclusive.

Examples:

* visualization_candidate
* favorite
* needs_manual_review
* historically_significant
* engineering
* biology
* graphics
* relativity
* geometry
* translation
* computational

---

## edge_annotations

Human interpretation of citation edges.

Possible relation types:

* mathematical theorem
* geometric construction
* computational method
* historical attribution
* experimental validation
* review citation
* conceptual inspiration

These should never overwrite the raw citation graph.

---

## research_notes

Free-form notes attached to papers or authors.

Useful for:

* reading notes
* observations
* unresolved questions
* visualization ideas
* conversations with mathematicians
* historical context

---

# Initial Workflow

For each seed paper:

1. Resolve OpenAlex work ID.
2. Store complete metadata.
3. Download references.
4. Download authors.
5. Download concepts.
6. Store raw JSON response.
7. Expand one citation generation backward.
8. Rank candidate bridge papers.
9. Manually review candidates.
10. Continue recursively only from retained bridge papers.

Avoid unrestricted recursive crawling.

The goal is a curated graph, not a complete one.

---

# Important Principles

Do not optimize for:

* largest graph
* most citations
* complete literature coverage

Instead optimize for:

* historical importance
* cross-disciplinary influence
* explainability
* reproducibility

A graph of 100 carefully chosen papers is preferable to a graph of 50,000 papers.

---

# Desired End State

The completed dataset should support analyses such as:

* earliest cross-disciplinary citations
* common mathematical ancestors (within minimal surfaces)
* bridge papers connecting disciplines
* centrality measures
* field migration over time
* collaboration network
* citation network
* timeline visualizations
* Sankey diagrams
* force-directed graphs
* manually curated narrative visualizations

The database, although not meant to be comprehensive, should become a reusable research resource rather than being built solely for one visualization. 

---

# Coding Philosophy

Prioritize:

* reproducibility
* readability
* version control
* small composable scripts
* deterministic outputs

Every analysis should be regenerable from the raw data.

Every manually curated decision should be recorded explicitly rather than hidden inside code.

Avoid one-off scripts wherever possible.

---

# Data Collection Philosophy

Storage is inexpensive.

Expert reading time is not.

When in doubt, preserve metadata that may later prove useful for historical or visual analysis, even if it is not immediately used.

Examples include:

* institutional affiliations
* publication venues
* geographic coordinates
* OpenAlex topics
* raw JSON responses
* harvesting timestamps

These provide future flexibility while keeping the raw evidence reproducible.

Every manually curated decision should be accompanied by enough context that another researcher could understand (or disagree with) the reasoning months or years later.

# Initial Seed Papers (Version 0.1)

This list is intended as a starting point for exploration rather than a definitive corpus.

The goal is to identify historically important papers that represent different routes by which ideas from minimal surface mathematics entered other disciplines.

These papers should be revisited and refined as the project develops.

For each paper we should attempt to resolve:

* OpenAlex ID
* DOI
* publication metadata
* references
* citations
* authors
* institutional affiliations
* concepts/topics

If multiple candidate papers emerge for the same branch, we should document why one is ultimately selected as the preferred "terminal paper."

---

## Candidate Terminal Papers

### Soft Matter / Lipid Cubic Phases

**From the Plateau Problem to Periodic Minimal Surfaces in Lipids, Surfactants and Diblock Copolymers**

* Gerd Gompper & Martin Schick
* 1996
* Candidate bridge paper connecting classical minimal surfaces to soft condensed matter.
* Search initially by title.

---

### Structural Chemistry

**Minimal Surfaces and Structures: From Inorganic and Metal Crystals to Cell Membranes and Biopolymers**

* Stephen Hyde et al.
* 1990
* DOI: 10.1021/cr00083a011

One of the most important attempts to connect minimal surfaces with chemistry and biology.

---

### Block Copolymers

**The Gyroid: A New Equilibrium Morphology in Weakly Segregated Diblock Copolymers**

* Hajduk et al.
* 1994

A landmark experimental connection between TPMS geometry and block copolymer morphology.

---

### Photonic Crystals

**Photonic Crystals Based on Triply Periodic Surfaces**

* Maldovan & Thomas
* 2004

Represents the migration of TPMS into optical materials.

---

### Optical Metamaterials

**Optical Properties of Gyroid Structured Materials: From Photonic Crystals to Metamaterials**

* Saba et al.
* 2015
* DOI: 10.1002/adom.201400333

Represents later engineering adoption.

---

### Biomembranes

Representative early work by **John Seddon** on inverse bicontinuous cubic phases.

To identify the most historically appropriate paper during literature review.

---

### Tissue Engineering

**Minimal Surface Scaffold Designs for Tissue Engineering**

* Hollister group
* 2011

Represents adoption into biomedical scaffold design.

---

### Porous Transport

Early work investigating permeability or transport properties of triply periodic minimal surface geometries.

Candidate to refine during exploration.

---

### Architecture

Representative work from **Frei Otto** on soap-film form finding.

Likely enters the project as a historical influence rather than an OpenAlex citation endpoint.

---

### Computer Graphics

**Computing Discrete Minimal Surfaces and Their Conjugates**

* Pinkall & Polthier
* 1993

Represents discrete differential geometry.

---

### Geometry Processing

**Implicit Fairing of Irregular Meshes Using Diffusion and Curvature Flow**

* Desbrun et al.
* 1999

Represents migration into computational geometry.

---

### Numerical Geometry

Representative work on numerical generation or optimization of triply periodic minimal surfaces.

Candidate to refine.

---

### General Relativity

Early work by **Richard Schoen and Shing-Tung Yau** applying minimal hypersurface techniques to relativity.

Representative paper to identify during exploration.

---

### Quantum Information

**Holographic Derivation of Entanglement Entropy**

* Ryu & Takayanagi
* 2006
* DOI: 10.1103/PhysRevLett.96.181602

Represents one of the most unexpected modern descendants of minimal surface mathematics.

---

### Historical Geometry

**Infinite Periodic Minimal Surfaces Without Self-Intersections**

* Alan Schoen
* NASA Technical Note D-5541
* 1970

Although not a terminal paper, this is expected to be one of the most important bridge papers and should almost certainly be included from the beginning.

---

# Pilot Dataset

Rather than beginning with all branches simultaneously, first test the methodology using five papers representing genuinely different mechanisms by which minimal surface mathematics entered other disciplines.

The purpose of this pilot is to determine:

* how well OpenAlex preserves the citation history,
* whether bridge papers naturally emerge,
* how quickly citation trees become unmanageably large,
* and whether the methodology requires refinement.

Recommended pilot papers:

### 1. Hyde et al. (1990)

Structural chemistry / biology

Reason:

One of the earliest broad syntheses connecting minimal surfaces with real physical structures.

---

### 2. Hajduk et al. (1994)

Block copolymers

Reason:

Represents experimental confirmation of TPMS morphology in polymers.

---

### 3. Pinkall & Polthier (1993)

Computer graphics / discrete geometry

Reason:

Tests whether computational geometry developed through the same mathematical lineage or a distinct one.

---

### 4. Ryu & Takayanagi (2006)

Quantum gravity

Reason:

Tests perhaps the most conceptually surprising migration of minimal surface mathematics.

---

### 5. Gompper & Schick (1996)

Soft condensed matter

Reason:

Likely to reveal bridge papers connecting classical geometry with physical chemistry.

---

# Goals of the Pilot

The first objective is **not** to build a beautiful graph.

Instead, the pilot should answer questions about the research methodology itself.

For each pilot paper we hope to learn:

* Does the citation graph preserve the mathematical lineage?
* How many generations back are needed before classical geometry appears?
* Which papers repeatedly emerge as bridges?
* Which influential transitions are missing from citation data alone?
* Which relationships will require manual historical reconstruction?

The answers to these questions will inform both the structure of the database and the design of the eventual visualization.
