# AI-Integrated Project Management System

A full-stack engineering project management platform built with **FastAPI**, **React + TypeScript**, and **PostgreSQL**, running fully containerised with Docker Compose.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Quick Start (Development)](#quick-start-development)
- [Environment Configuration](#environment-configuration)
- [Service URLs](#service-urls)
- [Useful Commands](#useful-commands)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend API | FastAPI (Python 3.10+) |
| ORM | SQLModel + Alembic |
| Database | PostgreSQL 18 |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Package manager | Bun (frontend), uv (backend) |
| Container runtime | Docker Compose with Watch mode |
| Reverse proxy | Traefik |
| Auth | JWT (OAuth2 Password Bearer) |

---

## Prerequisites

Install all of these before you start:

| Tool | Min Version | Install |
|---|---|---|
| **Docker Desktop** | 4.29+ | [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop) |
| **Git** | any | [git-scm.com](https://git-scm.com) |

> Docker Desktop 4.29+ ships Docker Compose v2.24+ which includes the `watch` command. No separate `docker-compose` binary is needed.

Verify before starting:

```bash
docker --version        # Docker version 27.x or higher
docker compose version  # Docker Compose version v2.24 or higher
```

---

## Quick Start (Development)

### 1. Clone the repository

```bash
git clone https://github.com/Adelaide-University-ICT-Capstone/AI-Integrated-Project-Management-System.git
cd AI-Integrated-Project-Management-System
```

### 2. Enter the fullstack directory

```bash
cd fullstack
```

### 3. Configure environment

The `.env` file already has safe local defaults. Before your first run, update these three secrets:

```env
SECRET_KEY=changethis              # generate: python -c "import secrets; print(secrets.token_urlsafe(32))"
FIRST_SUPERUSER_PASSWORD=changethis
POSTGRES_PASSWORD=changethis
```

### 4. Start with Docker Compose Watch

```bash
docker compose watch
```

This single command:

1. Builds all images (first run takes ~2–3 minutes)
2. Starts PostgreSQL, the backend API, and the frontend
3. Runs `prestart.sh` — applies all Alembic migrations and seeds the superuser account
4. Enables **live sync**: edits to backend files are synced into the running container immediately; FastAPI reloads automatically

> **How watch works:**
> - Changes in `backend/` → synced live, no rebuild
> - Changes in `backend/pyproject.toml` → triggers a full image rebuild
> - Frontend changes → rebuild the frontend image

To run **without** watch (detached):

```bash
docker compose up -d --build
```

---

## Environment Configuration

All configuration lives in `fullstack/.env`:

| Variable | Default | Description |
|---|---|---|
| `DOMAIN` | `localhost` | Base domain for Traefik routing |
| `ENVIRONMENT` | `local` | `local`, `staging`, or `production` |
| `SECRET_KEY` | `changethis` | JWT signing key |
| `FIRST_SUPERUSER` | `admin@example.com` | Initial admin account email |
| `FIRST_SUPERUSER_PASSWORD` | `changethis` | Initial 

---

## Service URLs

| Service | URL | Notes |
|---|---|---|
| **Frontend** | http://localhost:5173 | React dashboard |
| **Backend API** | http://localhost:8000 | FastAPI |
| **Swagger UI** | http://localhost:8000/docs | Interactive API docs (auto-generated) |
| **Mail Catcher** | http://localhost:1080 | Catches outgoing emails in dev |

---

## Project Structure

```
fullstack/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── deps.py          # Auth dependencies (JWT, DB session)
│   │   │   ├── main.py          # Router registration
│   │   │   └── routes/          # Endpoint handlers per domain
│   │   ├── alembic/
│   │   │   └── versions/        # Database migration files
│   │   ├── core/
│   │   │   ├── config.py        # Settings loaded from .env
│   │   │   ├── db.py            # SQLAlchemy engine + init_db
│   │   │   └── security.py      # Password hashing, JWT encode/decode
│   │   ├── crud/                # Database query functions
│   │   ├── models.py            # SQLModel table + schema definitions
│   │   └── main.py              # FastAPI app entry point
│   ├── scripts/
│   │   └── prestart.sh          # Runs migrations + seeds superuser on startup
│   ├── pyproject.toml           # Python dependencies (managed by uv)
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── api/                 # Typed API client functions
│   │   ├── routes/              # TanStack Router pages
│   │   └── components/          # Shared UI components
│   ├── package.json             # JS dependencies (managed by Bun)
│   └── Dockerfile
├── compose.yml                  # Base service definitions
├── compose.override.yml         # Local dev overrides + watch config
└── .env                         # Environment variables (not committed)
```

---

## API Documentation

The backend auto-generates interactive docs at runtime — no static file needed for day-to-day use:

- **Swagger UI**: http://localhost:8000/docs — try endpoints directly in the browser
- **OpenAPI schema**: http://localhost:8000/openapi.json

For a static endpoint reference see [fullstack/API_DOCUMENTATION.md](fullstack/API_DOCUMENTATION.md).
