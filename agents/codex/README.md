# Install AssisList skills — Codex (OpenAI)

Codex (CLI / VS Code) loads Agent Skills from `~/.codex/skills/<name>/`
(personal) or `.codex/skills/<name>/` (project). Each skill is a directory
with a SKILL.md.

## Install (personal)

```bash
cd <assislist-repo>
cp -r agents/capture-to-todos ~/.codex/skills/
cp -r agents/todo-api-reference ~/.codex/skills/
cp -r agents/stale-task-triage ~/.codex/skills/
```

Alternatively, from inside a Codex session:

```
$skill-installer /path/to/agents/capture-to-todos
```

## Env vars

Set in your shell profile or Codex environment (`~/.codex/config.toml` env):

```bash
export ASSISLIST_URL=http://localhost:3456
export ASSISLIST_API_TOKEN=<user token>       # optional
export ASSISLIST_AGENT_TOKEN=<agent token>    # recommended for captures
```

## Verify

Start Codex and run `/skills` — the three AssisList skills should be listed.
Then try: "capture: book dentist appointment".
