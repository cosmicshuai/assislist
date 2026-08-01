# Map: Todo System — Full Vision

## Destination

A polished, mobile-perfect productivity system: send a WhatsApp message (text or
voice) with a todo → Hermes transcribes and researches it → breaks it into
context-rich subtasks with urgency and dependencies → all managed in a clean,
fast, self-hosted web app with advanced filtering, used daily. Reaches "done"
when the capture pipeline and the app are both delightful and the user prefers
it over Things 3.

## Notes

- Domain: personal productivity, single-user, self-hosted homelab.
- Skills every session should consult: wayfinder, grilling, domain-modeling,
  research, prototype, to-spec, to-tickets.
- Standing preferences: SDD constitution (files-as-truth + SQLite index,
  repository pattern, node:sqlite on Node 25, React+Vite, strict deps).
- Tracker: local markdown (see docs/agents/issue-tracker.md). Map file:
  .scratch/todo-system/map.md; tickets: .scratch/todo-system/issues/NN-*.md.
- Existing spec draft: specs/001-productivity-core/spec.md (Q1-Q8 resolved) —
  decisions below recorded from it.

## Decisions so far

- Storage: files-as-truth + SQLite rebuildable index (spec Q1).
- Frontend: React + Vite (spec Q2).
- Dependencies: strict block — cannot complete a blocked task (spec Q3).
- Capture: auto-create; agent asks only when ambiguous (spec Q4).
- Urgency: fixed priority + auto-derived from due date (spec Q5).
- Task model: flat tree with parent_id; projects deferred (spec Q6).
- Dedupe: fuzzy close-title hint, not hard block (spec Q7).
- UX: auto-create with undo (spec Q8).
- UI shape: expanding cards on mobile (parent card expands subtasks inline);
  dependency shown as "Blocked by" badge + disabled checkbox; 4-color urgency
  (urgent/high/medium/low); v1 filters status/priority/urgency/due/
  dependency-state/search; bottom action bar + swipe on mobile; PWA worth
  adding (ticket 02, confirmed 2026-08-01).
- Capture integration: Hermes-side processing (hybrid) — Hermes researches +
  breaks down, app is a dumb store+UI; single API token TODO_API_TOKEN;
  breakdown behavior lives as a Hermes skill (ticket 03, confirmed
  2026-08-01).
- Breakdown contract: parent task + 2..8 subtasks; each has title, context
  (1-3 sentences, markdown), priority, optional due_date, depends_on
  (sibling indices); urgency rules defined; API validates JSON schema;
  dedupe hint returned as `similar` (ticket 04, confirmed 2026-08-01).
- Filtering scope: v1 filters status/priority/urgency/due/dependency/search;
  sorts created/priority/due/topological; bottom-sheet on mobile; saved views
  deferred to v2 (ticket 05, confirmed 2026-08-01).

## Not yet specified

- Stack decision: Postgres 16 (dev-infra, DB todo_system) + drizzle-orm beta
  + pg driver, repository pattern (ticket 01, resolved 2026-08-01).
- Remaining fog past the frontier: exact component library choice (resolved
  by ticket 01 research), API route shapes (plan phase), and the Hermes
  "capture to todos" skill content (implement phase).

## Out of scope

- Multi-user/auth/SSO, sharing, comments, attachments, calendar sync,
  recurrence engine, native mobile app, export/import, Things 3 sync.
