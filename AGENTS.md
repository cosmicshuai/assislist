# AGENTS.md — AssisList

## Stack
- Node.js + Express, ESM (`"type": "module"`), Node 22+.
- PostgreSQL 16 via node-postgres + drizzle-orm (repository pattern:
  TaskRepository, ProjectRepository).
- Frontend: React + Vite + MUI in `client/` (built to `client/dist`, served
  by Express on :3456).

## SDD Workflow — MANDATORY
1. Read `.specify/memory/constitution.md` first.
2. No code without an approved spec (`specs/NNN-name/spec.md` status=approved).
3. Work order: constitution → spec → plan → tasks → implement.
4. Implement ONLY the next pending task in `tasks.md`; verify against FR/AC.
5. Update `tasks.md` checkbox after completion; commit per task:
   `feat: T-xxx description`.
6. If ambiguous, add to spec Open Questions — never invent features.

## File Layout
- `server/` — Express API (ESM, repository pattern)
- `client/` — React + Vite frontend
- `specs/NNN-name/` — spec/plan/tasks/checklist + contracts/
- `.specify/` — constitution + templates
- `agents/` — installable AI-agent skill packs (Hermes, Claude Code, Codex,
  OpenClaw)

## Conventions
- Port 3456, bind 0.0.0.0 by default; all config via env (DATABASE_URL or
  discrete PG* vars, TODO_API_TOKEN, TODO_AGENT_TOKEN, PORT, HOST,
  AUTO_MIGRATE, TRUST_PROXY, LOG_LEVEL, SESSION_TTL_SECONDS). Config is
  validated at boot — bad config exits non-zero rather than 500ing later.
- Data lives in Postgres; projects and tasks are the two entities
  (tasks.project_id FK, parent_id tree).
- API JSON: camelCase fields, stable IDs, machine-readable status/urgency.
- Two bearer tokens: TODO_API_TOKEN (user/UI, full access), TODO_AGENT_TOKEN
  (agent, restricted: can't modify source=manual tasks, can't create
  projects/root tasks, can't archive). When the agent token is unset,
  single-token mode applies.
- Docker: `docker compose up -d` runs db + app; app auto-migrates on boot
  (AUTO_MIGRATE=true) and exits non-zero if a migration fails, so the
  container restarts instead of serving a broken schema. Runs as the
  unprivileged `node` user.
- Health: `/api/v1/health` is liveness (no dependencies); `/api/v1/ready`
  checks the database and is what the compose healthcheck uses.
- The client bundle never contains a credential. Browsers unlock via
  `POST /api/v1/auth/login` and get an httpOnly session cookie; agents keep
  using `Authorization: Bearer`.
- Never commit .env files; skill docs must not hardcode instance URLs —
  use ASSISLIST_URL / ASSISLIST_API_TOKEN / ASSISLIST_AGENT_TOKEN env vars.
