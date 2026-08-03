---
name: todo-api-reference
description: AssisList API reference — endpoints, auth, permissions.
---

# AssisList API Reference

Programmatic access to the AssisList self-hosted Todo System (Express 5 +
PG16). Use for ALL todo/planning work through the AssisList API.

## Configuration (environment variables)
- `ASSISLIST_URL` — base URL, e.g. `http://localhost:3456` (no trailing
  slash). REQUIRED.
- `ASSISLIST_API_TOKEN` — user/UI scope token (full access). REQUIRED for
  user-scope operations.
- `ASSISLIST_AGENT_TOKEN` — agent scope token (restricted writes). Optional;
  when unset the server runs single-token mode (all user).

## Auth
- Header: `Authorization: Bearer <token>` on all endpoints except
  `/api/v1/health`.
- Two tokens since spec 002:
  - `ASSISLIST_API_TOKEN` — user/UI scope: full access to everything.
  - `ASSISLIST_AGENT_TOKEN` — agent scope: GET anything; POST /captures;
    POST /tasks with parent_id (subtasks only); PUT/PATCH/DELETE only on
    source=whatsapp rows. Agent CANNOT: create projects (POST /projects →
    403), create root tasks (POST /tasks without parent_id → 403),
    archive/restore/delete projects, or modify source=manual tasks (→ 403).
    Agent-created subtasks get source='whatsapp' so the agent can edit them.

## Endpoints
- `GET /api/v1/projects` — list projects (excludes archived by default;
  `?archived=true` for archived only). Each row has `rootTaskCount`,
  `openTaskCount`, `totalTaskCount`.
- `GET /api/v1/projects/:id` — project detail + `root_tasks` + counts.
- `POST /api/v1/projects` — create `{title, context, priority, due_date}`
  (user token only; agent → 403).
- `PATCH /api/v1/projects/:id` — update; `PATCH /:id/archive`, `PATCH
  /:id/restore`, `DELETE /:id` (cascade deletes ALL tasks; agent → 403 on
  all project writes).
- `POST /api/v1/captures` — capture a todo tree. **FR-007 semantics:**
  - no `project_id` → creates a PROJECT (title = capture title); breakdown
    items become ROOT tasks of that project. Response: `task: null`,
    `subtasks` = roots.
  - with `project_id` → creates parent task + children under the project.
  - with `project_id` + `breakdown: []` → creates a SINGLE parent task under
    the project.
  - breakdown items: `depends_on` are sibling INDICES and must be < own index.
  - use the AGENT token for captures (agent scope).
- `GET /api/v1/tasks?status=active` — list. Filters include `status`,
  `project_id`, `parent_id` (null = root tasks), `priority`, `urgency`,
  `due`, `q`, `sort`. Multi-word `q=` search is unreliable — list and filter
  client-side when needed.
- `GET /api/v1/tasks/:id` — tree: `children`, `blocked_by`, `blocks`.
- `PUT /api/v1/tasks/:id` — `{title, context, priority, due_date, parent_id,
  status}`. Urgency recomputed from priority + due_date. Agent: only
  source=whatsapp rows.
- `PATCH /api/v1/tasks/:id/complete` and `/abandon` — status changes.
  Agent: only source=whatsapp rows.
- `POST /api/v1/tasks/:id/dependencies` `{depends_on_id}` — add edge.
- `DELETE /api/v1/tasks/:id/dependencies/:depId` — remove edge.
- `POST /api/v1/tasks` — single create `{project_id, title, context,
  priority, due_date, parent_id}`. **project_id is REQUIRED** (NOT NULL FK;
  a task without parent must specify it — 400 "project_id is required for
  tasks without a parent"). parent_id must resolve within the same project.
  Source defaults 'manual' (user token) or 'whatsapp' (agent token).

## Reordering a tree (common fix)
Order = dependency edges, not insertion order. To move "pick up car" before
"go to park" when the chain is wrong:
1. `DELETE /tasks/B/dependencies/A` (remove wrong edge)
2. `POST /tasks/B/dependencies {depends_on_id: C}` (new predecessor)
3. Repeat for the other task, then `GET /tasks` filtered by projectId and
   print `id | title | deps:` chain to verify the final order.

## Verification
After any write, re-fetch the tree and print each task's `blocked_by` ids so
the reported order matches reality. Never report a reorder without verifying.

## Pitfalls
- Token lines may carry `\r`/quotes — trim when parsing.
- `PUT` requires reading the current row first to recompute urgency correctly.
- POST /tasks REQUIRES project_id for root tasks. If you get 400 "project_id
  is required", you're calling the task route for what should be a capture,
  or you forgot the field.
- Agent token on a user-created (source=manual) task → 403. If the agent
  needs to act on a user's task, the USER must do it (or the task must be
  agent-created). Do not work around the 403.
- Agent POST /tasks without parent_id (root task) → 403 — root tasks come
  from captures or the user.
