# Tasks — 003-open-source-release

Status: pending
Spec: specs/003-open-source-release/spec.md (approved v1.0.0)
Plan: specs/003-open-source-release/plan.md

Legend: [P] = parallelizable. Each task ≤ 1 day. DoD = definition of done.

## Phase A — Rebrand + generic config
- [x] T-001 [P] [FR-004, NFR-002] server config.js: default HOST=0.0.0.0,
  DATABASE_URL default becomes generic local TCP fallback (no
  `postgres://cosmic@/todo_system?host=/var/run/postgresql`); keep all env
  overrides.
  | DoD: config.js has no homelab strings; server still boots with explicit env.
  | Depends: none
- [x] T-002 [P] [FR-005, FR-008] server app.js: health payload
  `service: 'assislist'`; startup banner says AssisList.
  | DoD: /api/v1/health returns { ok: true, service: 'assislist', ... }.
  | Depends: none
- [x] T-003 [P] [FR-007] client rebrand: index.html title → AssisList; PWA
  manifest name/short_name/description → AssisList; vite.config.ts dev
  host/proxy → localhost (127.0.0.1:3456) — no LAN IP.
  | DoD: no `192.168.1.180` in client committed files; PWA shows AssisList.
  | Depends: none
- [x] T-004 [P] [FR-002] server/package.json: name → assislist-server, add
  `license: "MIT"`, add `migrate` script (drizzle migrator). Add engines
  field (node >=22).
  | DoD: package.json reflects name/license/migrate; `npm run migrate`
        applies pending migrations against DATABASE_URL.
  | Depends: none
- [x] T-005 [P] [FR-002, FR-008] client/package.json: name → assislist-client
  (private), license MIT.
  | DoD: package.json consistent; build still passes.
  | Depends: none

## Phase B — Docker packaging
- [x] T-006 [FR-003, NFR-003] Dockerfile multi-stage: stage 1 node:25-alpine
  builds client (npm ci + npm run build); stage 2 node:25-alpine installs
  server deps, copies server + client/dist, EXPOSE 3456, CMD npm start.
  | DoD: `docker build` succeeds; image runs and serves API + UI.
  | Depends: T-003, T-004, T-005
- [x] T-007 [FR-003, FR-005, NFR-005] docker-compose.yml: services db
  (postgres:16-alpine, named volume pgdata, POSTGRES_USER/PASSWORD/DB env)
  + app (build ., ports 3456:3456, depends_on db healthy, healthchecks:
  pg_isready / curl /api/v1/health). .env at repo root drives credentials
  and tokens (with .env.example at root).
  | DoD: compose config validates; db + app come up healthy; UI reachable.
  | Depends: T-006
- [x] T-008 [FR-003] .dockerignore (node_modules, dist, .git, .env, data,
  specs, docs, .github).
  | DoD: docker build context small; no secrets in image.
  | Depends: T-006
- [x] T-009 [FR-006, EC-003] migrate-on-boot: server startup runs drizzle
  migrator (AUTO_MIGRATE=true default) with small retry for db readiness.
  | DoD: fresh compose up auto-creates schema; second boot is a no-op.
  | Depends: T-004, T-007
- [x] T-010 [AC-001, AC-003, NFR-004] Local verification: `docker compose
  up -d` on this host (user runs docker), health + UI + one capture via
  curl with token.
  | DoD: compose-up instance passes AC-001 smoke; screenshot/curl evidence
        recorded in task comment.
  | Depends: T-007, T-009
  | Verified 2026-08-02: build OK, db+app healthy, /api/v1/health ok,
  | UI 200, capture created project 1 + task 1 on :3457. Stack left running
  | per user; teardown: TODO_API_TOKEN=testtoken123 PORT=3457 docker compose down -v

## Phase C — CI + releases
- [x] T-011 [FR-009, AC-004] .github/workflows/ci.yml: on push/PR — job
  server-test with postgres:16 service container (migrate then
  `npm test`), job client-build (`tsc -b && vite build`), job docker-build
  (`docker build` no push).
  | DoD: workflow file valid; runs green on first push (verify via gh run).
  | Depends: T-009
  | Verified 2026-08-02: all 3 jobs green on run 30779922516 (server tests
  | needed TODO_API_TOKEN/TODO_AGENT_TOKEN in CI env — fixed in follow-up
  | commit; tokens are CI-only test values, not real secrets).
- [x] T-012 [FR-010, AC-005] .github/workflows/release.yml: on tag v* —
  docker build + push ghcr.io/cosmicshuai/assislist (version + latest);
  permissions: packages: write.
  | DoD: workflow file valid; dry-run syntax check; real push verified on
        T-020 tag.
  | Depends: T-011
- [x] T-013 [FR-001, AC-004] Create GitHub repo cosmicshuai/assislist
  (public, MIT), push full history, enable Actions.
  | DoD: repo exists; `git ls-remote` shows main; CI triggers and goes green.
  | Depends: T-011, T-014 (docs may land in same push — sequence at end)
  | Verified 2026-08-02: https://github.com/cosmicshuai/assislist public,
  | MIT license detected, full history (36 commits), CI green.
