# Spec — 002-projects-and-agent-permissions

Status: approved
Version: 1.0.0

## 1. Overview
Problem: The app has no project entity. A "project" is implicitly a top-level
task (parentId = null): the Kanban board, Home tiles, and ProjectDetail
already render these as projects, but there is no way to add, delete, or
archive a project as a distinct action, and no archive state exists (task
statuses are active/completed/abandoned). Separately, the API uses a single
shared Bearer token for both the web UI and the WhatsApp/AI agent, so the
agent is technically able to edit or delete any task — including tasks the
user created manually. That violates the intended ownership model: the agent
should add subtasks and manage tasks it created, but never directly modify
user-created tasks.
Goal: (1) Projects become a first-class entity. Hierarchy:
`project -> parent task -> child task -> child task ...` — a project can have
multiple parent (root) tasks; any task can have its own children; all tasks in
a project share the same project_id. (2) A server-enforced permission
boundary: agent-scoped requests may create task trees and add subtasks, may
edit/complete/delete only agent-created tasks (source=whatsapp), and are
rejected (403) when they attempt to modify user-created tasks (source=manual).
Value: The user can manage projects (not just subtasks) in the web app, the
task model matches the real mental model (project → tasks → nested tasks),
and the WhatsApp agent becomes a safe, constrained contributor instead of an
unrestricted writer. Closes the gap spec 001 Q6 deferred ("Projects deferred
to v2").

## 2. User Stories
- [ ] US-001: As a user, I want to add a project, so that I can create a
  container before adding tasks.
  - Given the board view, When I tap "Add project", Then a project is created
    and appears as a project tile.
- [ ] US-002: As a user, I want a project to hold multiple parent tasks, and
  each parent task to have its own children (arbitrary depth), so that the
  hierarchy reflects how I actually plan work.
  - Given a project, When I add parent tasks and nest child tasks under them,
    Then all of them appear under the same project and each task can have its
    own subtasks.
- [ ] US-003: As a user, I want to archive a project, so that finished or
  dormant work disappears from the active board without losing its tasks.
  - Given a project, When I archive it, Then it leaves the active columns and
    its tasks are preserved; an archived view shows it.
- [ ] US-004: As a user, I want to delete a project, so that I can remove
  mistakes or abandoned work entirely.
  - Given a project, When I delete it after confirming, Then the project and
    all its tasks (whole tree) are removed.
- [ ] US-005: As a user, I want the agent to add tasks under my projects,
  so that WhatsApp captures enrich my projects without touching them.
  - Given a user-created project, When the agent posts a capture/subtask,
    Then tasks are added under it (with the same project_id) and the project
    row itself is unchanged.
- [ ] US-006: As a user, I want the agent to manage only its own tasks, so
  that my manual tasks are never silently edited or deleted by the agent.
  - Given an agent-scoped request targeting a source=manual task, When it
    attempts update/complete/abandon/delete, Then the API returns 403 and
    nothing changes.

## 3. Functional Requirements
- [ ] FR-001 (MUST): Projects table — new `projects` entity: id, title,
  context, status (active/completed/abandoned/archived), priority, urgency,
  due_date, source (manual/whatsapp), completed_at, created_at, updated_at.
  Mirrors the task fields so the board/grouping keeps working.
- [ ] FR-002 (MUST): tasks.project_id — every task belongs to exactly one
  project (NOT NULL FK -> projects.id, ON DELETE CASCADE). All tasks in a
  project share the same project_id.
- [ ] FR-003 (MUST): Tree within project — tasks keep parent_id (self-FK,
  cascade) for arbitrary-depth nesting: parent task -> child -> grandchild.
  A project's root tasks are those with parentId = null inside the project.
- [ ] FR-004 (MUST): Project CRUD API — GET /projects (list, archived
  filter), GET /projects/:id (project + root tasks + counts), POST /projects,
  PATCH /projects/:id, DELETE /projects/:id (cascades all tasks).
- [ ] FR-005 (MUST): Archive/restore — PATCH /projects/:id/archive and
  /restore (or status transitions via PUT). Archived projects are excluded
  from the active board/Home by default and appear in an archived view.
- [ ] FR-006 (MUST): Tasks API scoped to projects — POST /tasks requires
  project_id; task list accepts project_id filter; GET /tasks/:id returns
  project_id + nested children; parent_id stays within the same project
  (cross-project parent rejected).
- [ ] FR-007 (MUST): Capture pipeline — POST /captures accepts optional
  project_id. Without it: creates a new project (title = captured todo) whose
  breakdown items become root (parent) tasks. With it: adds a parent task +
  its breakdown children under the given project. All created rows are
  source=whatsapp.
- [ ] FR-008 (MUST): Agent identity — server distinguishes agent-scoped
  requests from user-scoped requests. New optional env TODO_AGENT_TOKEN;
  requests bearing it are agent-scoped; requests bearing TODO_API_TOKEN (the
  UI) are user-scoped. If TODO_AGENT_TOKEN is unset, fall back to current
  behavior (TODO_API_TOKEN = full access) for backward compatibility.
- [ ] FR-009 (MUST): Agent permission matrix (agent scope) — allowed: GET any
  task/project; POST /captures; POST /tasks with project_id + parent_id (add
  task under any task, source=whatsapp); PUT/PATCH/DELETE only on tasks where
  source='whatsapp'. Rejected 403: PUT/PATCH/DELETE on tasks where
  source='manual'; POST /projects (agent cannot create projects directly —
  projects are user-created or capture-created).
- [ ] FR-010 (MUST): UI project menu — project tiles and ProjectDetail header
  get an overflow menu with Archive/Restore and Delete (confirm dialog
  warning about task count). Add-project affordance exists (FAB +
  AddProjectForm).
- [ ] FR-011 (MUST): Project detail shows root (parent) tasks; each task card
  expands to its own children recursively (existing expandable-card pattern).
- [ ] FR-012 (MUST): Archived view — board/Home gain a toggle/chip to show
  archived projects; archived projects render distinctly (muted).
- [ ] FR-013 (SHOULD): Recommendations and stale-triage exclude archived
  tasks/projects (engine + agent cron prompt updates).
- [ ] FR-014 (MUST): Skill updates — capture-to-todos and stale-task-triage
  authenticate with TODO_AGENT_TOKEN and follow the permission matrix;
  capture skill only adds tasks under an existing project when the user asks
  to break down that project.
- [x] FR-015 (MUST): Global Add chooser — the Add button (FAB on Home and
  Board) opens a chooser with "New project" and "New task". Choosing New
  project shows AddProjectForm; New task shows the task form.
- [x] FR-016 (MUST): Task form with project + parent selectors — the task
  form (both from the chooser and in ProjectDetail) has: project selector
  (required; lists non-archived projects, defaults to current project in
  ProjectDetail), optional parent-task selector (lists EVERY task in the
  selected project at any depth, refreshed when the project changes,
  "none" = root task), plus title/context/priority. Selecting a parent
  creates the task under it; otherwise a root task is created.

## 4. Non-Functional Requirements
- [ ] NFR-001 (MUST): Fresh start — existing data is dropped (user decision
  2026-08-01: "drop all current data"); new schema applied cleanly with
  projects table + tasks.project_id. No migration script needed; verify
  tables/constraints exist and API works against empty data.
- [ ] NFR-002 (MUST): Repository pattern preserved — add ProjectRepository
  (interface + PgProjectRepository); TaskRepository gains project_id
  handling. Permission checks live in routes/middleware, not repositories.
- [ ] NFR-003 (MUST): Agent-friendly API — 403 responses carry a clear error
  message (e.g. "Agent cannot modify user-created tasks"); docs updated.
- [ ] NFR-004 (SHOULD): UI remains mobile-perfect; menu, confirm dialogs, and
  deep-tree expansion work on iPhone Safari PWA.

## 5. Acceptance Criteria
- [ ] AC-001: In the web app, the user can add, archive, restore, and delete
  a project; archived projects disappear from active views and reappear in
  the archived view.
- [ ] AC-002: A project can hold multiple parent (root) tasks; a parent task
  can hold children; a child can hold its own children; every task in the
  tree has the same project_id and the full tree renders in ProjectDetail.
- [ ] AC-003: A curl request with TODO_AGENT_TOKEN trying to PUT or DELETE a
  source=manual task returns 403; the task is unchanged.
- [ ] AC-004: A curl request with TODO_AGENT_TOKEN adding a task under a
  source=manual project succeeds; the project row is untouched.
- [ ] AC-005: A curl request with TODO_AGENT_TOKEN editing a source=whatsapp
  task succeeds.
- [ ] AC-006: A curl request with TODO_AGENT_TOKEN POSTing /projects returns
  403.
- [ ] AC-007: With TODO_AGENT_TOKEN unset, behavior is unchanged from v1
  (single token full access) — backward compatible.
- [ ] AC-008: WhatsApp capture without project_id creates a new project +
  root tasks; capture with project_id adds a task tree under that project.
- [ ] AC-009: Existing schema replaced cleanly (drop + recreate, or new
  migration that drops old tables); fresh DB has projects + tasks tables with
  FK constraints; API works against empty data.
- [x] AC-010: From the board/Home FAB, the user can choose to create a
  project or a task. Task creation requires selecting a project; the parent
  selector lists all tasks in that project (any depth) and creating with a
  parent nests the new task under it.

## 6. Edge Cases
- [ ] EC-001: Agent attempts to archive/restore a user-created project → 403
  (archive/restore is a modification of the project row).
- [ ] EC-002: Agent POST /projects → 403.
- [ ] EC-003: Cross-project parent — POST /tasks with parent_id in a
  different project → 400.
- [ ] EC-004: Delete project with deep tree → FK cascade removes all tasks;
  confirm dialog shows total task count.
- [ ] EC-005: Archived project with active tasks → hidden from active views;
  restoring brings the whole tree back as-is.
- [ ] EC-006: Completed project archived → stays out of Done column; archived
  view shows it.
- [ ] EC-007: Missing TODO_AGENT_TOKEN in .env but set in skill → skill
  receives 401/403; error surfaces in WhatsApp reply so misconfig is visible.
- [ ] EC-008: Recommendations engine encounters archived tasks/projects →
  skipped, no crash.
- [ ] EC-009: Deep nesting (4+ levels) — recursive expand/collapse, lazy
  render children on expand to keep mobile UI smooth.
- [ ] EC-010: Project with zero tasks — renders as an empty project card;
  delete/archive still work.

## 7. Out of Scope
- Project metadata beyond task-like fields (color, icon, owner, tags) —
  only if a real need appears.
- Multi-user auth, roles, sharing.
- Soft-delete/trash with restore (delete stays hard-delete with confirm).
- Project templates, bulk archive, recurrence.
- Agent editing user-created *subtasks* (all source=manual tasks are equally
  protected — the rule is by source, not by depth).

## 8. Dependencies & Assumptions
- Existing dev-infra Postgres 16, DB todo_system; migrations via drizzle-kit
  (projects table + tasks.project_id + enum extension). Existing data will be
  dropped per Q2 decision.
- Existing API token TODO_API_TOKEN stays the user/UI token.
- Capture pipeline sets source='whatsapp' on all rows it creates (already
  true); capture contract gains optional project_id.
- Agent cron jobs (todo-recommend-llm, todo-stale-triage) updated to use the
  agent token and skip archived.

## 9. Open Questions
- [x] Q1 RESOLVED 2026-08-01 (USER): Project is a first-class entity. A
  project can have multiple parent (root) tasks; a child task can have its
  own children (project -> parent task -> child task -> child task); all
  tasks link to the same project_id.
- [x] Q2 RESOLVED 2026-08-01 (USER): Drop all current data — no migration.
  New schema applied to a clean DB (projects + tasks.project_id).
- [x] Q3 RESOLVED 2026-08-01 (USER, default accepted): Project carries its
  own status/priority/urgency/due (mirrors tasks) so the board groups by
  project urgency and Done column works.
- [x] Q4 RESOLVED 2026-08-01 (USER, default accepted): Archive = status
  'archived' on the project, hidden from active views, dedicated archived
  view, excluded from recommendations.
- [x] Q5 RESOLVED 2026-08-01 (USER, default accepted): Delete project = hard
  cascade delete of all tasks, with confirm dialog.
- [x] Q6 RESOLVED 2026-08-01 (USER, default accepted): Agent identity = new
  TODO_AGENT_TOKEN env; fallback to single-token behavior when unset.
- [x] Q7 RESOLVED 2026-08-01 (USER, default accepted): Agent may
  complete/abandon its own source=whatsapp tasks; agent may not create
  projects directly (only via capture).

## 10. Success Metrics
- User can complete add/archive/delete/restore of a project in < 30s in the
  web app.
- Deep tree (project → 3 root tasks → 2 children each) renders and updates
  correctly in ProjectDetail.
- Agent-scoped 403 path verified by test (curl + automated) — zero silent
  agent modifications of user tasks.
- No regressions in capture pipeline or existing task CRUD after migration.

## Changelog
- 2026-08-01: v0.1.0 draft created (Q1 defaulted to parent-task-as-project).
- 2026-08-01: v0.1.1 — Q1 RESOLVED by user decision: first-class projects
  entity; project -> parent task -> child task hierarchy; all tasks share
  project_id. Spec rewritten accordingly (FRs, ACs, ECs).
- 2026-08-01: v0.1.2 — Q2 RESOLVED by user decision: drop all current data,
  no migration; clean schema apply. NFR-001/AC-009 updated.
- 2026-08-01: v1.0.0 — Q3..Q7 RESOLVED by user (defaults accepted). Spec
  locked, approved.
- 2026-08-02: v1.1.0 — FR-015/FR-016 + AC-010 added (user request): global
  Add chooser (project | task); task form has project selector (required) +
  optional parent selector listing all tasks in the project at any depth.
  Approved by user via clarify (parent = all tasks).
