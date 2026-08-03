# Tasks — 002-projects-and-agent-permissions

## Phase: Schema & data reset
- [x] T-001 [P] [FR-001] [FR-002] [NFR-001] Drizzle schema: projects table (id, title, context, status incl archived, priority, urgency, due_date, source, completed_at, timestamps) + project_status enum; tasks gains project_id NOT NULL FK -> projects.id ON DELETE CASCADE | DoD: `drizzle-kit generate` produces migration; schema reflects plan §3 | Depends: none
- [x] T-002 [FR-002] [NFR-001] Apply fresh schema to assislist (drop old tables, apply new migration) | DoD: `psql \dt` shows projects + tasks with FK constraints; data empty (Q2) | Depends: T-001
- [x] T-003 [FR-002] [FR-003] Verify constraints: tasks.project_id NOT NULL, cascade delete from projects, parent_id self-FK intact | DoD: SQL-level checks pass; quick insert/delete smoke in psql | Depends: T-002

## Phase: Config & auth
- [x] T-004 [FR-008] config.js: add agentToken from TODO_AGENT_TOKEN (optional); boot warning when unset | DoD: config exposes agentToken; warning logged | Depends: T-001
- [x] T-005 [FR-008] middleware/auth.js: actor detection — Bearer TODO_AGENT_TOKEN -> req.actor='agent'; TODO_API_TOKEN -> 'user'; fallback user when agent token unset | DoD: unit test maps tokens to actors | Depends: T-004
- [x] T-006 [FR-009] middleware/agentGuard.js: helpers requireUser, agentCanModifyTask(task), agentCanModifyProject(project) | DoD: helper tests pass | Depends: T-005

## Phase: Repositories
- [x] T-007 [FR-001] [FR-004] ProjectRepository interface + errors (ProjectNotFoundError) | DoD: interface compiles/lints; errors defined | Depends: T-002
- [x] T-008 [FR-004] [FR-005] PgProjectRepository: create, getById, list (status/archived filters), update, delete (cascade), archive/restore, counts (root tasks, open tasks) | DoD: repo integration tests against test DB pass | Depends: T-007
- [x] T-009 [FR-002] [FR-003] [FR-006] PgTaskRepository: project_id on create/list/update/return; validate parent_id belongs to same project (cross-project rejection); attach project_id to normalized rows | DoD: integration tests: create task w/ project, cross-project parent -> 400-equivalent error | Depends: T-008

## Phase: Routes & services
- [x] T-010 [FR-004] [FR-005] [AC-001] routes/projects.js: GET /, GET /:id (+root_tasks), POST, PATCH, DELETE, PATCH /:id/archive, PATCH /:id/restore; agent guard on POST/archive/restore (403) | DoD: curl smoke: user full CRUD; agent POST/archive/restore -> 403 | Depends: T-008, T-006
- [x] T-011 [FR-006] [FR-009] [AC-003..005] routes/tasks.js: require project_id on POST (validate exists + parent same project); agent guards on PUT/PATCH/DELETE (403 unless source=whatsapp); complete/abandon same guard; list supports project_id + status | DoD: curl: agent PUT manual -> 403; agent PUT whatsapp -> 200; user unaffected | Depends: T-009, T-006
- [x] T-012 [FR-007] [AC-008] services/captureService.js + routes/captures.js: optional project_id — without: create project (title=todo) + root tasks from breakdown; with: create task tree under project; all source=whatsapp | DoD: capture tests: new project created w/ project_id absent; tree added under existing project when present | Depends: T-011
- [x] T-013 [FR-013] [EC-008] services/recommendationService.js + routes/recommendations.js: skip archived projects/tasks in engine rankings | DoD: archived project absent from recommendations | Depends: T-008

## Phase: Client API
- [x] T-014 [FR-004] [FR-006] client/src/api/client.ts: Project interface, api.projects.* (list/get/create/update/delete/archive/restore), Task gains projectId, TaskInput projectId | DoD: typecheck + build pass | Depends: T-010, T-011

