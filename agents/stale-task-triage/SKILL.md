---
name: stale-task-triage
description: Find tasks idle 60+ days and ask the user to abandon them.
---

# Stale Task Triage (AssisList)

Find tasks that have **not been updated for more than 60 days** and ask the
user whether to abandon them. Keeps the board honest: stale projects either
get revived or get cleaned up. Project-aware: stale PROJECTS are the primary
candidates; archived projects are skipped.

## When to use
- Cron job (daily 09:00) invokes this skill.
- User asks "what's stale?" / "clean up old tasks".

## Configuration (environment variables)
- `ASSISLIST_URL` — base URL, e.g. `http://localhost:3456`. REQUIRED.
- `ASSISLIST_AGENT_TOKEN` — agent token (recommended; restricted scope).
- `ASSISLIST_API_TOKEN` — user token (fallback; use only when the agent
  token is unavailable and you must act on manual rows — prefer asking the
  user to act in the web app).

## Agent identity
Use `ASSISLIST_AGENT_TOKEN` when set. Agent scope may PATCH tasks where
source='whatsapp' and may NOT modify source='manual' tasks (403). Abandoning
a manual task is a user action — when the user confirms an abandon, tell
them the exact task to abandon or have them do it in the web app; do NOT
attempt a 403-forbidden write.

## Pipeline

### 1. Fetch stale candidates — projects first
GET `{ASSISLIST_URL}/api/v1/projects` (agent token).
Filter: `updatedAt` older than 60 days, status active (archived already
excluded by the API default).

Also GET `{ASSISLIST_URL}/api/v1/tasks?status=active` and filter
`updatedAt` older than 60 days for free-floating tasks.

False-positive guard: a project whose TASKS changed recently is NOT stale.
For each candidate project, GET /api/v1/projects/:id and check the
root_tasks' updatedAt (and their children via GET /api/v1/tasks?project_id=)
— skip if any task was updated within 60 days.

### 2. Rank and cap
Most stale first. Cap at 5 per run. Skip:
- completed/abandoned/archived (API default excludes archived)
- projects with a recently-active task (above)
- projects/tasks the user explicitly kept recently (see state)

### 3. Ask the user (WhatsApp/chat)
ONE message:
"🧹 Stale projects (no update in 60+ days):
1. Plan Italy trip (last update Aug 1)
2. Home maintenance list (last update Jul 1)
Reply with numbers to archive or delete, or 'keep all'."

Never abandon/archive anything without confirmation.

### 4. Act on confirmation
For each confirmed number:
- Archive (recommended for projects — keeps history, hides from board):
  PATCH `{ASSISLIST_URL}/api/v1/projects/:id/archive`
- Delete (only if the user explicitly says delete):
  DELETE `{ASSISLIST_URL}/api/v1/projects/:id`
- If the target is a source='manual' project, the agent token will 403 —
  hand the user the exact command or have them use the web app menu.

### 5. State
Keep a small state note of projects offered-but-kept (e.g. a file at
`~/.hermes/scripts/state/stale-triage.json` with project ids + timestamp) so
the same project is not re-offered for 30 days.

## Output
If nothing is stale, reply "no stale projects". Otherwise summarize what was
asked and later what was archived/deleted.
