# Spec — 003-open-source-release

Status: approved
Version: 1.0.0

## 1. Overview
Problem: Todo System is a working, spec'd product (001 productivity core, 002
projects + agent permissions) but it is not distributable. The repo has no
remote, no license, no Docker packaging, no CI, and its README/.env.example/
AGENTS.md are full of homelab-specific details (192.168.1.180, Tailscale,
systemd user service, peer auth as cosmic, dev-infra PG). A stranger cannot
clone it, run it, or install its agent skills. The agent skills themselves
(capture-to-todos, todo-system-api, stale-task-triage) exist only as Hermes
SKILL.md files and draft docs — no packaged, versioned distribution for other
agent frameworks.
Goal: Turn the project into "AssisList", a production-ready open-source
product: a public GitHub repo (MIT), one-command Docker Compose install
(server + Postgres + UI), CI with tests and image builds, generic
documentation, and installable agent skill packs for Hermes, Claude Code,
Codex, and OpenClaw.
Value: Others can self-host AssisList in minutes, AI agents on four platforms
can capture/manage todos against it, and the project gains a maintainable
public identity with a real release pipeline.

## 2. User Stories
- [ ] US-001: As a new user, I want to run the whole system with one Docker
  Compose command, so that I can self-host AssisList without knowing Node,
  Postgres, or systemd.
  - Given Docker + Compose installed, When I run `docker compose up -d`,
    Then the API, web UI, and Postgres all come up healthy on a single port
    with persistent storage.
- [ ] US-002: As a new user, I want a README that walks me from zero to
  working in minutes, so that setup is obvious.
  - Given a fresh clone, When I follow the quickstart, Then I have a running
    instance, a generated API token, and a link to the web UI.
- [ ] US-003: As an AI agent user on Hermes/Claude Code/Codex/OpenClaw, I
  want to install a skill pack that knows the AssisList API, so that my agent
  can capture todos and manage task trees.
  - Given my agent framework, When I follow its install instructions, Then
    the capture/API/triage skills load and work against my instance.
- [ ] US-004: As a maintainer, I want CI that runs tests and builds images,
  so that regressions and broken builds are caught on every push.
  - Given a push/PR, When CI runs, Then server tests pass against a real
    Postgres service container, client builds, and a Docker image builds.
- [ ] US-005: As a maintainer, I want tagged releases to publish images, so
  that users pin versions.
  - Given a git tag vX.Y.Z, When CI runs on the tag, Then a GHCR image
    `ghcr.io/cosmicshuai/assislist:X.Y.Z` is published.
- [ ] US-006: As a maintainer, I want the repo to be clean of homelab
  specifics, so that strangers never see my LAN IPs or service setup.
  - Given the public repo, When I search for 192.168.1.180, cosmic, tailnet,
    or systemd, Then only generic examples (or none) appear in committed docs.

## 3. Functional Requirements
- [ ] FR-001 (MUST): Repo identity — public GitHub repo
  `github.com/cosmicshuai/assislist`, pushed from the existing git history,
  default branch `main`.
- [ ] FR-002 (MUST): License — MIT: `LICENSE` file (2026, cosmicshuai),
  license metadata in server/package.json and client/package.json, README
  license badge.
- [ ] FR-003 (MUST): Docker packaging — `Dockerfile` (multi-stage: build
  client, copy dist into Express server) and `docker-compose.yml` at repo
  root with two services: `db` (postgres:16-alpine, named volume for data)
  and `app` (build from repo, depends_on db healthy, exposes API + UI).
