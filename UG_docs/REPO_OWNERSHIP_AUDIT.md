# Repository Ownership Audit

## Scope

This audit is based on the local repository state on `codex/people-page-api-wireup`, the reachable Git history in the local clone, and the current file tree.

This is a **Git-attribution audit**, not a legal authorship opinion. It answers:

- which code is attributable to `jimmy5566` in repository history
- which modules are attributable to other contributors
- which parts are template, generated, or dependency material

## Current Git Setup

- Local `origin`: `https://github.com/jimmy5566/AI-Integrated-Project-Management-System-public-backup.git`
- Local `upstream`: `https://github.com/StackTracerQwQ/AI-Integrated-Project-Management-System.git`
- Current branch: `codex/people-page-api-wireup`
- Working tree status: clean
- Untracked local material: `UG_docs/CONTRIBUTIONS.md`

## What Is Clearly Attributable To `jimmy5566`

### Direct Git-attributed changes

Only two reachable commits in the local repository are directly authored by `jimmy5566 <145540349+jimmy5566@users.noreply.github.com>`:

1. `ec81422b9d7230cc4a23a7539b942243edd3ca53`  
   `Initial commit`
2. `287d6d892d6838057e4212efdbbca2006e6aa175`  
   `Merge pull request #1 from jimmy5566/SCRUM-27-connect-repo-workflow`

Both of those commits touch only:

- `README.md`

### Local private material not yet part of Git history

- `UG_docs/CONTRIBUTIONS.md`

## What Is Not Attributable To `jimmy5566`

At the current state of the repository, all core application code is attributable to other contributors or to upstream template material.

### 1. Upstream template and scaffold code

These sections are inherited framework/template infrastructure rather than personal code:

- `fullstack/.copier/`
- `fullstack/.github/`
- `fullstack/hooks/`
- `fullstack/scripts/`
- `fullstack/compose*.yml`
- `fullstack/backend/Dockerfile`
- `fullstack/backend/alembic.ini`
- `fullstack/backend/app/core/`
- `fullstack/backend/tests/`
- `fullstack/frontend/tests/`
- `fullstack/frontend/src/client/`
- `fullstack/frontend/src/components/ui/`
- `fullstack/frontend/public/assets/images/fastapi-*`
- `fullstack/img/`
- `fullstack/LICENSE`
- `fullstack/CONTRIBUTING.md`
- `fullstack/SECURITY.md`
- `fullstack/development.md`
- `fullstack/deployment.md`
- `fullstack/release-notes.md`
- `fullstack/README.md`

These files strongly match the structure of `fastapi/full-stack-fastapi-template`, and the copied template README is still present in `fullstack/README.md`.

### 2. Team-authored backend business modules

These are project-specific backend modules, but they are not attributable to `jimmy5566` in Git history:

- `fullstack/backend/app/models.py`
- `fullstack/backend/app/api/routes/admin.py`
- `fullstack/backend/app/api/routes/customers.py`
- `fullstack/backend/app/api/routes/employees.py`
- `fullstack/backend/app/api/routes/invoices.py`
- `fullstack/backend/app/api/routes/items.py`
- `fullstack/backend/app/api/routes/login.py`
- `fullstack/backend/app/api/routes/materials.py`
- `fullstack/backend/app/api/routes/notifications.py`
- `fullstack/backend/app/api/routes/private.py`
- `fullstack/backend/app/api/routes/project_subtasks.py`
- `fullstack/backend/app/api/routes/projects.py`
- `fullstack/backend/app/api/routes/roles.py`
- `fullstack/backend/app/api/routes/statuses.py`
- `fullstack/backend/app/api/routes/subcontractors.py`
- `fullstack/backend/app/api/routes/users.py`
- `fullstack/backend/app/api/routes/workforce_allocate.py`
- `fullstack/backend/app/crud/invoices.py`
- `fullstack/backend/app/crud/materials.py`
- `fullstack/backend/app/crud/projects.py`
- `fullstack/backend/app/crud/project_statuses.py`
- `fullstack/backend/app/crud/subcontractors.py`
- `fullstack/backend/app/crud/users.py`
- `fullstack/backend/app/crud/workforce_allocate.py`
- `fullstack/backend/app/alembic/versions/*.py`

### 3. Team-authored frontend business modules

These are current app features built by other contributors:

