# AssisList

Self-hosted productivity system: capture tasks from WhatsApp (text/voice) or
your AI agent, let the agent break them into context-rich subtasks with
urgency and dependencies, and manage everything in a clean mobile-first web
app.

[![CI](https://github.com/cosmicshuai/assislist/actions/workflows/ci.yml/badge.svg)](https://github.com/cosmicshuai/assislist/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/docker-ghcr.io%2Fcosmicshuai%2Fassislist-blue?logo=docker)](https://github.com/cosmicshuai/assislist/pkgs/container/assislist)

- **Project-first model**: `project → parent task → child task → …` — every
  task carries the same `project_id`; arbitrary nesting depth.
- **Agent-friendly API**: stable IDs, machine-readable status/urgency,
  dependency edges, and a dedicated agent token scope so AI agents can add
  work without touching your manual tasks.
- **One-command install**: Docker Compose brings up the API, web UI, and
  PostgreSQL together.

## Quickstart (Docker Compose — recommended)

Requirements: Docker with Compose v2.

```bash
git clone https://github.com/cosmicshuai/assislist.git
cd assislist
cp .env.example .env

# Generate the two required secrets and write them into .env:
echo "TODO_API_TOKEN=$(openssl rand -hex 32)" >> .env
echo "POSTGRES_PASSWORD=$(openssl rand -hex 32)" >> .env
# (delete the placeholder lines .env.example ships with)
# Optionally set TODO_AGENT_TOKEN for agent-scoped writes.

docker compose up -d
```

Open <http://localhost:3456> and paste your `TODO_API_TOKEN` once to unlock
the UI — the server exchanges it for an `httpOnly` session cookie, so the
token is never stored in the page.

Liveness: <http://localhost:3456/api/v1/health>.
Readiness (includes the database): <http://localhost:3456/api/v1/ready>.

The app auto-runs database migrations on first boot. Your data lives in the
`pgdata` Docker volume — it survives `docker compose down` and is removed
only with `docker compose down -v`.

### Upgrading

```bash
docker compose pull      # fetch the newest image
docker compose up -d
# Back up your data first (see Backups).
```

## Manual install (advanced)

Requires Node.js 22+ and PostgreSQL 16.

```bash
# Server
cd server
cp .env.example .env     # set DATABASE_URL, TODO_API_TOKEN (openssl rand -hex 32)
npm install
npm run migrate
npm start                # API on :3456

# Client (dev)
cd client
cp .env.example .env     # no secrets here — the client ships no credential
npm install
npm run dev              # Vite dev server with /api proxy
# Open the app and paste TODO_API_TOKEN once to unlock it.
```

For production, build the client and let Express serve it on the same port:

```bash
cd client && npm run build
# server serves client/dist on :3456 automatically
```

## Architecture

```
WhatsApp / AI agent ──▶ capture skill (transcribe + research + breakdown)
                              │  POST /api/v1/captures  (Bearer TODO_AGENT_TOKEN)
                              ▼
                      Express 5 (ESM) server :3456
                              │  authMiddleware → actor: user | agent
                              ▼
              PgProjectRepository + PgTaskRepository (drizzle-orm + pg)
                              ▼
                          PostgreSQL 16
                              ▲
                  React + Vite + MUI + PWA (client/)
```

## Stack

- **Server**: Node 22+, Express 5 (ESM), drizzle-orm + node-postgres
- **DB**: PostgreSQL 16
- **Client**: React + Vite + MUI (Material 3) + PWA
- **Development**: spec-driven development (see `specs/`)

## Model

- **projects**: first-class entity (id, title, context, status
  active/completed/abandoned/archived, priority, urgency, due, source).
- **tasks**: belong to exactly one project (`project_id` NOT NULL FK,
  cascade); `parent_id` gives arbitrary-depth nesting. Root tasks
  (`parent_id IS NULL`) are a project's "parent tasks".
- Archive lives on the project: archived projects are hidden from the active
  board and excluded from recommendations; their tasks are preserved.

## API (v1)

Auth: `Authorization: Bearer <token>` on all endpoints except `/api/v1/health`.

| Method | Path | Purpose |
|---|---|---|
| GET | /api/v1/health | liveness |
| GET | /api/v1/auth/session | is this browser unlocked? (no auth) |
| POST | /api/v1/auth/login | exchange the user token for a session cookie (no auth) |
| POST | /api/v1/auth/logout | clear the session cookie |
| GET | /api/v1/projects | list (excludes archived by default; ?archived=true) |
| GET | /api/v1/projects/:id | detail + root tasks + counts |
| POST | /api/v1/projects | create project (user only; agent 403) |
| PATCH | /api/v1/projects/:id | update project (agent 403) |
| PATCH | /api/v1/projects/:id/archive | archive (agent 403) |
| PATCH | /api/v1/projects/:id/restore | restore (agent 403) |
| DELETE | /api/v1/projects/:id | delete project (cascades all tasks; agent 403) |
| POST | /api/v1/captures | AI breakdown → project + root tasks, or task tree under existing project_id |
| GET | /api/v1/tasks | list + filters (status, priority, urgency, due, q, project_id, parent_id, sort) |
| GET | /api/v1/tasks/:id | detail + children + blocked_by + blocks |
| POST | /api/v1/tasks | create single (project_id required; agent: subtasks only) |
| PUT | /api/v1/tasks/:id | update (agent: source=whatsapp only) |
| PATCH | /api/v1/tasks/:id/complete | complete (strict dependency block; agent: own tasks only) |
| PATCH | /api/v1/tasks/:id/abandon | abandon (agent: own tasks only) |
| DELETE | /api/v1/tasks/:id | delete (cascades children + deps; agent: own tasks only) |
| POST | /api/v1/tasks/:id/dependencies | add dependency (cycle-rejected) |
| DELETE | /api/v1/tasks/:id/dependencies/:depId | remove dependency |
| GET | /api/v1/recommendations?ai=1 | agent suggestions (top_next tasks + long_term projects) |
| POST | /api/v1/recommendations | agent writes picks: top_next [{task_id, reason}], long_term [{project_id, reason}] |

## Security model

Two bearer tokens (see SECURITY.md for the full trust model):

- `TODO_API_TOKEN` — user/UI scope: full access. It stays on the server. The
  web bundle ships no credential: you enter the token once in the browser and
  the server returns an `httpOnly` session cookie, so JavaScript on the page
  can never read it. Rotating the token invalidates all sessions.
- `TODO_AGENT_TOKEN` — agent scope: GET anything; POST /captures; add
  subtasks; edit/complete/abandon/delete only agent-created tasks
  (source=whatsapp). Everything else returns 403.
- If `TODO_AGENT_TOKEN` is unset, the server runs single-token mode and all
  valid requests are user-scoped.

## AI agent skills

AssisList ships installable skill packs for AI agents:

| Framework | Install |
|---|---|
| Hermes | `cp -r agents/capture-to-todos ~/.hermes/skills/` (see agents/README.md) |
| Claude Code | `cp -r agents/capture-to-todos ~/.claude/skills/` |
| Codex | see agents/codex/README.md |
| OpenClaw | see agents/openclaw/README.md |

Skills: `capture-to-todos` (turn a message/voice note into an ordered task
tree), `todo-api-reference` (endpoint + permission reference), and
`stale-task-triage` (find idle projects/tasks). They read the server location
and tokens from environment variables (`ASSISLIST_URL`, `ASSISLIST_API_TOKEN`,
`ASSISLIST_AGENT_TOKEN`) so you can point them at any instance.

## Backups

```bash
docker compose exec db pg_dump -U assislist assislist > assislist-$(date +%F).sql
# restore:
docker compose exec -T db psql -U assislist assislist < assislist-2026-01-01.sql
```

## Development

```bash
# server tests (needs a Postgres; set DATABASE_URL first)
cd server && npm test
# client
cd client && npm run build
```

Spec-driven development: constitution → spec → plan → tasks → implement
(spec is contract). See `specs/` and `AGENTS.md`.

## License

MIT — see [LICENSE](LICENSE).
