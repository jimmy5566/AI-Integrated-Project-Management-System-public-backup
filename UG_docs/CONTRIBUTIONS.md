# Undergraduate Team Contributions

This file records the contributions of the undergraduate team members to the AI-Integrated Project Management System. Contributions are derived from `git log` filtered to each member's verified commit emails.

---

## Anh Khoa

**GitHub:** `markusle56` / `AnhKhoa`
**Email:** `anhkhoa.wm@gmail.com`
**Commits:** ~49

### What Anh Khoa built

**Backend — Database Schema & Data Model**
- Implemented the entire initial PostgreSQL schema(`9840c67`) covering all core domain tables: `users`, `employees`, `roles`, `projects`, `project_status_types`, `project_milestones`, `project_tasks`, `project_assignments`, `invoices`, `materials`, `subcontractors`, `time_logs`, `customers`
- Extended `ProjectAssignment` to carry `role_id` (`c5772c0`) — a model change that unblocked the workforce allocation feature and required updating all downstream relationships
- Added `audit_logs` -> `Project` relationship and set `ondelete CASCADE` on `project_id` in `AuditLog` (`21c60df`) to ensure referential integrity after Igie's migration

**Backend — Authentication API**
- Bootstrapped the entire FastAPI application with JWT OAuth2 authentication (`eaff0a5`)
- Implemented all five authentication endpoints: login, token validation, password recovery email, password reset, and admin HTML preview
- Set up the JWT signing/verification flow via `core/security.py` and the `CurrentUser` dependency in `deps.py` used by every protected route in the system

**Backend — Users API (full ownership)**
- Built the complete Users API (`a2b16e5`, `9840c67`): paginated admin list, create user, get/update/delete by ID, self-service profile update, self-service password change, and delete own account
- Added the `GET /users/all-users` endpoint and later removed its superuser gate (`32fdacf`) so the frontend's workforce dropdown could call it without admin credentials
- Added `GET /users/time_log/{date}` (`e69978f`) — aggregates total working hours per employee since a given date, used to populate the dashboard time-tracking panel
- Enhanced user creation process to support role assignment at creation time (`acfaf54`)

**Backend — Projects API (full ownership)**
- Built the complete Projects core API (`a2b16e5`): create, list with status filter, get single project, update, delete single, delete all
- Added date-range query endpoints: `GET /projects/overdue`, `GET /projects/expected-to-finish/{date}`
- Added admin summary endpoints: `GET /projects/all-project`, `GET /projects/current-project-num`, `GET /projects/completed-project`, `GET /projects/delay-project`
- Added `GET /projects/invoice-bill` (`b39ab00`) — computes current vs previous month invoice totals for the admin dashboard financial panel

**Backend — Workforce Allocation (integration ownership)**
- Took ownership of integrating Igie's workforce allocation backend into the app: refactored the legacy standalone workforce page into a project-scoped allocation route (`535b7aa`)
- Wired all three endpoints (POST/PATCH/DELETE) end-to-end from API to frontend (`3e85502`)
- Updated the API documentation to reflect the full workforce allocation spec after integration (`acfaf54`)

**Backend — Debugging & Cross-Team Integration**
- Debugged 16 logic bugs across both backend and frontend during the `codex/people-page-api-wireup` integration merge (`ab338cb`) — the largest single debugging session in the project
- Removed an unused import from the analytics route after Pav's commit (`7054030`)
- Performed merges of five separate feature branches into the integration branch across sprints

**Infrastructure & Deployment**
- Set up the full Docker Compose stack (`b969d4f`): backend, frontend, PostgreSQL, MailHog, and Traefik reverse proxy
- Wrote and maintained `prestart.sh` — runs `alembic upgrade head` and seeds the superuser account on every container start
- Fixed the `uv.lock` placement so Docker could resolve the backend's dependency lockfile (`a64b58d`, `a41217f`)
- Created an Alembic merge migration to resolve multi-head conflicts when multiple sprint branches each added migrations (`109ceae`)
- Cleaned up obsolete Alembic versions that were blocking upgrades (`63b37d0`)
- Fixed an Alembic runtime error caused by conflicting migration state (`d7dbd9e`)
- Secured all environment variables by removing hardcoded superuser passwords and secrets from source code (`109ceae`)
- Updated `start.sh` with all new environment variables required for sprint 5 services (`f83ac04`)
- Deploy frontend, backend, and database on cloud services

**Frontend**
- Restructured all frontend pages under the `/_authenticated/` route layout (`f49f318`) — this enforced authentication guards across the entire app
- Built the admin route and updated the route tree (`e360f03`)
- Implemented authentication checks and redirects in the settings and admin routes (`1fc07ed`)
- Added the `UserProfile` TypeScript type and improved loading state handling in the settings page (`78e2f91`)
- Refactored the dashboard layout, integrated the analytics tab, and rebuilt the invoice management panels in admin settings (`a0086f9`, `b39ab00`)
- Fixed broken navigation sidebar links after route restructuring (`655a726`)
- Refactored settings page and added environment configuration UI (`4e85316`)

---

## Yuzhe

**Git identities:** `Yuzhe Ma` / `jimmy5566`
**Email:** `a1918429@adelaide.edu.au`
**Commits:** ~23 across verified git identities

### What Yuzhe built

**Project setup and workflow support**
- Initialised project collaboration and planning documentation, including sprint foundation, user stories, deliverables, and project charter (`9ca1925`)
- Added repository and Jira workflow linkage notes for sprint tracking (`5c98565`)

