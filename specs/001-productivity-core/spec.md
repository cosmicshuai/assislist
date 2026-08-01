# Spec — 001-productivity-core

Status: approved-with-defaults
Version: 1.0.0

## 1. Overview
Problem: Capture is friction. Ideas/todos arrive at random moments (often as
voice thoughts), and managing them means switching to a task app, breaking
them down manually, and tracking what depends on what.
Goal: A personal productivity system where the user sends a WhatsApp message
(text or voice) with a todo/reminder; an AI agent researches context, breaks
it into smaller tasks with context, assigns urgency and dependencies; tasks
land in a self-hosted web app with a clean UI and a machine-readable API.
Value: Zero-friction capture → structured, prioritized, dependency-aware task
store → single place to review and execute. Replaces Things 3 (no API) and
rejected Vikunja (UI) with an app built to fit.

## 2. User Stories
- [ ] US-001: As a user, I want to send a WhatsApp voice note with a todo, so
  that I can capture thoughts hands-free.
  - Given WhatsApp is connected, When I send a voice note containing a todo,
    Then Hermes transcribes it and creates tasks in the store.
- [ ] US-002: As a user, I want the AI to research and break down a vague
  request into concrete subtasks, so that I don't have to think through the
  details.
  - Given a captured todo, When the agent processes it, Then it produces
    subtasks each with context, urgency, and dependencies.
- [ ] US-003: As a user, I want to see my tasks in a clean web app, so that I
  can review, reorder, and complete them.
- [ ] US-004: As a user, I want tasks to show what they depend on, so that I
  know the right order to work.

## 3. Functional Requirements
- [ ] FR-001 (MUST): Task CRUD — create, read, update, delete tasks with
  title, description/context, status, priority, due date.
- [ ] FR-002 (MUST): Subtasks — a task can have child tasks (breakdown tree).
- [ ] FR-003 (MUST): Dependencies — task A can depend on task B; UI + API
  expose the graph (depends_on / blocks).
- [ ] FR-004 (MUST): Priority/urgency — machine-readable priority
  (low/medium/high/urgent) plus optional auto-derived urgency.
- [ ] FR-005 (MUST): API for AI agent — token or localhost auth; endpoints
  to create tasks/subtasks with context and dependencies; Hermes can POST.
- [ ] FR-006 (MUST): Capture pipeline — Hermes WhatsApp text + voice messages
  create tasks via the API (after optional user confirmation, see Q8).
- [ ] FR-007 (SHOULD): AI breakdown — agent research (web search) + subtask
  generation with context, urgency, dependency links (behavior defined in a
  skill/AGENTS instruction, not app code).
- [ ] FR-008 (SHOULD): Filtering/sorting — by status, priority, due date,
  dependency order (topological).
- [ ] FR-009 (MUST): Repository pattern — TaskRepository abstraction
  (SqliteTaskRepository MVP) for future PG migration.

## 4. Non-Functional Requirements
- [ ] NFR-001 (MUST): Runs on the homelab (Node 25, node:sqlite), port 3456,
  LAN-bound + Tailscale HTTPS.
- [ ] NFR-002 (MUST): Single-user, local-first. No auth in v1 beyond LAN +
  Tailscale boundary (revisit if exposed publicly).
- [ ] NFR-003 (MUST): Data durability — SQLite DB + canonical store; backup
  via existing nightly rsync.
- [ ] NFR-004 (MUST): API stable IDs + JSON; agent-friendly.
- [ ] NFR-005 (SHOULD): UI fast and clean; mobile-usable.

## 5. Acceptance Criteria
- [ ] AC-001: Voice note "plan Italy trip" → Hermes transcribes → tasks appear
  in web app within ~1 min, broken into subtasks with context.
- [ ] AC-002: Task with dependency cannot be marked done until dependency done
  (or warning per Q3).
- [ ] AC-003: Web app shows task tree, priority badges, dependency indicators;
  CRUD works end-to-end.
- [ ] AC-004: API create-task from curl/Hermes works with auth token.

## 6. Edge Cases
- [ ] EC-001: Empty/garbled voice transcription — no junk tasks (confirm-first
  per Q8).
- [ ] EC-002: Dependency cycle (A depends on B, B depends on A) — reject or
  flag.
- [ ] EC-003: Huge breakdown (50+ tasks) — batch create, progress feedback.
- [ ] EC-004: AI unavailable (DeepSeek down) — capture still works, breakdown
  deferred with "unprocessed" status.
- [ ] EC-005: Duplicate capture — same request twice → dedupe hint, not error.

## 7. Out of Scope
- Multi-user/auth/SSO, sharing, comments, attachments, calendar sync,
  recurrence engine, mobile native app (web is enough), export/import (can
  revisit), Things 3 sync.

## 8. Dependencies & Assumptions
- Hermes WhatsApp gateway connected (done). STT faster-whisper installed (done).
- DeepSeek API available for agent processing (verified).
- Existing ~/dev/todo-app used as API reference only.

## 9. Open Questions
- [x] Q1 RESOLVED 2026-08-01: Option A — files as source of truth + SQLite as
  rebuildable index/cache (matches constitution P3 and user's documented
  storage preference). FR-009 repository pattern retained for PG future.
- [x] Q2 RESOLVED 2026-08-01: React + Vite frontend (matches constitution and
  user's documented preference for markdown-critical UX).
- [x] Q3 RESOLVED 2026-08-01: Strict dependency block — API rejects marking a
  task done while a dependency is incomplete (400), UI disables the checkbox.
  Mirrors spec-manager Q3 decision (strict block 400).
- [x] Q4 RESOLVED 2026-08-01: Auto-create directly; agent asks a single
  clarifying question on WhatsApp only when the input is ambiguous (e.g. low
  transcription confidence). Avoids junk tasks without adding friction.
- [x] Q5 RESOLVED 2026-08-01: Both — fixed priority levels (low/medium/high/
  urgent) stored on the task, plus auto-derived urgency field computed from
  due date + priority (display-level; stored on write).
- [x] Q6 RESOLVED 2026-08-01: Flat tasks with parent_id tree (no separate
  project entity in v1). A captured todo becomes a parent task; AI breakdown
  creates child tasks. Projects deferred to v2 (Out of Scope).
- [x] Q7 RESOLVED 2026-08-01: Dedupe = close-title match hint returned by API,
  not a hard block; UI shows "similar existing" badge.
- [x] Q8 RESOLVED 2026-08-01: Auto-create with undo — WhatsApp confirm only on
  ambiguity; web app has delete/undo. No inline yes/no flow in v1.

Changelog:
- 2026-08-01: v0.1.0 draft created.
- 2026-08-01: v1.0.0 — Q1..Q8 resolved with defaults from constitution and
  user's documented preferences (storage A, React+Vite, strict deps, auto-
  create, dual urgency, parent_id tree, fuzzy dedupe hint, undo UX). Pending
  user amendment if any default is rejected before implementation.

## 10. Success Metrics
- Qualitative: capture is effortless (no app switching); breakdown saves
  thinking time; UI is pleasant enough to use daily.
- Quantitative: time from voice note to tasks < 2 min; > 80% of captures
  become actionable task sets; user opens web app daily.