## Phase: UI
- [x] T-015 [FR-010] [AC-001] AddProjectForm (title/context/priority/due) + wire FAB on board | DoD: creating a project shows a new tile | Depends: T-014
- [x] T-016 [FR-010] [FR-011] [FR-012] KanbanBoard: load projects from /projects; project overflow menu (Archive/Restore/Delete + confirm w/ task count); archived toggle view; muted archived tiles | DoD: add/archive/restore/delete all work from board; archived view toggles | Depends: T-015
- [x] T-017 [FR-011] [AC-002] ProjectDetail: use GET /projects/:id root_tasks; recursive TaskCard tree (parent expands children, arbitrary depth); per-task ops preserved | DoD: project with 2 root tasks x children renders fully; toggling works | Depends: T-016
- [x] T-018 [NFR-004] Mobile/PWA pass: menus, confirms, deep tree on iPhone viewport; empty project state (EC-010) | DoD: mobile viewport check + PWA install smoke | Depends: T-017

## Phase: Skills & cron
- [x] T-019 [FR-014] [AC-006] capture-to-todos skill: use TODO_AGENT_TOKEN; only add under existing project when user asks; follow permission matrix | DoD: skill doc updated; WhatsApp capture end-to-end works against live server | Depends: T-012
- [x] T-020 [FR-013] [FR-014] stale-task-triage + todo-recommend-llm cron prompts: agent token + skip archived | DoD: prompts updated; cron jobs re-created with new env | Depends: T-013

## Phase: Tests & docs
- [x] T-021 [AC-003..007] Automated route tests for agent 403 matrix + user full access + backward compat (no agent token) | DoD: test suite green | Depends: T-011, T-012
- [x] T-022 [AC-001..009] E2E verification: browser flow (add/archive/restore/delete, deep tree) + curl agent 403s + capture with/without project_id + README/AGENTS.md update | DoD: full AC checklist passes; README current | Depends: T-016, T-017, T-019, T-021

### Dependency Graph
```
T-001 -> T-002 -> T-003 -> T-008 -> T-010 -> T-014 -> T-015 -> T-016 -> T-017 -> T-018 -> T-022
T-004 -> T-005 -> T-006 -> T-009 -> T-011 -> T-012 -> T-019 -> T-022
                            T-008 -> T-013 -> T-020
                            T-011 -> T-021 -> T-022
```

### Traceability Matrix
| Task | FR | NFR | AC |
|------|----|-----|----|
| T-001 | FR-001, FR-002 | NFR-001 | |
| T-002 | FR-002 | NFR-001 | AC-009 |
| T-003 | FR-002, FR-003 | | |
| T-004 | FR-008 | | |
| T-005 | FR-008 | | |
| T-006 | FR-009 | | |
| T-007 | FR-001, FR-004 | NFR-002 | |
| T-008 | FR-004, FR-005 | NFR-002 | AC-001 |
| T-009 | FR-002, FR-003, FR-006 | NFR-002 | AC-002 |
| T-010 | FR-004, FR-005 | NFR-003 | AC-001, AC-006 |
| T-011 | FR-006, FR-009 | NFR-003 | AC-003, AC-004, AC-005, AC-007 |
| T-012 | FR-007 | | AC-008 |
| T-013 | FR-013 | | |
| T-014 | FR-004, FR-006 | | |
| T-015 | FR-010 | | AC-001 |
| T-016 | FR-010, FR-011, FR-012 | NFR-004 | AC-001 |
| T-017 | FR-011 | NFR-004 | AC-002 |
| T-018 | | NFR-004 | |
| T-019 | FR-014 | | AC-006 |
| T-020 | FR-013, FR-014 | | |
| T-021 | FR-009 | NFR-003 | AC-003..007 |
| T-022 | | | AC-001..009 |
