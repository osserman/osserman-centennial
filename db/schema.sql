-- =============================================================================
-- Minimal Surface Lineages — database schema
-- =============================================================================
--
-- The database separates three layers (see projectDescription.md):
--
--   1. RAW EVIDENCE      — harvested from OpenAlex; written only by harvest
--                          scripts; every row carries source_json + harvested_at;
--                          never edited by hand, never overwritten by analysis.
--   2. EXPERIMENT BOOKKEEPING — which works belong to which seed set, at what
--                          generation, and why they were harvested.
--   3. HUMAN INTERPRETATION — roles, tags, edge annotations, notes; written only
--                          by humans (or scripts acting on explicit human input);
--                          never written by harvest scripts.
--
-- Derived analyses (rankings, centralities, ...) are NOT stored here; they are
-- regenerated from this database into reports/ by scripts.
--
-- OpenAlex IDs are stored bare (e.g. "W2036864133", "A5023888391"), without the
-- https://openalex.org/ prefix.

PRAGMA foreign_keys = ON;

-- =============================================================================
-- LAYER 1: RAW EVIDENCE
-- =============================================================================

CREATE TABLE IF NOT EXISTS works (
    openalex_id      TEXT PRIMARY KEY,
    doi              TEXT,             -- bare DOI, lowercased, no https://doi.org/ prefix
    title            TEXT,
    publication_year INTEGER,
    publication_date TEXT,
    source_id        TEXT,             -- venue; FK-ish to sources (may be a stub or NULL)
    type             TEXT,             -- OpenAlex work type (article, book-chapter, report, ...)
    language         TEXT,
    abstract         TEXT,             -- reconstructed from OpenAlex abstract_inverted_index
    cited_by_count   INTEGER,
    is_open_access   INTEGER,          -- 0/1
    -- is_stub = 1: this work is known only as a referenced OpenAlex ID; full
    -- metadata has not been fetched. Stubs keep the citation graph closed under
    -- foreign keys at the harvest frontier.
    is_stub          INTEGER NOT NULL DEFAULT 0,
    source_json      TEXT,             -- verbatim OpenAlex work JSON (NULL for stubs)
    harvested_at     TEXT              -- ISO-8601 UTC timestamp of the full-metadata fetch
);

CREATE TABLE IF NOT EXISTS authors (
    openalex_id    TEXT PRIMARY KEY,
    display_name   TEXT,
    orcid          TEXT,
    works_count    INTEGER,
    cited_by_count INTEGER,
    source_json    TEXT,
    harvested_at   TEXT
);

CREATE TABLE IF NOT EXISTS institutions (
    openalex_id      TEXT PRIMARY KEY,
    display_name     TEXT,
    country_code     TEXT,
    country          TEXT,
    region           TEXT,
    city             TEXT,
    latitude         REAL,
    longitude        REAL,
    institution_type TEXT,
    ror              TEXT,
    wikidata         TEXT,
    homepage         TEXT,
    works_count      INTEGER,
    cited_by_count   INTEGER,
    source_json      TEXT,
    harvested_at     TEXT
);

CREATE TABLE IF NOT EXISTS sources (
    openalex_id    TEXT PRIMARY KEY,
    display_name   TEXT,
    publisher      TEXT,
    issn           TEXT,             -- JSON array of ISSNs as stored by OpenAlex
    is_open_access INTEGER,
    works_count    INTEGER,
    cited_by_count INTEGER,
    source_json    TEXT,
    harvested_at   TEXT
);

-- One row per (work, author, institution) triple as reported on the publication
-- itself: affiliations are per-publication, not per-author.
CREATE TABLE IF NOT EXISTS work_authorships (
    work_id                TEXT NOT NULL REFERENCES works(openalex_id),
    author_id              TEXT NOT NULL REFERENCES authors(openalex_id),
    institution_id         TEXT REFERENCES institutions(openalex_id),
    author_position        TEXT,      -- first / middle / last
    is_corresponding       INTEGER,   -- 0/1
    raw_affiliation_string TEXT,
    PRIMARY KEY (work_id, author_id, institution_id)
);

-- Directed citation graph: citing_work_id cites cited_work_id.
-- (projectDescription.md calls this table "references"; renamed because
-- REFERENCES is a SQL keyword.)
CREATE TABLE IF NOT EXISTS work_references (
    citing_work_id TEXT NOT NULL REFERENCES works(openalex_id),
    cited_work_id  TEXT NOT NULL REFERENCES works(openalex_id),
    PRIMARY KEY (citing_work_id, cited_work_id)
);

