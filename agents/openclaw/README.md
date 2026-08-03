# Install AssisList skills — OpenClaw

OpenClaw loads AgentSkills-compatible skill folders (a directory containing
SKILL.md with YAML frontmatter). Install globally into `~/.openclaw/skills/`
or per-workspace into `skills/`.

## Install (global)

```bash
cd <assislist-repo>
openclaw skills install agents/capture-to-todos --global
openclaw skills install agents/todo-api-reference --global
openclaw skills install agents/stale-task-triage --global
```

The install slug comes from the SKILL.md frontmatter `name` field
(`capture-to-todos`, `todo-api-reference`, `stale-task-triage`).

## Env vars

Set in the OpenClaw agent environment (e.g. the process env or your shell
profile):

```bash
export ASSISLIST_URL=http://localhost:3456
export ASSISLIST_API_TOKEN=<user token>       # optional
export ASSISLIST_AGENT_TOKEN=<agent token>    # recommended for captures
```

## Verify

Ask your OpenClaw agent: "what skills do you have?" The three AssisList
skills should be listed. Then try: "capture: renovate the bathroom".
