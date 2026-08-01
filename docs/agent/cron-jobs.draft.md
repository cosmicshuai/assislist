# Draft — cron job: agent LLM reasoning every 6 hours

Status: IMPLEMENTED 2026-08-01 — job `8aac22b0c1ae` (todo-recommend-llm, `0 */6 * * *`, deliver=local) and job `6dc8d7bdf498` (todo-stale-triage, `0 9 * * *`, deliver=whatsapp).

## Job 1: recommend-llm (every 6h)

- **Schedule**: `0 */6 * * *` (every 6 hours: 00:00, 06:00, 12:00, 18:00)
- **Deliver**: local (no WhatsApp message — this silently refreshes the
  homepage suggestions)
- **Enabled toolsets**: web, terminal, file
- **Prompt** (self-contained):

  > You are the recommendation brain for the Todo System at
  > http://192.168.1.180:3456.
  >
  > 1. Fetch all active tasks: GET /api/v1/tasks?status=active with
  >    `Authorization: Bearer $TODO_API_TOKEN` (token in
  >    ~/dev/todo-system/server/.env; never print it).
  > 2. Reason over the full task list with DeepSeek (deepseek-v4-flash via
  >    https://api.deepseek.com/chat/completions, key from ~/.hermes/.env
  >    or server/.env):
  >    - **top_next**: the 3 concrete tasks the user should do next —
  >      ready (unblocked) first, urgent/due soon, highest leverage. Prefer
  >      leaf subtasks over containers.
  >    - **long_term**: the 3 projects/tasks with the most long-term impact —
  >      big open projects, many open subtasks, strategic value.
  > 3. For each pick, write ONE specific human sentence explaining why
  >    (use the task's context, urgency, due date, dependencies).
  > 4. Output strict JSON:
  >    {"top_next":[{"task_id":N,"reason":"..."}],"long_term":[{"task_id":N,"reason":"..."}]}
  > 5. POST the result to the app: POST /api/v1/recommendations with the
  >    same Bearer token, body
  >    {"top_next":[...],"long_term":[...],"source":"agent"}.
  > 6. Reply with a one-line summary: "recommendations refreshed (3+3)".

- **Backend prerequisite**: new POST /api/v1/recommendations endpoint
  (see backend gaps below) — stores agent picks in the `recommendations`
  table so the homepage reads them instead of the rule engine.

## Job 2: stale-triage (daily)

- **Schedule**: `0 9 * * *` (daily 09:00 — pairs with the existing 8 AM briefing)
- **Deliver**: whatsapp:182776930267386@lid (must reach the user)
- **Skills**: stale-task-triage
- **Prompt** (self-contained):

  > Run the stale-task-triage skill: find active tasks not updated in 60+
  > days, ask the user via WhatsApp whether to abandon them (max 5, most
  > stale first, skip parents with recently-active children). Do not delete
  > anything without confirmation. If nothing is stale, reply with just
  > "no stale tasks" (the WhatsApp channel will not bother the user).

## Backend gaps to close before the cron works

1. **POST /api/v1/recommendations** — agent writes its picks:
   ```json
   { "top_next": [{"task_id": 1, "reason": "..."}],
     "long_term": [{"task_id": 2, "reason": "..."}],
     "source": "agent" }
   ```
   Server upserts into `recommendations` (kind, task_id, rank, reason,
   source='agent'), clearing previous agent rows for that kind.
2. **GET /api/v1/recommendations** — return agent rows when fresh (e.g.
   written < 7h ago), else fall back to the rule engine. UI unchanged.
3. **TODO_API_TOKEN must be in Hermes env** (so cron sessions can call the
   API): user runs the append command (already provided earlier).
4. **DEEPSEEK_API_KEY in server/.env** — for Job 1 to call DeepSeek
   directly. (Alternative: Job 1 calls ?ai=1 and POSTs the result.)