CREATE INDEX IF NOT EXISTS idx_work_references_cited
    ON work_references(cited_work_id);

-- OpenAlex legacy concepts (still returned on works as of harvest time).
CREATE TABLE IF NOT EXISTS concepts (
    openalex_id  TEXT PRIMARY KEY,
    display_name TEXT,
    level        INTEGER,
    wikidata     TEXT
);

CREATE TABLE IF NOT EXISTS work_concepts (
    work_id    TEXT NOT NULL REFERENCES works(openalex_id),
    concept_id TEXT NOT NULL REFERENCES concepts(openalex_id),
    score      REAL,
    PRIMARY KEY (work_id, concept_id)
);

-- OpenAlex topics, with their subfield/field/domain hierarchy denormalized.
CREATE TABLE IF NOT EXISTS topics (
    openalex_id   TEXT PRIMARY KEY,
    display_name  TEXT,
    subfield_id   TEXT,
    subfield_name TEXT,
    field_id      TEXT,
    field_name    TEXT,
    domain_id     TEXT,
    domain_name   TEXT
);

CREATE TABLE IF NOT EXISTS work_topics (
    work_id    TEXT NOT NULL REFERENCES works(openalex_id),
    topic_id   TEXT NOT NULL REFERENCES topics(openalex_id),
    score      REAL,
    is_primary INTEGER NOT NULL DEFAULT 0,   -- 1 for the work's primary_topic
    PRIMARY KEY (work_id, topic_id)
);

-- Provenance: one row per API request, also used for rate-limit budgeting.
CREATE TABLE IF NOT EXISTS harvest_log (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    requested_at TEXT NOT NULL,       -- ISO-8601 UTC
    url          TEXT NOT NULL,       -- full request URL (params included, mailto stripped)
    status_code  INTEGER,
    result_count INTEGER,             -- works returned (list endpoints) or 1/0
    script       TEXT,                -- which script issued the request
    note         TEXT
);

-- =============================================================================
-- LAYER 2: EXPERIMENT BOOKKEEPING
-- =============================================================================

CREATE TABLE IF NOT EXISTS seed_sets (
    id          TEXT PRIMARY KEY,     -- e.g. "pilot_v1"
    description TEXT,
    created_at  TEXT
);

CREATE TABLE IF NOT EXISTS seed_set_works (
    seed_set_id TEXT NOT NULL REFERENCES seed_sets(id),
    work_id     TEXT NOT NULL REFERENCES works(openalex_id),
    generation  INTEGER NOT NULL,     -- 0 = seed, 1 = first backward expansion, ...
    added_via   TEXT,                 -- script or decision that added it
    added_at    TEXT,
    PRIMARY KEY (seed_set_id, work_id)
);

-- =============================================================================
-- LAYER 3: HUMAN INTERPRETATION
-- (never written by harvest scripts; every judgment carries rationale + reviewer)
-- =============================================================================

CREATE TABLE IF NOT EXISTS work_roles (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    work_id     TEXT NOT NULL REFERENCES works(openalex_id),
    role        TEXT NOT NULL,        -- terminal_paper / bridge_paper / mathematical_root /
                                      -- review / historical_milestone / computational_milestone /
                                      -- experimental_milestone / excluded
    confidence  TEXT,                 -- high / medium / low
    rationale   TEXT,
    reviewer    TEXT,
    review_date TEXT
);

CREATE TABLE IF NOT EXISTS paper_tags (
    work_id  TEXT NOT NULL REFERENCES works(openalex_id),
    tag      TEXT NOT NULL,           -- free vocabulary, e.g. visualization_candidate, favorite
    added_by TEXT,
    added_at TEXT,
    PRIMARY KEY (work_id, tag)
);

-- Interpretation of citation edges; annotates, never replaces, work_references.
CREATE TABLE IF NOT EXISTS edge_annotations (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    citing_work_id TEXT NOT NULL REFERENCES works(openalex_id),
    cited_work_id  TEXT NOT NULL REFERENCES works(openalex_id),
    relation_type  TEXT,              -- mathematical_theorem / geometric_construction /
                                      -- computational_method / historical_attribution /
                                      -- experimental_validation / review_citation /
                                      -- conceptual_inspiration
    rationale      TEXT,
    reviewer       TEXT,
    review_date    TEXT
);

CREATE TABLE IF NOT EXISTS research_notes (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    work_id    TEXT REFERENCES works(openalex_id),      -- optional anchor
    author_id  TEXT REFERENCES authors(openalex_id),    -- optional anchor
    note       TEXT NOT NULL,
    created_by TEXT,
    created_at TEXT
);
