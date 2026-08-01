# Draft — stale-task-triage (skill)

Status: DRAFT for review — not installed yet

## Purpose

Find tasks that have **not been updated for more than 60 days** and ask the
user whether to abandon them. Keeps the board honest: stale projects either
get revived or get cleaned up.

## Trigger

- Cron job (daily or weekly) runs this skill.
- User asks "what's stale?" / "clean up old tasks".

## Pipeline

### 1. Fetch stale candidates
GET http://192.168.1.180:3456/api/v1/tasks?status=active with Bearer token.
Filter client-side (or via sort): `updated_at` older than 60 days.

Note: `updated_at` advances on every create/update/complete/reopen. A task
with active subtask edits is NOT stale. A parent whose children changed but
whose own row didn't is a false positive — check children's updated_at too
(via GET /tasks/:id which returns children) before proposing.

### 2. Rank the list
Most stale first. Cap the proposal at 5 tasks per run so the message stays
scannable. Skip:
- tasks completed (filtered by status=active anyway)
- parents that have a child updated within 60 days (actively worked)
- tasks the user explicitly said to keep (see state)

### 3. Ask the user (WhatsApp)
Send ONE message listing the stale tasks:
"🧹 Stale tasks (no update in 60+ days):
1. Plan Italy trip (last update Aug 1)
2. Home maintenance list (last update Jul 1)
Reply with numbers to abandon, or 'keep all'."

Do NOT delete anything without confirmation.

### 4. Act on confirmation
For each confirmed number:
- OPTION A (soft): mark completed with context note "abandoned by user on
  <date>". No new status needed.
- OPTION B (hard): DELETE /api/v1/tasks/:id (cascades children + deps).
Recommend OPTION A for parents (keeps history), OPTION B for junk subtasks.

### 5. State
Remember which tasks were offered but kept (a small local note in the skill's
state file or memory) so we don't re-ask every run for 30 days.

## Backend prerequisites
- None new: list + detail + complete/delete endpoints exist.
- Optional (if user wants an explicit "abandoned" status later): add
  `abandoned` to the task_status enum + migration.
