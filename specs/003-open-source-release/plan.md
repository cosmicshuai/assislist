# Plan — 003-open-source-release

## 1. Context & Goals
Spec: `specs/003-open-source-release/spec.md` (approved v1.0.0).
Goal: ship Todo System as "AssisList" — a public, MIT-licensed, one-command
Docker Compose product with CI, GHCR releases, generic docs, and agent skill
packs for Hermes / Claude Code / Codex / OpenClaw. Purge homelab specifics
(192.168.1.180, cosmic, tailnet, systemd) from committed files.

## 2. Architecture Overview
```
GitHub: cosmicshuai/assislist (public, MIT, full history kept)
  ├─ Dockerfile              multi-stage: client build → node server
  ├─ docker-compose.yml      db (postgres:16-alpine) + app (API+UI, :3456)
  ├─ .github/workflows/      ci.yml (PRs/push) + release.yml (tags → GHCR)
  ├─ agents/                 canonical SKILL.md packs + per-framework install docs
  ├─ server/                 Express 5 ESM API (unchanged logic; env defaults generic)
  └─ client/                 React 19 + Vite + MUI (rebrand to AssisList; same-origin /api)
```
Data flow unchanged: client → /api/v1 (same origin) → repositories → Postgres.
Compose brings db + app; app auto-migrates on boot (drizzle migrator, idempotent).

## 3. Data Model
Unchanged (projects + tasks, PG16). No schema changes in this spec. Migrations
already exist in `server/drizzle/` and are applied by the migrator at boot.

## 4. API Contracts
Unchanged from spec 002 (see README table). Only addition: `/api/v1/health`
already exists and becomes the compose healthcheck. Health payload service
name changes from `todo-system` to `assislist`.

## 5. File Layout & Modules
```
/ (repo root)
  LICENSE                      MIT, 2026 cosmicshuai
  README.md                    full rewrite — quickstart, install, API, security, skills
  SECURITY.md                  trust model, token scopes, reporting
  AGENTS.md                    generic rewrite (stack, SDD, conventions)
  Dockerfile                   multi-stage (node:25-alpine)
  .dockerignore                node_modules, dist, .git, .env, data, specs?
  docker-compose.yml           db + app, healthchecks, named volume
  .github/workflows/ci.yml     test + client build + docker build on push/PR
  .github/workflows/release.yml  tag v* → build+push ghcr.io/cosmicshuai/assislist
  agents/
    capture-to-todos/SKILL.md          canonical (env-parameterized)
    todo-api-reference/SKILL.md        canonical
    stale-task-triage/SKILL.md         canonical
    README.md                          matrix + install per framework
    hermes/   claude-code/   codex/   openclaw/   (install docs + copies where needed)
  specs/003-open-source-release/       this spec (spec/plan/tasks)
server/
  src/config.js                defaults generic: HOST=0.0.0.0, DATABASE_URL required (fallback local TCP)
  src/app.js                   health payload → assislist
  package.json                 name assislist-server, license MIT, migrate script
  .env.example                 generic TCP URL + tokens + DEEPSEEK_API_KEY
client/
  index.html                   title → AssisList
  vite.config.ts               dev host/proxy generic (localhost)
  src/ (PWA manifest)          name/short_name/description → AssisList
  .env.example                 VITE_TODO_API_TOKEN + VITE_API_BASE=/api/v1
  package.json                 name assislist-client (private), license MIT
```

## 6. Implementation Approach (phases)
Phase A — Rebrand + generic config (server & client)
  1. config.js: default HOST=0.0.0.0; DATABASE_URL no homelab default.
  2. app.js health → `assislist`; console banner.
  3. client: index.html title, PWA manifest, vite dev host/proxy → localhost.
  4. server/package.json: name assislist-server, license MIT, add migrate script.
  5. client/package.json: name assislist-client, license MIT.
