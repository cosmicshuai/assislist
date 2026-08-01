# AGENTS.md — Todo System

## Stack
- Node.js + Express, ESM (`"type": "module"`)
- SQLite via `node:sqlite` (DatabaseSync) — Node 25-safe. NEVER better-sqlite3.
- drizzle-orm for schema; repository pattern (TaskRepository) for future PG.
- Frontend: React + Vite in `client/`.

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
- `data/` — gitignored: SQLite DB + canonical store
- `specs/NNN-name/` — spec/plan/tasks/checklist + contracts/
- `.specify/` — constitution + templates

## Conventions
- Port 3456, bind 192.168.1.180 only; Tailscale serve --https=3456 for HTTPS.
- Data files are source of truth; SQLite is a rebuildable index/cache.
- API JSON: camelCase fields, stable IDs, machine-readable status/urgency.
