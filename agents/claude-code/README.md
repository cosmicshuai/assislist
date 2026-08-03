# Install AssisList skills — Claude Code

Claude Code loads skills from `~/.claude/skills/<name>/SKILL.md` (personal)
or `.claude/skills/<name>/` inside a project (project-scoped).

## Install (personal)

```bash
cd <assislist-repo>
cp -r agents/capture-to-todos ~/.claude/skills/
cp -r agents/todo-api-reference ~/.claude/skills/
cp -r agents/stale-task-triage ~/.claude/skills/
```

## Env vars

Add to `~/.claude/settings.json` `env` block, your shell profile, or launch
environment:

```bash
export ASSISLIST_URL=http://localhost:3456
export ASSISLIST_API_TOKEN=<user token>       # optional
export ASSISLIST_AGENT_TOKEN=<agent token>    # recommended for captures
```

## Verify

Start `claude` and ask: "do you have the capture-to-todos skill?" Then try:
"capture: plan a birthday party for June".
