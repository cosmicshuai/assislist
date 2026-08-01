# 04 — Define the AI breakdown output contract

Type: grilling
Status: resolved
Blocked by: 03

## Question

What does a breakdown run produce, exactly, so the API and UI can rely on it?
- Input: a captured todo (title + optional context) — e.g. "plan Italy trip".
- Output: parent task + N subtasks; each with title, context/description,
  priority/urgency, due date?, dependency links between subtasks.
- What rules govern urgency assignment (due date vs importance)?
- How much context per subtask (1-2 sentences? links? checklists in markdown?)
- Where is this contract enforced: a prompt/skill on the Hermes side, or a
  JSON schema the app validates?
- How does dedupe interact with breakdown (hint only, per spec Q7)?

## Answer

PROPOSED (pending user confirmation — 2026-08-01):

- Input: a captured todo — `{ title, raw_context? }`, e.g. "plan Italy trip"
  (possibly with a voice-note transcription as context).
- Output (JSON): one parent task + 2..8 subtasks. Each item:
  - `title` (short, imperative)
  - `context` (1-3 sentences: why, what to check, useful links found via
    research — markdown allowed)
  - `priority` (low|medium|high|urgent)
  - `due_date?` (ISO date, only when the research suggests a real deadline)
  - `depends_on` (array of sibling indices — e.g. "Book flights" blocks
    "Reserve hotels")
- Urgency rule: urgent = explicit deadline within 48h OR user said urgent;
  high = deadline within a week or multi-step blocker; medium = normal;
  low = nice-to-have.
- Context rule: AI adds at most one link/fact per subtask from web research;
  never fabricates URLs (only from search results it actually saw).
- The contract is enforced twice: Hermes skill prompt defines the shape; the
  app validates the incoming JSON against the schema (400 on violation).
- Dedupe: API returns `similar: [{id, title}]` when a close-title match
  exists; Hermes mentions it in its confirmation reply ("note: similar to
  existing 'Italy trip — flights'"), per spec Q7 (hint, not block).

Awaiting user confirmation before this ticket is resolved.