**Frontend — Admin dashboard and admin flows**
- Redesigned the admin dashboard, especially the Projects and People admin views layout (`1c989dc`, `171ab3c`)
- Refined dashboard and admin navigation flows, sidebar behavior, and admin route structure (`6079286`)
- Added admin settings preference displays and documented API gaps for missing backend support (`a3f3e7a`)

**Frontend — People page integration**
- Wired the People page to the live `/employees/` and `/customers/` APIs (`d3827a1`)
- Added the frontend people API client and updated the authenticated People page to use real backend data instead of placeholder wiring (`d3827a1`)
- Added backend tests for employee and customer API routes as part of the people-page integration work (`d3827a1`)

**Frontend — Workforce allocation integration**
- Fixed workforce allocation UI persistence so assignments remain after reload (`38ff441`)
- Removed hardcoded workforce names and switched workforce-related displays to API-backed data (`d921fa8`)
- Connected the workforce allocation UI to real API-backed behavior across project detail and workforce routes (`38ff441`, `d921fa8`)

**Frontend — Roles and people management**
- Wired the People page role selector and related admin flows to the available roles and people-management APIs (`6079286`)
- Updated the Add User and Edit User flows alongside the admin People and Settings pages to support the revised dashboard structure (`6079286`)

---

## Igie

**GitHub:** `StackTracerQwQ`
**Email:** `igie.manlangit@yahoo.com.au`
**Commits:** ~8

### What Igie built

**Backend — Workforce Allocation API**
- Implemented all three workforce allocation mutation endpoints (`POST`, `PATCH`, `DELETE` on `/project/{project_id}/workforce-allocate`) with full audit logging on every change
- Extended the permission model so that project managers (not just superusers) can manage assignments
- Created the Alembic migration for the `project_assignments` table and `audit_logs` table

**Backend — Work Hours API**
- Implemented the complete Work Hours API (`add`, `update`, `remove`, `analytics`) on `/project/{project_id}/work-hours/`
- `add` accumulates hours on an existing log; `update` overwrites; prevents logging hours for employees not assigned to the project
- The analytics endpoint returns per-employee totals broken down by day, week, and month for a given reference date

**Database Migrations**
- `audit_logs` table — records every workforce allocation change with action type, affected users, caller, and timestamp
- `project_tasks` (subtask) table — initial model and relationships
- Subtask assignment models + PATCH endpoint — permission-guarded task workforce assignment

---

## Pav

**GitHub:** `pavneet714`
**Email:** `a1912165@adelaide.edu.au`
**Commits:** ~7

### What Pav built

**Backend — Analytics API**
- Designed and implemented the entire analytics route file (`analytics.py`, 272 lines) covering all 7 analytics endpoints:
  - `/analytics/dashboard-summary` — active project count, high-risk projects, overdue tasks, pending materials, uninvoiced projects, average workload hours
  - `/analytics/risks` — per-project risk score calculated from overdue milestones, pending materials, and deadline proximity; sorted by score
  - `/analytics/project-health` — project status distribution and milestone progress breakdown (todo / in progress / review / done)
  - `/analytics/workload` — per-employee monthly hours with overload detection (>160 hrs)
  - `/analytics/revenue-leakage` — projects with uninvoiced revenue gap
  - `/analytics/material-delays` — pending materials sorted by days waiting
  - `/analytics/deadline-trend` — 7-week rolling risk level chart data
- Also wired the analytics router into the API and updated `.env` for the analytics feature

**Frontend — Analytics & Workforce**
- Built the Analytics dashboard page UI
- Built the Workforce Allocation UI through three iterations:
  - Initial build: assignment form and employee list layout
  - Polish pass: integration-ready with backend
  - Large refactor: `workforce.tsx` overhauled (873 additions) for final integration
- Fixed a login route conflict that blocked authentication flow

---

## Summary Table

| Contribution Area | Anh Khoa | Yuzhe | Igie | Pav |
|------------------|----------|-------|------|-----|
| Initial repo + CI | ✅ FastAPI scaffold | ✅ Project docs, Jira workflow notes | — | — |
| Database schema | ✅ All tables | — | ✅ audit_logs, tasks | — |
| Authentication API | ✅ | — | — | — |
| Users API | ✅ | — | — | — |
| Projects API (core) | ✅ | — | — | — |
| Workforce Allocation API | ✅ Integration | — | ✅ Endpoints | — |
| Work Hours API | — | — | ✅ | — |
| Analytics API | — | — | — | ✅ |
| Deployment / Docker | ✅ | — | — | — |
| Admin / Auth frontend | ✅ | ✅ UI redesign and admin flows | — | — |
| People / Roles frontend | — | ✅ | — | — |
| Workforce UI | ✅ Wiring | ✅ Persistence and API-backed workforce views | — | ✅ UI |
| Analytics frontend | — | — | — | ✅ |

---

## Postgraduate Contributors (for reference)

The following contributors are postgraduate team members whose work is not the focus of this document:

| Name | GitHub / Git Identity | Key Contributions |
|------|-----------------------|------------------|
| **Leslie** | `Leslie2101` / `MilkteaForLife` | Project CRUD API, materials API, frontend integration (subcontractors, tasks, project pages), visibility rules |
| **Jerry Xie** | `Jerry Xie` | Email notification system, invoice alert job, deadline scheduler, project API integration on frontend |
| **Lee-yongli** | `Lee-yongli` | Task management API (milestones, tasks), Roles API, task visibility, timeline/Gantt chart frontend |
| **Nevil Bhalodia** | `nevil bhalodia` | Full frontend UI scaffold (dashboard, projects, task board, new project wizard, GAMA branding) |
| **Anh Ho** | `AnhHo1801367` | AI chatbot backend + frontend integration |
