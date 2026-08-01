# 02 — Define the UI shape for "polished and mobile-perfect"

Type: grilling
Status: open
Blocked by:

## Question

What does the web app actually look like and how does it behave on a phone?
- Task tree view: how are parent tasks and subtasks presented (indented tree?
  expandable cards? kanban-like?).
- Dependency indicators: how are blocks/blocked-by shown (badges? arrows?
  disabled checkboxes?).
- Priority/urgency: how are the four levels displayed and sorted?
- Filters: which advanced filters matter (status, priority, due, dependency
  state, parent/child, search)? Saved views?
- Mobile UX: bottom nav? swipe actions? which actions must be thumb-reachable?

## Answer

PROPOSED (pending user confirmation — 2026-08-01):

- Task tree: **expanding cards** on mobile — parent card shows title, priority
  badge, urgency, and a subtask count; tapping expands subtasks inline.
  On desktop, same cards in a responsive grid/list; indent only 1 level deep
  by default (children of children collapse into their parent's context).
- Dependencies: **visual badge + disabled checkbox**. A blocked task shows
  "Blocked by: <name>" and its checkbox is disabled (strict block per spec Q3).
  A small "→" arrow chain on hover/expand shows the dependency chain.
- Priority/urgency: 4 colors — urgent=red, high=orange, medium=blue,
  low=gray; default sort groups by urgency then due date.
- Filters (v1): status, priority, urgency, due (today/overdue/upcoming),
  dependency state (blocked/ready), search. Saved views deferred to v2.
- Mobile UX: thumb-friendly bottom action bar (Add, Filter, Done); swipe on a
  task row to complete or delete; pull-to-refresh; safe-area aware.
- PWA: worth adding (install-to-home-screen) — see research ticket 01 for the
  exact plugin decision.

Awaiting user confirmation before this ticket is resolved.
