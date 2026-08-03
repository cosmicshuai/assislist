# Plan — 002-projects-and-agent-permissions

Spec: specs/002-project-ops-and-agent-permissions/spec.md (v1.0.0, approved)

## 1. Context & Goals
Add a first-class `projects` entity with the hierarchy
`project -> parent task -> child task -> ...` where every task carries the
same project_id, plus a server-enforced agent permission boundary
(TODO_AGENT_TOKEN) so the WhatsApp/AI agent can never modify user-created
(source=manual) tasks. Existing data is dropped (Q2) — no migration.

## 2. Architecture Overview
```
Web UI (user token TODO_API_TOKEN) ─┐
                                    ├─▶ Express 5 :3456
Agent (agent token TODO_AGENT_TOKEN)┘        │
                                             ├─ authMiddleware → actor = user|agent
                                             ├─ routes: /projects, /tasks, /captures, /recommendations
                                             ├─ services: captureService (project_id-aware)
                                             └─ repositories: PgProjectRepository + PgTaskRepository
                                                    └─ PostgreSQL 16 (assislist)
```
Actor detection: middleware reads Bearer token; matches TODO_AGENT_TOKEN →
`req.actor = 'agent'`, else TODO_API_TOKEN → `req.actor = 'user'`. When
TODO_AGENT_TOKEN is unset, everything is `user` (backward compatible).
Permission checks are route-level guards, not repository logic.

## 3. Data Model
### projects (new)
| column | type | notes |
|---|---|---|
| id | serial PK | |
| title | text NOT NULL | |
| context | text DEFAULT '' | |
| status | project_status enum | active / completed / abandoned / archived |
| priority | priority_level | default medium |
| urgency | priority_level | derived, stored |
| due_date | timestamp | nullable |
| source | task_source | manual / whatsapp |
| completed_at | timestamp | nullable |
| created_at / updated_at | timestamptz | defaults now |

### tasks (amended)
| column | change |
|---|---|
| project_id | NEW integer NOT NULL FK -> projects.id ON DELETE CASCADE |
| parent_id | unchanged self-FK; must resolve within same project (route-level check) |
| status | unchanged (active/completed/abandoned) — archive lives on the project |

Drop: none needed; tables recreated cleanly (Q2). Enum `project_status` added;
`task_status` unchanged.

## 4. API Contracts
| Method | Path | Desc | Request | Response |
|---|---|---|---|---|
| GET | /api/v1/projects | list (status filter, archived toggle) | ?status=, ?archived=true | Project[] (each with root_task_count, open_task_count) |
| GET | /api/v1/projects/:id | detail + root tasks + counts | - | Project + root_tasks[] |
| POST | /api/v1/projects | create project (user only; agent 403) | {title, context?, priority?, due_date?} | Project (201) |
| PATCH | /api/v1/projects/:id | update title/context/priority/due/status | partial | Project |
| DELETE | /api/v1/projects/:id | hard cascade delete | - | {success} |
| PATCH | /api/v1/projects/:id/archive | status -> archived | - | Project |
| PATCH | /api/v1/projects/:id/restore | status -> active | - | Project |
| POST | /api/v1/tasks | create task; project_id required | {project_id, title, context?, priority?, due_date?, parent_id?} | Task (201) |
| GET | /api/v1/tasks | list; project_id filter; status incl archived | ?project_id=, &status= | Task[] |
| GET | /api/v1/tasks/:id | detail + children + deps (+ project_id) | - | Task |
| PUT | /api/v1/tasks/:id | update; agent may only touch source=whatsapp | partial | Task |
| PATCH | /api/v1/tasks/:id/complete | agent may only complete own whatsapp | - | Task |
| PATCH | /api/v1/tasks/:id/abandon | agent may only abandon own whatsapp | - | Task |
| DELETE | /api/v1/tasks/:id | agent may only delete own whatsapp | - | {success} |
| POST | /api/v1/captures | capture tree; optional project_id | {title, context?, project_id?, breakdown?} | {project?, task, subtasks, similar} |
| GET | /api/v1/recommendations | unchanged; engine skips archived | - | Recommendations |

403 message: `{ error: "Agent cannot modify user-created tasks" }` (or
project variant).

