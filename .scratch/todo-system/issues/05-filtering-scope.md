# 05 — Scope the advanced filtering

Type: grilling
Status: resolved
Blocked by: 02

## Question

Which filters make the "advanced filtering" promise real without scope creep?
- By status (active/completed), priority, urgency, due (today/overdue/upcoming),
  dependency state (blocked/ready), parent/child, search.
- Saved views (named filter presets)?
- Sort options: created, priority, due, dependency-topological?
- Which of these are v1 vs v2?

## Answer

PROPOSED (pending user confirmation — 2026-08-01):

- v1 filters: status (active/completed), priority, urgency, due
  (today/overdue/upcoming), dependency state (blocked/ready), free-text
  search across title + context.
- v1 sort: created (default), priority, due date, dependency-topological
  (ready-first — available on desktop; on mobile it's the default order).
- v1 filter UI: a bottom-sheet filter panel on mobile; a sidebar/top bar on
  desktop. Active filter count shown as a badge.
- v2 (out of scope now): saved named views, custom field filters, grouping by
  project.

Awaiting user confirmation before this ticket is resolved.
