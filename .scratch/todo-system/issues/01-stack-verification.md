# 01 — Verify the v1 stack on Node 25

Type: research
Status: open
Blocked by:

## Question

Does the chosen stack actually work on this machine (Node v25.5.0)?
- drizzle-orm with the node:sqlite driver (DatabaseSync) — supported? or does
  it need better-sqlite3 (which the constitution forbids on Node 25)?
- What is the exact drizzle schema + repository setup for node:sqlite?
- React + Vite mobile-perfect stack: which libraries for a clean, fast,
  mobile-usable UI (Tailwind v4? shadcn? PWA?) that stays lightweight?
- Any Node 25 pitfalls for Express ESM + node:sqlite + Vite dev/build?

## Answer

RESOLVED 2026-08-01 (research subagent, verified against npm registry + docs):

- node:sqlite (DatabaseSync): works on Node 25, no flags needed. Stability
  1.2 (RC) in Node 25.7. Constitution's better-sqlite3 ban validated — it is
  confirmed broken on Node 25 (no prebuilt binaries, native compile fails).
- Express 5.2.1 + ESM: fine on Node 25. Vite 8.2.0: fine on Node 25.
- MAJOR FINDING: stable drizzle-orm (0.45.2) does NOT export the node:sqlite
  driver — `import('drizzle-orm/node-sqlite')` fails on stable. The driver
  only exists on the 1.0.0-beta line (1.0.0-beta.22). drizzle-kit 0.31.10 also
  doesn't support node:sqlite for migrate/push/studio (bug #5471).
- UI recommendation: Tailwind CSS v4 (4.3.3) + shadcn/ui (CLI 4.16.1) on
  React 19 TS; add vite-plugin-pwa 1.3.0 for homescreen + offline.

DRIVER DECISION 2026-08-01 (user): **drizzle-orm beta + PostgreSQL** using the
existing dev-infra Postgres 16 (localhost:5432, DB `todo_system`, peer auth as
cosmic over unix socket). No SQLite. drizzle-orm@beta (1.0.0-beta.22) with the
pg driver; repository pattern TaskRepository → PgTaskRepository.

RESOLVED.