Phase B — Docker packaging
  6. Dockerfile (multi-stage node:25-alpine; build client; server serves dist).
  7. docker-compose.yml (db + app; env-driven; healthchecks; named volume).
  8. .dockerignore.
  9. migrate-on-boot: auto-run drizzle migrator in server startup (AUTO_MIGRATE=true default).
  10. Local verification: docker compose up -d on this machine (user runs), health + UI + capture smoke.
Phase C — CI + releases
  11. ci.yml: postgres:16 service container, run migrations, npm test (server), client build, docker build.
  12. release.yml: on tag v* → GHCR push with version + latest.
  13. Push repo to GitHub (cosmicshuai/assislist), enable Actions, verify CI green.
Phase D — Docs + hygiene
  14. README rewrite (quickstart, install matrix, API, security trust model, backups, dev setup).
  15. SECURITY.md, AGENTS.md generic rewrite.
  16. LICENSE + badges; homelab grep sweep (AC-002).
Phase E — Skill packs
  17. Author canonical skills (capture-to-todos, todo-api-reference, stale-task-triage) env-parameterized (ASSISLIST_URL, ASSISLIST_AGENT_TOKEN, ASSISLIST_API_TOKEN).
  18. agents/README.md + per-framework install docs (Hermes, Claude Code, Codex, OpenClaw); copy packs into each dir.
  19. Update local Hermes skills to the canonical env-var convention (or keep local overrides pointing at LAN IP — documented).
Phase F — Release
  20. Tag v0.1.0 → release.yml publishes image; verify GHCR.
  21. AC checklist walkthrough; final grep sweep.

## 7. Testing Strategy
- Server unit/integration: existing `node --test` suite; CI runs against a
  dedicated test DB in the postgres service container (migrate first).
  AC-004.
- Client: `tsc -b && vite build` in CI (no e2e in this spec). AC-004.
- Docker: manual compose-up verification on the user's host (user runs
  docker commands). AC-001, AC-003.
- Skill packs: install one (Hermes) locally, smoke a capture against the
  running compose instance; docs-only for the other three frameworks.
  AC-006.
- Grep sweep for homelab strings. AC-002.

## 8. Risks & Mitigations
- Node 25 vs LTS: project already runs Node 25 (type-stripping for schema.ts
  imports); pin node:25-alpine in Dockerfile; revisit when 26 LTS lands.
  Mitigation: explicit major pin in Dockerfile + engines field.
- GHCR push needs `packages: write` permission on GITHUB_TOKEN — set in
  release.yml permissions block.
- Auto-migrate on boot could race db readiness — compose `depends_on:
  condition: service_healthy` + pg_isready healthcheck; migrator is
  idempotent; small retry loop if needed.
- Client token in bundle (VITE_TODO_API_TOKEN) — documented trust model per
  Q6/Q8; SECURITY.md states it plainly.
- Renaming package.json names could break local systemd service paths —
  systemd unit references repo paths, not package names; verify before
  restart (user runs restart).
- Docker on this host: verify `docker` and `docker compose` availability
  before Phase B; fall back to podman-compose docs if needed.

## 9. Decisions & Alternatives Considered
- Docker Compose one-command (Q1) over npm distribution — simplest for
  strangers; npm path stays documented as advanced.
- MIT (Q2) — permissive, standard for self-hosted tools.
- GHCR (Q7) over Docker Hub — matches gh scopes; Hub mirror deferred.
- Keep full git history (Q9) — small repo, no secrets committed.
- Auto-migrate on boot vs manual migrate step — auto keeps one-command
  promise; migrator idempotent.
- Canonical skills live in `agents/` in-repo (Q5/Q10); local Hermes copies
  stay as the working instance.

## 10. Open Technical Questions
- None blocking. Follow-ups: whether to add a `docker-compose.override.yml`
  example for exposing only LAN vs tailnet; whether README should include a
  one-line `curl | sh` (deferred — security posture says no).
