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

## Not yet specified

- Exact UI shape that reads as "polished and mobile-perfect" — how the task
  tree, dependency indicators, and filters should look and behave.
- How WhatsApp capture actually integrates: Hermes-side instruction vs
  webhook endpoint vs both — and how "research + breakdown" is invoked.
- What a breakdown run produces: title/context/urgency rules; where the logic
  lives (Hermes skill prompt vs app-side).
- Advanced filtering scope: which filters (by project? by dependency status?
  saved views?).
- Stack verification: drizzle-orm + node:sqlite on Node 25; React+Vite mobile
  libraries (Tailwind? PWA?).

## Out of scope

- Multi-user/auth/SSO, sharing, comments, attachments, calendar sync,
  recurrence engine, native mobile app, export/import, Things 3 sync.
