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

(recorded on resolution)
