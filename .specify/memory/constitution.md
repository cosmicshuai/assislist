# Constitution — Todo System (Productivity Core)

Version: 0.1.0 (initial draft)
Date: 2026-08-01

## Project Vision

A personal productivity system: capture todos/reminders from WhatsApp (text or
voice), let an AI agent research and break them into context-rich subtasks with
urgency and dependencies, and manage the result in a clean self-hosted web app.
The task store is our own app (not a third-party UI), designed so an AI agent
can read and write it programmatically.

## Core Principles

- P1: Spec is Contract. No implementation without an approved spec. Changes
  require explicit amendment.
- P2: What before How. spec.md defines WHAT/WHY only; plan.md defines HOW.
- P3 (AMENDED 2026-08-01): PostgreSQL as source of truth, using the existing
  dev-infra Postgres 16 (localhost:5432, DB `todo_system`). Repository
  pattern keeps the app portable if storage changes again.
- P4: Repository pattern abstraction (TaskRepository) so storage can change
  (e.g. SQLite → PostgreSQL, or a different host) without touching
  routes/services.
- P5: Agent-friendly. The API is the contract for the WhatsApp/AI pipeline;
  every task has stable IDs, machine-readable status, urgency, dependencies.
- P6: Local-first, single user. No auth/SSO in v1 (LAN + Tailscale only).
  AMENDED 2026-08-02 (spec 003): project is open-source (MIT) and
  distributable — self-hosted via Docker Compose, single-user trust model,
  bring-your-own-network security. No SSO/login screens in v1.
  AMENDED 2026-08-03 (issue #2): still no user accounts and no SSO, but the
  single shared token must not be shipped to the browser. A token-unlock
  screen exchanging TODO_API_TOKEN for an httpOnly session cookie is a
  security control, not a user-account system, and is explicitly in scope.
- P7: Incremental. MVP spec first; advanced features in later NNN folders.
- P8: Clean UX. The UI must feel better than Vikunja's — fast, focused,
  mobile-usable. No heavy framework chrome.

## Tech Constraints

- Node.js + Express (ESM), matching spec-manager conventions.
- PostgreSQL 16 (dev-infra systemd service, peer auth via unix socket as
  cosmic, DB `todo_system`).
- drizzle-orm (beta line per user decision) + repository pattern
  (TaskRepository → PgTaskRepository).
- Frontend: React + Vite (markdown viewing/editing of task context is
  important; split-pane if needed).
- Data lives in Postgres (todo_system); project `.env` holds DATABASE_URL.
- Port: 3456 was used by Vikunja (now removed); reuse 3456, bound to
  0.0.0.0 by default (HOST env); HTTPS via reverse proxy or tailnet serve
  when deployed remotely.

## Quality Standards

- Spec format: the 10 required sections (Overview, US, FR, NFR, AC, Edge
  Cases, Out of Scope, Dependencies/Assumptions, Open Questions, Success
  Metrics).
- Plan format: architecture, data model, API contracts, file layout, phases,
  testing, risks, decisions.
- Tasks: each ≤ 1 day, has DoD, dependencies, [P] flag, FR/AC traceability.
- No code written before spec approved. Commit per task:
  `feat: T-xxx description`.

## Workflow Rules (6 Phases)

1. Initialize workspace (constitution, templates, AGENTS.md, README)
2. Specify — draft specs/NNN-name/spec.md
3. Clarify — resolve open questions ONE-BY-ONE, patch spec after each, lock
   to v1.0
4. Plan — specs/NNN-name/plan.md
5. Tasks — specs/NNN-name/tasks.md
6. Implement — read constitution → spec → plan → tasks; implement next task;
   verify against FR/AC; update tasks.md; commit

## File Organization

```
todo-system/
  .specify/memory/constitution.md
  .specify/templates/{spec,plan,tasks}-template.md
  specs/NNN-name/{spec,plan,tasks,checklist}.md + contracts/
  server/        # Express API
  client/        # React + Vite frontend
  data/          # gitignored: canonical store + SQLite
  AGENTS.md
  README.md
```

## Governance & Changelog

- Version bumps: 0.1.0 draft → 1.0.0 approved spec → implementation phases.
- Amendments recorded in spec.md changelog with date and rationale.

## Changelog
- 2026-08-01: v0.2.0 — P3 + tech constraints amended: SQLite/node:sqlite
  replaced by existing dev-infra PostgreSQL 16 (user decision: "drizzle-orm
  beta + postgres, remember our dev-infra setup"). Repository pattern
  retained for portability.
- 2026-08-01: v0.1.0 initial constitution. Project started after Vikunja
  rejected for UI; existing ~/dev/todo-app used as API reference only.
