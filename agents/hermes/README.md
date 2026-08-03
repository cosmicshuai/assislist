# Install AssisList skills — Hermes

Hermes loads skills from `~/.hermes/skills/<name>/SKILL.md` (user profile:
default; other profiles under `~/.hermes/profiles/<name>/skills/`).

## Install

```bash
cd <assislist-repo>
cp -r agents/capture-to-todos ~/.hermes/skills/
cp -r agents/todo-api-reference ~/.hermes/skills/
cp -r agents/stale-task-triage ~/.hermes/skills/
```

## Env vars

Set in your shell profile or the Hermes service environment:

```bash
export ASSISLIST_URL=http://localhost:3456
export ASSISLIST_API_TOKEN=<user token>       # optional
export ASSISLIST_AGENT_TOKEN=<agent token>    # recommended for captures
```

## Verify

In a new Hermes session, ask: "list your skills" — the three AssisList skills
should appear. Then try a capture: "capture: buy groceries this weekend".
