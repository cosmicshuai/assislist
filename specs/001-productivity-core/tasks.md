# Tasks — 001-productivity-core

## Phase: Setup
- [x] T-001 [P] [NFR-001] Scaffold server (npm init, ESM, express 5, pg, drizzle-orm@beta, drizzle-kit) + .env (DATABASE_URL, TODO_API_TOKEN) + .gitignore | DoD: `npm start` boots empty express on 127.0.0.1:3456, health route returns JSON | Depends: none
- [x] T-002 [P] [NFR-005] Scaffold client (Vite react-ts, Tailwind v4, shadcn/ui init, vite-plugin-pwa) | DoD: `npm run dev` serves styled landing page; PWA manifest wired | Depends: none

## Phase: Data layer
- [x] T-003 [FR-009] [FR-001] [FR-002] [FR-003] Drizzle schema: tasks + task_dependencies tables; drizzle.config.ts | DoD: `drizzle-kit generate` produces migration; schema reflects plan §3 | Depends: T-001
- [x] T-004 [FR-009] Apply migration to assislist (drizzle-kit or SQL) | DoD: tables exist in Postgres; `psql \dt` shows tasks + task_dependencies | Depends: T-003
- [x] T-005 [FR-009] TaskRepository interface + PgTaskRepository (CRUD, children query, deps query/insert/delete, complete with blocking check) | DoD: repository unit tests pass against test DB | Depends: T-004

## Phase: API core
- [x] T-006 [FR-005] Auth middleware (Bearer TODO_API_TOKEN) + health route | DoD: 401 without token, 200 with; test | Depends: T-001
- [x] T-007 [FR-001] [FR-002] Tasks routes: GET list (filters/sort), GET :id (children+deps), POST, PUT, DELETE, PATCH complete | DoD: curl smoke tests pass; strict dep block returns 400 | Depends: T-005, T-006
- [x] T-008 [FR-003] Dependencies routes: POST /tasks/:id/dependencies (cycle rejection), DELETE | DoD: cycle insert rejected 400; tests | Depends: T-007

## Phase: Capture service
- [x] T-009 [FR-006] [FR-007] [FR-004] captureService: validate payload, dedupe (similar-title hint), transactional tree create w/ dependency wiring, urgency derive | DoD: capture test creates parent+subtasks+deps atomically; similar hint returned | Depends: T-007
- [x] T-010 [FR-006] POST /api/v1/captures route + schema validation | DoD: curl capture smoke test; malformed payload 400 | Depends: T-009

## Phase: Frontend
- [x] T-011 [FR-001] [FR-002] [AC-003] Task list + expandable cards (parent expands children); add/edit/delete UI wired to API | DoD: CRUD works in browser against live API | Depends: T-002, T-007
- [x] T-012 [FR-003] [AC-002] Dependency UI: "Blocked by" badge + disabled checkbox; add/remove dependency | DoD: blocked task checkbox disabled; tooltip shows blocker | Depends: T-011, T-008
- [x] T-013 [FR-004] [FR-008] Priority/urgency badges + filters bottom-sheet (status/priority/urgency/due/dependency/search) + sort | DoD: filters work on mobile viewport; badge colors correct | Depends: T-011
- [x] T-014 [AC-003] Mobile polish: bottom action bar, swipe complete/delete, pull-to-refresh, safe-area, empty/error states | DoD: mobile-usable on iPhone Safari + installed PWA | Depends: T-013

## Phase: Integration
- [x] T-015 [FR-006] [AC-001] Hermes "capture to todos" skill: WhatsApp text/voice → transcribe → research → breakdown JSON → POST /captures → confirm reply | DoD: live WhatsApp voice note produces task tree in web app < 2 min | Depends: T-010, T-013
- [x] T-016 [AC-004] E2E verification: scripted capture + UI check; backup flow includes postgres | DoD: full AC checklist passes; pg_dump/backup spot-check | Depends: T-015

## Phase: Testing
- [x] T-017 [AC-001..004] Final AC pass + README (setup, URL, capture usage) | DoD: all AC checkboxes ticked; README current | Depends: T-016

### Dependency Graph
```
T-001 ─┬─▶ T-003 ─▶ T-004 ─▶ T-005 ─▶ T-007 ─┬─▶ T-009 ─▶ T-010 ─▶ T-015 ─▶ T-016 ─▶ T-017
T-002 ─┘        (T-003→T-004)     T-006 ─┘    T-008 ─┘        T-011 ─▶ T-012 ─▶ T-013 ─▶ T-014 ─┘
```

### Traceability Matrix
| Task | FR | NFR | AC |
|------|----|-----|----|
| T-001 | | NFR-001 | |
| T-002 | | NFR-005 | |
| T-003 | FR-009, FR-001, FR-002, FR-003 | | |
| T-004 | FR-009 | | |
| T-005 | FR-009 | | |
| T-006 | FR-005 | | |
| T-007 | FR-001, FR-002 | | AC-003 |
| T-008 | FR-003 | | AC-002 |
| T-009 | FR-006, FR-007, FR-004 | | |
| T-010 | FR-006 | | |
| T-011 | FR-001, FR-002 | | AC-003 |
| T-012 | FR-003 | | AC-002 |
| T-013 | FR-004, FR-008 | | |
| T-014 | | NFR-005 | AC-003 |
| T-015 | FR-006 | | AC-001 |
| T-016 | | NFR-003 | AC-004 |
| T-017 | | | AC-001..004 |
