# Todo System

Personal productivity system: capture tasks from WhatsApp (text/voice), AI
breaks them into context-rich subtasks with urgency and dependencies, managed
in a self-hosted web app with a clean mobile-first UI.

## Architecture

```
WhatsApp (Hermes) ──text/voice──▶ Hermes agent (transcribe + research + breakdown)
                                      │  POST /api/v1/captures  (Bearer token)
                                      ▼
                              Express 5 (ESM) server :3456
                                      ▼
                      PgTaskRepository (drizzle-orm beta + node-postgres)
                                      ▼
                     PostgreSQL 16 (dev-infra, DB todo_system)
                                      ▲
                      React 19 + Vite + Tailwind v4 + PWA (client/)
```

## Stack

- **Server**: Node 25, Express 5 (ESM), drizzle-orm beta + node-postgres
- **DB**: dev-infra PostgreSQL 16, database `todo_system` (peer auth as cosmic)
- **Client**: React 19 + Vite + Tailwind CSS v4 + vite-plugin-pwa
- **SDD**: spec-driven development (see .specify/, specs/)

## Running

### Server (port 3456)

```bash
cd server
cp .env.example .env   # then set TODO_API_TOKEN (openssl rand -hex 32)
npm install
npm run dev            # or: npm start
```

### Database migration

```bash
cd server
npx drizzle-kit generate   # after schema changes
psql -U cosmic -d todo_system -f drizzle/<migration>/migration.sql
```

### Client (dev: 5173, prod build: 4173)

```bash
cd client
cp .env.example .env   # set VITE_TODO_API_TOKEN = same token as server
npm install
npm run dev            # Vite dev with /api proxy
npm run build && npm run preview -- --host 192.168.1.180 --port 4173
```

### Production serving (single port :3456 — API + client)

The systemd user service serves both the API and the built client on
`192.168.1.180:3456`. Tailscale serve provides HTTPS:

```bash
tailscale serve --bg --https=3456 http://192.168.1.180:3456
```

Access: `https://cosmic-me-mini.tail657cd9.ts.net:3456` (API + web app).
LAN: `http://192.168.1.180:3456`.

### Service management

```bash
systemctl --user status todo-system.service   # check
systemctl --user restart todo-system.service  # restart
journalctl --user -u todo-system.service -f   # logs
```

Enabled with linger, so it starts at boot. The client is built to
`client/dist` and served by the Express server; after client changes, rebuild
with `cd client && npm run build` then restart the service.

## WhatsApp capture

Send a todo to the Hermes WhatsApp bot (text or voice note). The
`capture-to-todos` skill (Hermes) transcribes, researches, breaks the todo
into subtasks with context/priority/urgency/dependencies, POSTs to the API,
and replies with a confirmation. Dedupe hints are surfaced as "similar to
existing…".

## API (v1)

Auth: `Authorization: Bearer <TODO_API_TOKEN>` (all except /health).

| Method | Path | Purpose |
|---|---|---|
| GET | /api/v1/health | liveness |
| POST | /api/v1/captures | AI breakdown → task tree |
| GET | /api/v1/tasks | list + filters (status, priority, urgency, due, q, parent_id, sort) |
| GET | /api/v1/tasks/:id | detail + children + blocked_by + blocks |
| POST | /api/v1/tasks | create single |
| PUT | /api/v1/tasks/:id | update |
| PATCH | /api/v1/tasks/:id/complete | complete (strict dependency block) |
| DELETE | /api/v1/tasks/:id | delete (cascades children + deps) |
| POST | /api/v1/tasks/:id/dependencies | add dependency (cycle-rejected) |
| DELETE | /api/v1/tasks/:id/dependencies/:depId | remove dependency |
| GET | /api/v1/recommendations?ai=1 | agent suggestions (top_next + long_term); `ai=1` enriches reasons via DeepSeek if DEEPSEEK_API_KEY is set |

## Backups

`~/homelab/backup-nas.sh` (nightly 03:30) rsyncs NAS data to ssd2 and
pg_dumps all dev-infra databases (incl. todo_system) to
`/mnt/ssd2/backups/postgresql/` (14-day retention).

## Tests

```bash
cd server && npm test   # node:test integration tests against dev DB
```

## Project conventions

- SDD: constitution → spec → plan → tasks → implement (spec is contract)
- Repository pattern (TaskRepository) so storage can change without touching
  routes/services
- Files in the repo are the source of truth for code; Postgres holds task data
