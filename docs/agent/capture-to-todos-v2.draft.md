# Draft — capture-to-todos v2 (skill)

Status: IMPLEMENTED 2026-08-01
Replaces: `capture-to-todos` (v1, 2026-08-01)

## Purpose

Turn a WhatsApp todo/reminder (text or voice) into a **context-informed,
memory-aware, dependency-ordered task tree** in Todo System — not just a
generic breakdown.

## When to use

- User sends a todo/reminder/intent via WhatsApp (text or voice).
- NOT for questions, commands about Hermes itself, or chat.

## Pipeline

### 1. Transcribe (voice only)
Hermes already auto-transcribes (faster-whisper). Use the transcription as input.

### 2. Gather context (NEW — memory-aware)
Combine THREE sources before breaking down:

a) **Message context**: the todo text + anything the user said around it.
b) **User memory**: consult user profile + memory notes for relevant durable
   facts (e.g. lives in Arlington MA, uses Things 3, iPhone photos workflow,
   prefers files-as-truth). Ask: what does the user's situation imply about
   this task?
c) **Past task history**: if useful, session_search / list tasks for related
   prior captures ("plan Italy trip" may already have prior subtasks) so we
   don't duplicate and can reuse known context.
d) **Web research (if useful)**: quick search for factual gaps; at most ONE
   link/fact per subtask; never fabricate URLs.

Rule: context in subtasks must reflect the user's real situation, not generic
advice. If memory has a relevant fact (e.g. "user prefers nonstop flights"),
fold it into the subtask context.

### 3. Breakdown (ordered + dependency-aware)
- 1 parent + 2..8 subtasks.
- Each subtask: title, context (1-3 sentences), priority, optional due_date,
  depends_on (0-based sibling indices).
- **Ordering**: subtasks MUST be listed in dependency order (a subtask can
  only depend on earlier siblings). depends_on edges define the execution
  order; the UI renders them in that order.
- Urgency guidance mirrors app deriveUrgency:
  urgent = ≤48h deadline or user said urgent; high = ≤1wk or multi-step
  blocker; medium = normal; low = nice-to-have.

### 4. Write to API
POST http://192.168.1.180:3456/api/v1/captures with Bearer TODO_API_TOKEN
from server/.env (or Hermes env). Body:
```json
{
  "title": "...",
  "context": "...",
  "breakdown": [
    { "title": "...", "context": "...", "priority": "high", "due_date": "2026-08-20", "depends_on": [0] }
  ]
}
```
The app creates parent + children + dependency rows in one transaction.

### 5. Update existing tasks (NEW — when relevant)
If the capture relates to an existing open project and the user asked to
extend it, do NOT create a new parent. Instead:
- Add subtasks to the existing parent: POST /tasks { title, parent_id }.
- Wire dependencies: POST /tasks/:id/dependencies { depends_on_id }.
- Return the existing project id so the web app shows the updated tree.

### 6. Confirm
Reply on WhatsApp:
"✅ Added: <title> (+N subtasks, ordered)" with the web link
http://192.168.1.180:3456 . If API returned `similar`, mention it
("note: similar to existing '<title>'").

## Ambiguity rule
If the input is too garbled/ambiguous to break down confidently, ask ONE
clarifying question first (spec Q4). No junk tasks.

## Backend prerequisites
- None new for the core flow (captures endpoint exists).
- For "update existing tasks": tasks + dependencies endpoints exist.
