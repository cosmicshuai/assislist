# Plan — 001-productivity-core

## 1. Context & Goals
Spec: specs/001-productivity-core/spec.md (v1.0, approved-with-defaults + Postgres amendment).

Build the Todo System: a self-hosted productivity app where WhatsApp captures
(text/voice) become AI-broken-down task trees (subtasks, context, urgency,
dependencies) stored in Postgres and managed in a clean mobile-perfect web UI.
Single user, LAN + Tailscale, no auth beyond a Bearer token for the API.

## 2. Architecture Overview

```
WhatsApp (Hermes) ──text/voice──▶ Hermes agent (transcribe + research + breakdown)
                                      │  POST /api/v1/captures  (Bearer TODO_API_TOKEN)
                                      ▼
                              Express 5 (ESM) server :3456
                                      │
                          captureService (validate + dedupe + create tree)
                                      ▼
                      PgTaskRepository (drizzle-orm beta + node-postgres)
                                      ▼
                     PostgreSQL 16 (dev-infra, DB todo_system)
                                      ▲
                              React 19 + Vite + Tailwind v4 + shadcn/ui
                              (PWA installable, mobile-first)
```

Data flow: capture POST → validate against JSON schema → dedupe hint → insert
parent + children + dependency rows in one transaction → return IDs → Hermes
confirms on WhatsApp. UI reads/writes via same API.

## 3. Data Model

### tasks
| column | type | notes |
|---|---|---|
| id | serial PK | |
| title | text NOT NULL | |
| context | text DEFAULT '' | markdown |
| status | text CHECK active/completed | default active |
| priority | text CHECK low/medium/high/urgent | default medium |
| urgency | text CHECK low/medium/high/urgent | derived, stored on write |
| due_date | date NULL | |
| parent_id | int NULL FK tasks(id) ON DELETE CASCADE | flat tree |
| source | text CHECK manual/whatsapp | default manual |
| completed_at | timestamptz NULL | |
| created_at / updated_at | timestamptz | server default |

### task_dependencies
| column | type | notes |
|---|---|---|
| task_id | int FK tasks(id) ON DELETE CASCADE | dependent |
| depends_on_task_id | int FK tasks(id) ON DELETE CASCADE | prerequisite |
| PK (task_id, depends_on_task_id) | | CHECK task_id <> depends_on_task_id |

Cycle prevention: reject any insert that would create a cycle (walk depends_on
graph; DFS on insert and on update).

## 4. API Contracts

Auth: `Authorization: Bearer ${TODO_API_TOKEN}` required for all except
`GET /api/v1/health`. 401 otherwise. Body JSON camelCase.

| Method | Path | Desc | Request | Response |
|---|---|---|---|---|
| GET | /api/v1/health | liveness | – | {ok:true} |
| POST | /api/v1/captures | AI breakdown create | {title, context?, breakdown:[{title,context?,priority?,due_date?,depends_on:[idx]}]} | {task, subtasks:[], similar:[{id,title}]} |
| GET | /api/v1/tasks | list w/ filters | ?status&priority&urgency&due=today\|overdue\|upcoming&blocked=1\|0&q&parent_id&sort&order | Task[] |
| GET | /api/v1/tasks/:id | detail + children + deps | – | {…task, children:[], blocked_by:[], blocks:[]} |
| POST | /api/v1/tasks | create single | {title, context?, priority?, due_date?, parent_id?} | Task 201 |
| PUT | /api/v1/tasks/:id | update | {title?, context?, priority?, due_date?, parent_id?, status?} | Task |
| PATCH | /api/v1/tasks/:id/complete | complete (strict dep check) | {} | Task or 400 {error:"Blocked by <title>"} |
| DELETE | /api/v1/tasks/:id | delete | – | {success} |
| POST | /api/v1/tasks/:id/dependencies | add dep | {depends_on_id} | {ok} or 400 cycle/self |
| DELETE | /api/v1/tasks/:id/dependencies/:depId | remove dep | – | {success} |

