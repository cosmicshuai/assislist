# AssisList Agent Skills

Installable skill packs that teach AI agents how to talk to your AssisList
instance: capture todos as ordered task trees, reference the API, and triage
stale work.

## Skills included

| Skill | What it does |
|---|---|
| `capture-to-todos` | Turn a message/voice note into a context-informed, dependency-ordered task tree (project → parent → children) |
| `todo-api-reference` | Endpoint + permission reference for the AssisList API |
| `stale-task-triage` | Find projects/tasks idle 60+ days and ask the user whether to archive/delete |

## Configuration

All three skills read the instance location and tokens from environment
variables — no hardcoded URLs:

| Variable | Purpose | Required |
|---|---|---|
| `ASSISLIST_URL` | Base URL of your instance, e.g. `http://localhost:3456` or `https://todos.example.com` (no trailing slash) | Yes |
| `ASSISLIST_API_TOKEN` | User-scope token (full access) — same as server `TODO_API_TOKEN` | For user-scope ops |
| `ASSISLIST_AGENT_TOKEN` | Agent-scope token (restricted writes) — same as server `TODO_AGENT_TOKEN` | Recommended |

Set them in your agent's environment (shell profile, systemd unit, or the
framework's env config) before using the skills.

## Install matrix

| Framework | Skill dir (SKILL.md format) | Install |
|---|---|---|
| Hermes | `~/.hermes/skills/<name>/` | `cp -r agents/<name> ~/.hermes/skills/` |
| Claude Code | `~/.claude/skills/<name>/` | `cp -r agents/<name> ~/.claude/skills/` |
| Codex | `~/.codex/skills/<name>/` | `cp -r agents/<name> ~/.codex/skills/` |
| OpenClaw | `~/.openclaw/skills/` | `openclaw skills install agents/<name> --global` |

See the per-framework docs for details:
- [Hermes](hermes/README.md)
- [Claude Code](claude-code/README.md)
- [Codex](codex/README.md)
- [OpenClaw](openclaw/README.md)

## Example

```bash
# Hermes
cp -r agents/capture-to-todos ~/.hermes/skills/
cp -r agents/todo-api-reference ~/.hermes/skills/
cp -r agents/stale-task-triage ~/.hermes/skills/
export ASSISLIST_URL=http://localhost:3456
export ASSISLIST_AGENT_TOKEN=<your agent token>
```

Then ask your agent: "capture: plan Italy trip".

## Local/homelab overrides

If you run AssisList on a LAN-only host (e.g. `http://192.168.1.180:3456`),
just point `ASSISLIST_URL` at that address — the skills are URL-agnostic.
Never commit tokens or instance URLs.
