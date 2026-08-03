---
name: capture-to-todos
description: Turn a todo/voice note into an ordered task tree in AssisList.
---

# Capture to Todos (AssisList)

Turn a user's todo/reminder (typically arriving via WhatsApp, text or voice
note) into a **context-informed, dependency-ordered task tree** in the
self-hosted AssisList app. Model: `project -> parent task -> child task ->
...`, every task carries the same `project_id`. Use the **agent token** for
captures — it cannot modify user-created tasks.

## When to use
- User sends a message that is a todo, reminder, or intent to do something
  ("plan Italy trip", "remember to book dentist", a voice note about a
  project).
- The message is NOT a question or instruction to the assistant itself.

## Configuration (environment variables)
- `ASSISLIST_URL` — base URL of your instance, e.g. `http://localhost:3456`
  or `https://todos.example.com`. No trailing slash. REQUIRED.
- `ASSISLIST_AGENT_TOKEN` — agent-scoped token for writes (POST /captures,
  subtasks). Recommended; falls back to ASSISLIST_API_TOKEN if unset.
- `ASSISLIST_API_TOKEN` — user-scoped token (full access). Use only when the
  agent token is unavailable.

## Agent permissions (IMPORTANT)
- Agent scope CAN: GET tasks/projects; POST /captures; POST /tasks with
  project_id + parent_id (subtasks, source=whatsapp); edit/complete/delete
  only tasks with source='whatsapp' (agent-created).
- Agent scope CANNOT: create projects directly (POST /projects → 403), add
  root tasks (POST /tasks without parent_id → 403), or modify any
  source='manual' task (→ 403). Projects are created via capture or by the
  user in the web app.
- If you get a 403, respect it: never bypass by re-labeling source.

## Pipeline (executed by the agent, in order)

### 1. TRANSCRIBE (voice only)
If the input is a voice note, use its transcription as the input.

### 2. CLARIFY — proactively ask for context
Decide if the todo has enough context. Look for gaps: deadline, scope,
people, constraints, location, budget, "why", ambiguous phrasing.

- If the message already carries enough context, skip to research/breakdown.
- Otherwise ask **1–3 targeted questions in ONE message** (never an
  interrogation):
  "A couple of quick questions to shape this:
  1. When are you planning to go?
  2. Who's going / budget?
  3. Anything already booked?"
- The questions must come from the actual gaps, not a fixed template.
- After asking, STOP and wait for the reply. Do NOT create the tree yet.
- If the user says "just capture it" / "no questions", skip and create with
  what you have.

### 3. DECIDE TARGET — new project vs existing
- GET `{ASSISLIST_URL}/api/v1/projects?q=<keyword>` (agent token) to find
  open projects with a matching title/context.
- If the user names or implies an existing project, target it.
- Otherwise this becomes a NEW project.

### 4. GATHER CONTEXT
a) Clarification answers (richest context).
b) User memory / profile for durable facts relevant to the task.
c) Past task history: GET `{ASSISLIST_URL}/api/v1/tasks?q=<keyword>` — reuse
   context, avoid duplicates.
d) Web research (if useful): quick search for factual gaps. At most ONE
   link/fact per subtask. NEVER fabricate URLs — only URLs actually seen.

### 5. BREAKDOWN — ordered + dependency-aware
- 2..8 subtasks.
- Each subtask: title, context (1-3 sentences), priority, optional due_date,
  depends_on (0-based sibling indices).
- **Ordering rule**: subtasks MUST be listed in dependency order — a subtask
  may only depend on earlier siblings (depends_on < own index).

### 6. WRITE to API
Header: `Authorization: Bearer $ASSISLIST_AGENT_TOKEN`

**Case A — NEW project** (no project_id):
POST /captures — creates the project (title = captured todo); breakdown items
become its ROOT (parent) tasks. Response includes `project.id`.
```json
{
  "title": "Plan Italy trip",
  "context": "...",
  "breakdown": [
    { "title": "Book flights", "context": "...", "priority": "high",
      "due_date": "2026-08-20", "depends_on": [] },
    { "title": "Book hotels", "context": "...", "depends_on": [0] }
  ]
}
```

**Case B — EXISTING project** (user named it):
POST /captures with `project_id` — adds ONE parent task (title = captured
todo) + its breakdown children under that project.
```json
{
  "title": "Add: book museum tickets",
  "project_id": 12,
  "breakdown": [
    { "title": "Check opening hours", "depends_on": [] },
    { "title": "Buy tickets", "depends_on": [0] }
  ]
}
```

**Case C — single subtask under an existing task** (quick add):
POST /tasks with project_id + parent_id (parent must exist; new task is
source=whatsapp and editable later). Do NOT pass parent_id of a
source='manual' task and expect to edit the parent itself.
```json
{ "project_id": 12, "parent_id": 34, "title": "Call dentist", "context": "..." }
```

### 7. CONFIRM
- Case A: "✅ Added project: <title> (+N tasks)" + link to the instance.
- Case B: "✅ Added to <project title>: <title> (+N subtasks, ordered)"
- If the API returned `similar`, mention: "note: similar to existing '<title>'".
- If 401/403: token missing/wrong or forbidden — tell the user to check env
  vars and that agent scope may not modify that task.

## Ambiguity rule
If replies are still garbled, ask ONE more focused question. Do not create
junk tasks from noise. If the user says "just capture it", create with what
you have.

## Urgency guidance (mirrors the app's deriveUrgency)
- urgent: explicit deadline within 48h or user said urgent
- high: deadline within a week, or multi-step blocker
- medium: normal
- low: nice-to-have

## Verification
After POST, check HTTP 201 and that `project.id` + `subtasks` are present
(Case A) or `task.id` + `subtasks` (Case B/C). If 401, the token is
missing/wrong — tell the user to check ASSISLIST_URL / tokens.