- `fullstack/frontend/src/api/people.ts`
- `fullstack/frontend/src/api/project.ts`
- `fullstack/frontend/src/api/taskManagement.ts`
- `fullstack/frontend/src/api/workforce.ts`
- `fullstack/frontend/src/api/workforceAllocation.ts`
- `fullstack/frontend/src/api/materials.ts`
- `fullstack/frontend/src/api/invoices.ts`
- `fullstack/frontend/src/api/subcontractors.ts`
- `fullstack/frontend/src/api/users.ts`
- `fullstack/frontend/src/routes/_authenticated/people.tsx`
- `fullstack/frontend/src/routes/_authenticated/projects/`
- `fullstack/frontend/src/routes/_authenticated/tasks.tsx`
- `fullstack/frontend/src/routes/_authenticated/subcontractors.tsx`
- `fullstack/frontend/src/routes/_authenticated/ai-assistant.tsx`
- `fullstack/frontend/src/routes/_authenticated/admin*.tsx`
- `fullstack/frontend/src/components/Admin/`
- `fullstack/frontend/src/components/Items/`
- `fullstack/frontend/src/components/Pending/`
- `fullstack/frontend/src/components/Sidebar/`
- `fullstack/frontend/src/components/UserSettings/`
- `fullstack/frontend/src/components/Common/`

### 4. Generated and dependency material

These should not be treated as authored feature code:

- `node_modules/`
- `package-lock.json`
- `fullstack/package-lock.json`
- `fullstack/frontend/pnpm-lock.yaml`
- `fullstack/bun.lock`
- `fullstack/uv.lock`
- `fullstack/frontend/src/routeTree.gen.ts`
- `fullstack/frontend/src/client/*.gen.ts`

## Primary Historical Contributors

Across reachable history, the dominant contributors are:

- Leslie2101 / MilkteaForLife
- Markus
- Lee-yongli
- nevil bhalodia
- igiemanlangit
- Yuzhe Ma
- pavneet
- Jerry Xie

By raw reachable commit count, `jimmy5566` contributes only a very small portion of the tracked history.

## Practical Ownership Classification

### Safe to classify as personal material now

- `UG_docs/CONTRIBUTIONS.md`
- future documentation, redesign notes, migration plans, and refactors created in your personal repo from this point onward

### Safe to classify as inherited base

- all template/scaffold files under `fullstack/` that came from the FastAPI full-stack template
- generated client code
- dependency trees and lockfiles

### Safe to classify as teammate-authored project logic

- current business backend routes, CRUD layers, models, and migrations
- current frontend pages and feature modules for people, projects, tasks, admin, subcontractors, materials, invoices, and AI assistant

## Recommendation For A Better Personal Project

Do **not** present the current repository as if the whole codebase were originally yours. Instead, treat it as an inherited base and convert it into a new personal mainline.

### Recommended approach

1. Keep the current repository as a reference baseline.
2. Continue all new work in the personal repo only.
3. Create a clear `PERSONAL_REWRITE.md` or similar roadmap.
4. Re-own the application module by module with fresh commits under your identity.
5. Replace or heavily refactor inherited modules instead of only cosmetically editing them.
6. Remove committed dependencies like `node_modules/` from version control.
7. Remove or regenerate generated clients when the API stabilizes.
8. Rotate secrets and eliminate secret-bearing history from anything that might become public-facing.

### Best candidates to keep

- overall backend/frontend split
- FastAPI + React + PostgreSQL stack
- auth shell
- people directory concept
- project/workforce/task domain model

### Best candidates to rewrite first

- `fullstack/frontend/src/api/project.ts`
  - currently shows duplicated request interceptor registration and inconsistent style
- `fullstack/backend/app/models.py`
  - very large central schema file that should be decomposed by domain
- `fullstack/frontend/src/routes/_authenticated/`
  - pages are feature-rich enough to keep as product inspiration, but should be re-owned or refactored deliberately
- `fullstack/backend/app/api/routes/` and `fullstack/backend/app/crud/`
  - split into clearer domain modules with tighter response contracts

## Should A Local Private Copy Be Kept?

Yes.

### Recommended repository strategy

- Keep one **public sanitized repo** for portfolio and active personal development.
- Keep one **local private archival copy** that is never pushed publicly.

### Why a private local copy is still useful

- it preserves the full original history for reference
- it preserves teammate work attribution accurately
- it preserves any internal notes or unpublished audit material
- it gives a rollback point before major rewrites
- it avoids losing context when the public repo is cleaned up or rewritten

### Best rule for the private copy

- never connect the private archive to a public `origin`
- never push `.env` or other secret-bearing history into a public repository
- treat the private copy as read-only reference unless a private-only recovery task is needed
