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
- P3: Files as source of truth, SQLite as rebuildable index/cache. Task data
  lives in a canonical store; the DB can be rebuilt from it.
- P4: Repository pattern abstraction (TaskRepository) so SQLite → PostgreSQL
  migration stays possible without touching routes/services.
- P5: Agent-friendly. The API is the contract for the WhatsApp/AI pipeline;
  every task has stable IDs, machine-readable status, urgency, dependencies.
- P6: Local-first, single user. No auth/SSO in v1 (LAN + Tailscale only).
- P7: Incremental. MVP spec first; advanced features in later NNN folders.
- P8: Clean UX. The UI must feel better than Vikunja's — fast, focused,
  mobile-usable. No heavy framework chrome.

## Tech Constraints

- Node.js + Express (ESM), matching spec-manager conventions.
- SQLite via node:sqlite (Node 22.5+/25-safe; better-sqlite3 breaks on Node 25
  which is the installed runtime).
- drizzle-orm for schema + repository pattern (SQLite now, PG later).
- Frontend: React + Vite (markdown viewing/editing of task context is
  important; split-pane if needed).
- Data dir: `data/` gitignored, single-file DB + canonical store.
- Port: 3456 was used by Vikunja (now removed); reuse 3456, bound to
  192.168.1.180 only; Tailscale serve --https=3456 for HTTPS on tailnet.

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

- 2026-08-01: v0.1.0 initial constitution. Project started after Vikunja
  rejected for UI; existing ~/dev/todo-app used as API reference only.
