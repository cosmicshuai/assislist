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

### 2. Gather context — memory-aware + PROACTIVE CLARIFICATION
Before breaking down, decide if the todo has enough context. Look for what is
missing or vague: deadline, scope, people involved, constraints, location,
budget, "why", or ambiguous phrasing.

- If the message already carries enough context, skip to research/breakdown.
- Otherwise ask 1–3 targeted questions in ONE WhatsApp message (batched, not
  an interrogation), derived from the actual gaps. STOP and wait for the
  reply — do NOT create the task tree yet.
- If the user says "just capture it", create with what you have.

Then combine FOUR sources:
a) **Message context**: the todo text + anything the user said around it.
b) **User memory**: consult the user profile + memory notes for durable
   facts relevant to this task (location, tools, preferences, active
   projects). Ask: what does the user's real situation imply here?
c) **Past task history**: check the Todo System for related captures
   (GET /api/v1/tasks?q=<keyword>). Reuse known context; avoid duplicates.
d) **Web research (if useful)**: quick search for factual gaps. At most ONE
   link/fact per subtask; never fabricate URLs.

Rule: subtask context must reflect the user's real situation, not generic
advice. If memory has a relevant fact, fold it into the context.

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