## 5. File Layout & Modules
```
server/src/
  db/schema.ts                     # + projects table, project_status enum, tasks.project_id
  db/migrations/                   # fresh SQL: drop old tables, create new (or drizzle-kit)
  config.js                        # + agentToken (TODO_AGENT_TOKEN)
  middleware/auth.js               # actor detection (user|agent)
  middleware/agentGuard.js         # NEW: route-level permission helper
  repositories/ProjectRepository.js   # NEW interface + errors
  repositories/PgProjectRepository.js # NEW impl (CRUD, archive, counts, cascade delete)
  repositories/TaskRepository.js      # + projectId in typedef; cross-project check
  repositories/PgTaskRepository.js    # project_id on create/list/update; cross-project parent validation
  routes/projects.js               # NEW
  routes/tasks.js                  # project_id required; agent guards on write
  routes/captures.js               # + project_id passthrough
  services/captureService.js       # + optional project_id (new project vs existing)
  services/recommendationService.js# skip archived
client/src/
  api/client.ts                    # Project types + api.projects.*, task project_id
  components/AddProjectForm.tsx    # NEW (or reuse AddTaskForm with kind=project)
  components/KanbanBoard.tsx       # render projects from /projects; menu Archive/Delete; archived toggle
  components/Home.tsx              # recommendations load projects + tasks; skip archived
  components/ProjectDetail.tsx     # root tasks from project detail; recursive TaskCard tree
  components/TaskCard.tsx          # recursive children expansion, project-aware
  App.tsx                          # route wiring: /projects/:id, archived view
```
Env: server/.env + client/.env gain TODO_AGENT_TOKEN (server only). README,
AGENTS.md updated.

## 6. Implementation Approach — Phases
1. **Schema + data reset**: schema.ts (projects + project_id), fresh migration
   (drop + create), verify tables/constraints.
2. **Config + auth**: TODO_AGENT_TOKEN, actor detection, agentGuard helper.
3. **Repositories**: ProjectRepository interface + Pg impl; PgTaskRepository
   project_id support + cross-project parent rejection.
4. **Routes**: projects CRUD + archive/restore; tasks route updates + agent
   guards; captures project_id; recommendations skip archived.
5. **Client API**: types + api methods.
6. **UI**: AddProjectForm, board from /projects, project menu (archive/delete/
   restore), archived toggle, ProjectDetail recursive tree.
7. **Skills + cron**: capture-to-todos + stale-triage agent token + archived
   skip; capture skill project_id behavior.
8. **Tests + E2E**: unit/integration for repos + routes, curl smoke for 403
   paths, browser check, README.

## 7. Testing Strategy
- Repo integration tests against a test DB: project CRUD, cascade delete,
  cross-project parent rejection, archive/restore.
- Route tests: agent 403 matrix (task PUT/PATCH/DELETE on manual, project
  POST/archive on manual, POST /projects), user full access, capture
  with/without project_id, backward compat (no agent token).
- Client: build + manual browser verification (mobile viewport), PWA check.
- AC traceability: AC-001..AC-009 mapped to tests in tasks.md.

## 8. Risks & Mitigations
- **Data loss**: intentional (Q2) — but confirm DB is the assislist dev DB,
  not backups; nightly pg_dump continues to protect.
- **Agent token misconfig**: if skill uses agent token but server lacks it →
  fallback treats as user (silent over-permission). Mitigation: when
  TODO_AGENT_TOKEN is unset, log a warning at boot; skill docs require it.
- **Cross-project parent bugs**: enforce in route (validate parent.project_id
  == body.project_id) + repo-level check; integration test.
- **Deep-tree UI perf**: render children lazily on expand; keep TaskCard
  recursive but collapse by default.

## 9. Decisions & Alternatives Considered
- Projects as own table (Q1, user) vs parent-task-as-project (rejected).
- Drop data (Q2, user) vs migration (rejected — no data worth keeping).
- Project carries own status/urgency (Q3) vs derived from tasks.
- Archive = project status (Q4) vs boolean.
- Hard delete + confirm (Q5) vs trash.
- Separate agent token (Q6) vs X-Actor header vs skill discipline only.
- Agent may manage own whatsapp tasks (Q7) vs stricter.

## 10. Open Technical Questions
- None blocking. (drizzle-kit vs raw SQL for the fresh schema — use drizzle-kit
  generate to match repo convention; verify generated SQL drops old tables or
  run a manual drop first.)
