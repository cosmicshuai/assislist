# 03 — Decide how WhatsApp capture invokes the pipeline

Type: grilling
Status: open
Blocked by:

## Question

When the user sends a WhatsApp message (text or voice) to the Hermes bot, how
does the task actually get created and processed?
- Option A: Hermes-side instruction — a skill/AGENTS rule tells the agent to
  call the todo-system API after processing. No app-side webhook.
- Option B: App-side webhook — Hermes posts the raw message to the app, the
  app calls DeepSeek itself to research/breakdown.
- Option C: Hybrid — Hermes does the research/breakdown (it has web search),
  app just stores what Hermes sends via API.
- Where does the "research + breakdown" logic live: agent prompt/skill or
  app code?
- What auth does the API use from Hermes (token in .env)?

## Answer

PROPOSED (pending user confirmation — 2026-08-01):

- **Option C (hybrid, Hermes-side processing)**: Hermes does the research +
  breakdown (it has web search + DeepSeek), then POSTs the structured result
  (parent task + subtasks with context/urgency/dependencies) to the app's API.
- The app stays a dumb store + UI: it validates a JSON schema, persists, and
  returns IDs. No app-side LLM calls in v1.
- Capture flow: WhatsApp message → Hermes (already connected) → optional
  clarifying question if ambiguous → Hermes runs breakdown → POST
  /api/v1/captures → app creates task tree → Hermes replies with a short
  confirmation + link to the web app.
- Auth: a single API token in ~/homelab/.env (TODO_API_TOKEN), sent as
  `Authorization: Bearer <token>`. No user accounts in v1.
- The breakdown behavior itself is defined as a Hermes skill (a "capture to
  todos" skill) so it's versionable and inspectable — not buried in app code.

Awaiting user confirmation before this ticket is resolved.
