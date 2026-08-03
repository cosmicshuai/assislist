# Security — AssisList

## Trust model

AssisList is a **single-user, self-hosted application**. It does not ship
user accounts, SSO, or a login screen. Security relies on the operator:

- Run it on a network you control (home LAN, VPN/tailnet), or put it behind
  a reverse proxy with TLS.
- Treat the web UI token as public to anyone who can reach the page. Anyone
  with network access to the UI port can read and manage your tasks.

## Tokens

| Token | Scope | Where it lives |
|---|---|---|
| `TODO_API_TOKEN` | User/UI — full access | Server env; **embedded in the web bundle** |
| `TODO_AGENT_TOKEN` | Agent — read-mostly, restricted writes (see README) | Server env + your agent's environment |

Rules:

- Generate with `openssl rand -hex 32` (64 hex chars). Never commit `.env`.
- If you expose AssisList beyond a trusted network, put a reverse proxy with
  TLS and (optionally) basic auth in front of it.
- `TODO_AGENT_TOKEN` is optional; unset = single-token (user-only) mode.

## Agent write boundaries

The agent token may: GET anything; POST /captures; add subtasks; and
edit/complete/abandon/delete only tasks it created (source=whatsapp). It may
NOT modify manual tasks, create projects/root tasks, or archive — those
return 403.

## Reporting a vulnerability

Open a private security advisory at
<https://github.com/cosmicshuai/assislist/security/advisories> or email the
maintainer via the GitHub profile. Please do not open a public issue for
unpatched vulnerabilities.