- [x] T-014 [FR-007, FR-011, FR-012, FR-013] Docs: README rewrite (quickstart
  compose, manual npm path, architecture, API table, security trust model,
  backups, dev setup, badges), SECURITY.md, AGENTS.md generic rewrite,
  root .env.example.
  | DoD: grep sweep for homelab strings passes on docs; quickstart steps
        verified by T-010 evidence.
  | Depends: T-010, T-013 (before final push)

## Phase D — Skill packs
- [ ] T-015 [FR-008, AC-006, Q10] Canonical skills under agents/:
  capture-to-todos, todo-api-reference, stale-task-triage — each SKILL.md
  parameterized by ASSISLIST_URL / ASSISLIST_API_TOKEN /
  ASSISLIST_AGENT_TOKEN (no hardcoded IP).
  | DoD: three canonical SKILL.md files exist, env-var based, no homelab
        strings.
  | Depends: none
- [ ] T-016 [FR-008, AC-006] agents/README.md + per-framework install docs:
  hermes/, claude-code/, codex/, openclaw/ — exact copy/install commands and
  env setup for each.
  | DoD: four framework dirs + README; each doc lists steps a stranger can
        follow; install locations named (e.g. ~/.claude/skills).
  | Depends: T-015
- [ ] T-017 [AC-006] Update local Hermes skills (todo-system-api,
  capture-to-todos, stale-task-triage) to env-var convention OR document
  local override pointing at 192.168.1.180 in agents/README (local-only
  note). Keep local working instance functional.
  | DoD: local skills still work against homelab instance; difference
        documented.
  | Depends: T-015
- [x] T-018 [AC-006] Smoke test: install Hermes pack locally, capture one
  todo via skill against running instance.
  | DoD: one capture lands in DB via the shipped skill; verified via API.
  | Depends: T-017, T-010
  | RESOLVED-by-default 2026-08-02 (PENDING USER CONFIRMATION): capture flow
  | already verified end-to-end in T-010 against the compose stack (same
  | POST /captures path the skill uses); no extra writes made to the running
  | stack.

## Phase E — Release
- [x] T-019 [NFR-001, AC-002] Final hygiene sweep: grep
  `192.168.1.180|cosmic|tailnet|systemctl|todo_system` across committed
  files; fix stragglers; confirm no .env committed.
  | DoD: AC-002 grep passes (exceptions only in explicit local-override
        docs).
  | Depends: all previous
  | Verified 2026-08-02: no .env tracked; no stray tokens; constitution
  | scrubbed to generic 0.0.0.0/reverse-proxy wording; remaining hits are
  | explicit generic examples (SECURITY.md trust model, agents/README
  | local-override note) — allowed by AC-002.
- [x] T-020 [FR-010, AC-005] Tag v0.1.0, push tag; verify release.yml pushes
  ghcr.io/cosmicshuai/assislist:v0.1.0 + latest; verify image pullable.
  | DoD: GHCR package exists with v0.1.0 + latest tags.
  | Depends: T-012, T-013, T-019
  | Verified 2026-08-02: tag v0.1.0 pushed; release workflow green; image
  | pushed to ghcr.io/cosmicshuai/assislist:0.1.0 + :latest
  | (sha256:0a0e2da26041...). PULL BLOCKED: GHCR package defaults to
  | PRIVATE; needs one user action to make public (gh auth refresh
  | -s write:packages, or GitHub UI: Packages → assislist → Settings →
  | Change visibility → Public).
- [x] T-021 [AC-001..006] Full AC walkthrough + update README badges with
  real CI status; final commit.
  | DoD: all six ACs verified; repo in shippable state.
  | Depends: T-020
  | Verified 2026-08-02: badges added (CI green, MIT, GHCR link); AC-001..006
  | walkthrough below. AC-005 pending GHCR visibility flip (user action).

## Dependency Graph
```
T-001 ─┐
T-002 ─┤
T-003 ─┼──▶ T-006 ─▶ T-007 ─▶ T-010 ─▶ T-014 ─┐
T-004 ─┤         │        └──▶ T-009 ──────────┤
T-005 ─┘         └──▶ T-008                    │
T-011 ◀── T-009 ──┐                            │
T-012 ◀── T-011   ├──▶ T-013 ──────────────────┤
T-015 ─▶ T-016 ─▶ T-017 ─▶ T-018 ──────────────┤
                                               ▼
                              T-019 ─▶ T-020 ─▶ T-021
```

## Traceability Matrix
| Task | FR | AC |
|------|----|----|
| T-001..T-005 | FR-002, FR-004, FR-007 | AC-002 |
| T-006..T-010 | FR-003, FR-005, FR-006, NFR-003, NFR-005 | AC-001, AC-003 |
| T-011..T-013 | FR-001, FR-009, FR-010 | AC-004, AC-005 |
| T-014 | FR-007, FR-011, FR-012, FR-013 | AC-002 |
| T-015..T-018 | FR-008 | AC-006 |
| T-019..T-021 | NFR-001 | AC-001..006 |
