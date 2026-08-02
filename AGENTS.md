# AGENTS.md — Todo System

## Stack
- Node.js + Express, ESM (`"type": "module"`)
- PostgreSQL 16 via node-postgres + drizzle-orm (repository pattern:
  TaskRepository, ProjectRepository) for future portability.
- Frontend: React + Vite + MUI v7 in `client/`.

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

## Conventions
- Port 3456, bind 192.168.1.180 only; Tailscale serve --https=3456 for HTTPS.
- Data lives in Postgres 16 (todo_system DB); projects and tasks are the two
  entities (tasks.project_id FK, parent_id tree).
- API JSON: camelCase fields, stable IDs, machine-readable status/urgency.
- Two bearer tokens: TODO_API_TOKEN (user/UI, full access), TODO_AGENT_TOKEN
  (agent, restricted: can't modify source=manual tasks, can't create
  projects/root tasks, can't archive). When the agent token is unset,
  single-token mode applies.
