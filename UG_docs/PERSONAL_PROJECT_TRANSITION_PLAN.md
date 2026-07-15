# Personal Project Transition Plan

## Goal

Turn this repository from an inherited team/template codebase into a credible personal project with:

- a clean personal development direction
- clearer ownership boundaries
- safer public-repo hygiene
- a progressively re-authored application core

## Current Reality

The repository is not a clean personal-origin project yet.

- the public remote repository is personal and detached from the shared GitHub repository
- the local codebase still carries shared history and shared authorship
- the runtime/application structure is useful, but much of the implementation is inherited
- secret-bearing history exists in the old lineage, so public publishing must remain sanitized

## Transition Principles

1. Be accurate about authorship.
2. Keep the useful architecture, not the accidental mess.
3. Re-own the codebase through meaningful rewrites, not cosmetic edits.
4. Separate archive/reference material from active personal development.
5. Keep public history sanitized and presentable.

## Recommended Repo Strategy

### 1. Archive lane

Keep one local archival copy of the current repository with the original historical context intact.

Use it for:

- reference
- provenance checking
- old implementation lookup
- migration assistance

Do not use it as the main public development branch.

### 2. Active personal lane

Use the personal GitHub repository as the long-term public home of the project.

Use it for:

- rewritten modules
- improved architecture
- product polish
- portfolio-ready history

## Rewrite Priorities

### Priority A: Repository hygiene

- remove committed dependency directories from version control
- make sure `.env`-style files are never committed publicly
- reduce template leftovers that still describe the upstream scaffold rather than this product
- standardize README and setup flow around the personal repository

### Priority B: Backend structure

Target:

- split `fullstack/backend/app/models.py` into domain-focused model modules
- separate schemas, tables, and response objects more clearly
- simplify route-level responsibilities in `fullstack/backend/app/api/routes/`
- tighten CRUD/service boundaries

### Priority C: Frontend structure

Target:

- normalize API layer style under `fullstack/frontend/src/api/`
- remove duplicated request setup
- reorganize route modules into cleaner feature folders
- replace template-oriented UI assumptions with product-specific UX

### Priority D: Product identity

Target:

- rewrite product copy and documentation
- choose clear differentiators for the personal version
- refine People, Projects, Workforce, and Task Management into a coherent product story

## Suggested Execution Order

1. Lock in ownership/audit documentation.
2. Clean repository metadata and documentation.
3. Clean version-control hygiene issues.
4. Refactor backend domain boundaries.
5. Refactor frontend feature boundaries.
6. Redesign key product workflows.
7. Publish only the sanitized, personal mainline.

## Definition Of “Personalized Enough”

This project becomes meaningfully personal when:

- the public repository no longer depends on shared-history presentation
- the main architecture and docs reflect your direction
- the highest-value modules have been substantially rewritten under your authorship
- template residue is reduced to infrastructure rather than identity
- the public repo can be shown without authorship ambiguity