- [ ] FR-004 (MUST): Env-driven config — server reads PORT, HOST, DATABASE_URL
  (TCP, password auth for compose), TODO_API_TOKEN, optional
  TODO_AGENT_TOKEN and DEEPSEEK_API_KEY from env. No hardcoded LAN IPs in
  code. `server/.env.example` becomes generic (postgres://assislist:pass@db:5432/assislist).
- [ ] FR-005 (MUST): Health check — `/api/v1/health` returns ok and is used
  as the compose healthcheck for `app`; `db` uses pg_isready.
- [ ] FR-006 (MUST): One-command UX — compose brings up db + app; app
  auto-runs schema migrations on startup (or documented one-shot
  `docker compose exec app npm run migrate`). First-run experience prints or
  documents token generation (`openssl rand -hex 32`).
- [ ] FR-007 (MUST): README rewrite — quickstart (compose), manual install
  (npm) as advanced, architecture, API reference table, two-token security
  model and trust boundary, skill installation per agent framework, backups
  guidance, development setup, links to specs. No homelab-specific values.
- [ ] FR-008 (MUST): Skill packs — under `agents/` (or `skills/`): three
  skills authored once in canonical SKILL.md form — `capture-to-todos`,
  `todo-api-reference`, `stale-task-triage` — with per-framework packaging
  and install docs: Hermes (`~/.hermes/skills/`), Claude Code
  (`~/.claude/skills/`), Codex (`~/.codex/skills/` or documented dir),
  OpenClaw (documented dir). Skill contents parameterize the server base URL
  and tokens via env vars (e.g. ASSISLIST_URL, ASSISLIST_AGENT_TOKEN), not
  hardcoded 192.168.1.180.
- [ ] FR-009 (MUST): CI — GitHub Actions workflow: server tests against a
  Postgres 16 service container, client build, Docker image build (no push
  on PRs).
- [ ] FR-010 (MUST): Release publishing — on tags `v*`: build + push image
  to `ghcr.io/cosmicshuai/assislist` (tags: version + latest). README badges
  (CI, license, image).
- [ ] FR-011 (SHOULD): Generic AGENTS.md — replace homelab specifics with
  generic stack/SDD conventions; keep SDD workflow mandatory.
- [ ] FR-012 (SHOULD): SECURITY.md — trust model, token scopes, reporting
  contact; .env.example values never committed; secrets note.
- [ ] FR-013 (SHOULD): Backups doc — generic pg_dump instructions in README
  (homelab backup-nas.sh stays local, not in repo).
- [ ] FR-014 (SHOULD): Test DB strategy — tests currently run against dev
  DB; CI uses service container + a dedicated test database; local dev can
  keep pointing at dev-infra.

## 4. Non-Functional Requirements
- [ ] NFR-001 (MUST): No secrets in repo — grep-verified: no .env, no tokens,
  no LAN IPs in committed files.
- [ ] NFR-002 (MUST): Portability — everything configurable via env; compose
  works on any Docker host; no dependency on homelab services.
- [ ] NFR-003 (SHOULD): Reproducible builds — Dockerfile pins Node LTS (or
  explicit major) + postgres:16-alpine; package-lock committed.
- [ ] NFR-004 (SHOULD): Documentation quality — quickstart verified
  end-to-end by the maintainer before release (AC-003).
- [ ] NFR-005 (MUST): Data safety — Postgres data on a named volume; compose
  down does not delete data; README documents backup/restore.

## 5. Acceptance Criteria
- [ ] AC-001: Fresh clone + `docker compose up -d` on a clean Docker host
  yields a healthy app on :3456 serving both API and web UI.
- [ ] AC-002: `grep -r '192.168.1.180\|cosmic\|tailnet\|systemctl' --include='*.md' --include='*.ts' --include='*.js' --include='*.yml' --include='*.yaml' --include='*.env*' .` returns nothing except explicit generic examples in docs (or none).
- [ ] AC-003: Quickstart steps in README reproduce a running instance with a
  generated token and a captured task.
- [ ] AC-004: CI is green on the initial push (tests + client build + image
  build).
- [ ] AC-005: A tagged release publishes `ghcr.io/cosmicshuai/assislist:vX.Y.Z`
  and `:latest`, and the compose file references the published image.
- [ ] AC-006: Each of the four agent frameworks has an install doc that a
  stranger can follow; each skill's default config points at env vars, and
  the three skills are present in at least the Hermes and Claude Code packs.

## 6. Edge Cases
- [ ] EC-001: Port 3456 already in use — compose uses `PORT` env, documented.
- [ ] EC-002: Existing data dir — named volume persists across compose
  up/down; upgrade path documented (backup before image bump).
- [ ] EC-003: Fresh DB with no migrations — app startup must not crash;
  migrations run explicitly or automatically per FR-006.
- [ ] EC-004: Token missing — server refuses to start (or fails fast) with a
  clear message; UI shows auth error, not a silent 401 loop.
- [ ] EC-005: Agent token unset — single-token mode preserved (002 behavior)
  and documented.
- [ ] EC-006: Non-Linux Docker (Mac/Windows) — compose must use host ports
  and volumes that work cross-platform (no bind mounts with Linux-only
  permissions).
- [ ] EC-007: Skill install conflicts — install docs note overwriting an
  existing skill of the same name.

## 7. Out of Scope
- Auth/SSO/login screens (Q6 decision: two-token model, documented trust
  boundary). Deferred to a future spec.
- Multi-user/multi-tenant features.
- SQLite backend (compose bundles Postgres; repository pattern keeps the door
  open).
- npm publishing of the server package (compose is the supported install
  path).
- Mobile app, native clients, webhooks, calendar sync, notifications.
- Translations/localization.
- Formal changelog tooling (CHANGELOG.md manual for now).

## 8. Dependencies & Assumptions
- GitHub account cosmicshuai, gh CLI authenticated with repo + workflow
  scopes (verified 2026-08-02).
- Docker + Compose v2 available on user's machine for verification; user
  runs Docker commands locally (no agent sudo).
- Existing git history is worth keeping (fresh repo not required).
- PG16 stays the storage engine (compose-provided).
- Skill canonical form is SKILL.md (Hermes and Claude Code share it);
  Codex/OpenClaw packaging follows each framework's documented conventions —
  to be confirmed during plan (research task).

## 9. Open Questions
- [ ] Q1: Install model — RESOLVED 2026-08-02: Docker Compose one-command
  (server + Postgres + UI), npm as documented advanced path.
- [ ] Q2: License — RESOLVED 2026-08-02: MIT.
- [ ] Q3: Name — RESOLVED 2026-08-02: AssisList. Repo/image/npm scope:
  assislist. Repo github.com/cosmicshuai/assislist, image
  ghcr.io/cosmicshuai/assislist.
- [ ] Q4: Skill pack matrix — RESOLVED 2026-08-02: all four in v1 (Hermes +
  Claude Code + Codex + OpenClaw).
- [ ] Q5: Skill set — RESOLVED 2026-08-02: capture-to-todos + API reference
  + stale-task-triage.
- [ ] Q6: Auth posture — RESOLVED 2026-08-02: keep two-token model,
  document trust boundary clearly.
- [ ] Q7: Image registry —
  RESOLVED 2026-08-02 (user confirmed): GHCR
  (ghcr.io/cosmicshuai/assislist). Rationale: matches existing gh scopes,
  no extra account; Docker Hub mirror possible later.
- [ ] Q8: Client API base — RESOLVED 2026-08-02 (verified by code
  inspection): client uses `VITE_API_BASE || '/api/v1'` (src/api/client.ts)
  with a Vite dev proxy; prod build served by Express on the same port
  talks same-origin /api/v1. No VITE host config needed. Note: the client
  embeds VITE_TODO_API_TOKEN in the bundle — acceptable under the Q6 trust
  model (single-user, own-network security), documented in README.
- [ ] Q9: Repo history —
  RESOLVED 2026-08-02 (user confirmed): keep full
  git history (no squash). Rationale: history is small, no secrets
  committed (.env gitignored).
- [ ] Q10: Skill env var names —
  RESOLVED 2026-08-02 (user confirmed):
  ASSISLIST_URL + ASSISLIST_AGENT_TOKEN + ASSISLIST_API_TOKEN.
  Rationale: framework-agnostic, matches project name.

## 10. Success Metrics
- Qualitative: A stranger can clone → compose up → capture a todo from an AI
  agent in under 10 minutes; repo looks professional (badges, license, clean
  docs); homelab specifics fully purged.
- Quantitative: 1-command install; 0 hardcoded LAN IPs; 4 agent frameworks
  documented; CI green; ≥1 tagged release with published image.