Validation: hand-rolled validators or zod (decide in T-; keep zero-dep option).
captures payload: `depends_on` array of sibling indices (0-based) per spec
ticket 04; service resolves indices → task ids after insert.

## 5. File Layout & Modules

```
todo-system/
  server/
    src/
      index.js            # express app, listen 192.168.1.180:3456
      config.js           # reads .env (DATABASE_URL, TODO_API_TOKEN, PORT)
      db/
        client.js         # pg Pool + drizzle({client})
        schema.ts         # drizzle tables (tasks, task_dependencies)
      repositories/
        TaskRepository.js       # interface (contract)
        PgTaskRepository.js     # drizzle impl
      services/
        captureService.js       # validate, dedupe, transactional tree create
        urgencyService.js       # derive urgency from priority + due_date
        dependencyService.js    # cycle check, blocking queries
      routes/
        health.js tasks.js captures.js dependencies.js
      middleware/auth.js        # Bearer token check
      validation/schemas.js
    test/                   # node:test or vitest
  client/
    src/
      main.tsx App.tsx
      api/client.ts         # fetch wrapper w/ token
      components/           # TaskCard, TaskTree, FilterSheet, AddTask…
      hooks/                # useTasks, useFilters
      lib/utils.ts
  drizzle/                  # generated migrations
  .env                      # DATABASE_URL, TODO_API_TOKEN, PORT (gitignored)
  AGENTS.md README.md
```

## 6. Implementation Approach (phases)

1. Setup — scaffold server (npm init ESM), client (Vite react-ts), deps:
   express, pg, drizzle-orm@beta, drizzle-kit; tailwind v4, shadcn, vite-plugin-pwa.
2. Data layer — drizzle schema, first migration (drizzle-kit generate + apply
   against todo_system), PgTaskRepository with tests.
3. API core — health, auth middleware, tasks CRUD, complete-with-deps,
   dependencies routes; unit tests; curl smoke tests.
4. Capture service — validation, dedupe (similar-title hint), transactional
   tree create with dependency wiring; tests.
5. Frontend — Tailwind/shadcn scaffold; task list + expandable cards; add/edit/
   complete (blocked disable); filters bottom-sheet; PWA manifest.
6. Integration — Hermes "capture to todos" skill + WhatsApp wiring; E2E:
   voice/text capture → tasks visible in UI.
7. Polish — mobile gestures (swipe), empty/error states, safe-area.

## 7. Testing Strategy
- Unit: repository (CRUD, deps, cycle rejection), captureService (validation,
  dedupe, tree creation), urgencyService.
- Integration: supertest against the app with a test DB (todo_system_test).
- E2E (AC-001..004): scripted curl/WhatsApp capture → assert tasks in DB + UI.
- Traceability: every task lists FR/AC it satisfies.

## 8. Risks & Mitigations
- drizzle-orm beta instability → repository pattern isolates churn; fallback
  stable 0.45.2 + @libsql/client with same schema (research verified).
- Peer-auth Postgres from Node: pg needs connection params; use unix socket
  path in DATABASE_URL (verified `psql -U cosmic` works; pg client can use
  socket via host=/var/run/postgresql).
- node-postgres on Node 25: pure JS, no native build risk (research verified).
- Beta tailwind/shadcn churn → pin versions in package.json.

## 9. Decisions & Alternatives Considered
- Postgres (dev-infra) over SQLite: user decision, avoids migration later,
  matches existing stack; SQLite alternative recorded in constitution history.
- drizzle-orm beta over stable: user decision ("beta is fine"); stable fallback
  documented in research ticket 01.
- Flat parent_id tree over projects: spec Q6.
- Hermes-side processing over app-side LLM: spec ticket 03 (keeps app a dumb
  store; capture behavior versionable as a skill).

## 10. Open Technical Questions
- zod vs hand-rolled validation (low stakes; default hand-rolled to stay lean).
- Complete-block error shape (400 vs 409) — default 400 per spec Q3 precedent.
- Whether captures should accept raw voice text as `context` verbatim —
  default yes (Hermes includes transcription).
