# 04 — Define the AI breakdown output contract

Type: grilling
Status: open
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

(recorded on resolution)
