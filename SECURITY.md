# Security — AssisList

## Trust model

AssisList is a **single-user, self-hosted application**. There are no user
accounts and no SSO: one shared token is the credential for the whole API.

What the app does guarantee:

- The token is **never shipped to the browser**. The web bundle contains no
  credential. You unlock the UI once by entering the token, and the server
  returns an `httpOnly`, `SameSite=Strict` session cookie that JavaScript
  cannot read — so an XSS bug or a compromised npm dependency cannot steal it.
- Sessions are signed with a key derived from `TODO_API_TOKEN`, so **rotating
  the token invalidates every outstanding session** immediately.

What it does not:

- No transport encryption of its own. Run it on a network you control (home
  LAN, VPN/tailnet), or behind a reverse proxy that terminates TLS.
- Anyone holding the token has full access, including cascading deletes.

## Tokens

| Token | Scope | Where it lives |
|---|---|---|
| `TODO_API_TOKEN` | User/UI — full access | Server env only. Entered once in the browser to obtain a session cookie. |
| `TODO_AGENT_TOKEN` | Agent — read-mostly, restricted writes (see README) | Server env + your agent's environment |

Rules:

- Generate with `openssl rand -hex 32` (64 hex chars). The server refuses to
  start on a token shorter than 16 characters, and refuses to start if the two
  tokens are equal. Never commit `.env`.
- `TODO_AGENT_TOKEN` is optional; unset = single-token (user-only) mode.
- The agent token **cannot** be exchanged for a UI session — `/auth/login`
  accepts the user token only, so agent scope can never be escalated to full
  access through the browser.

## How the browser authenticates

| Endpoint | Purpose |
|---|---|
| `GET /api/v1/auth/session` | Is this browser unlocked? |
| `POST /api/v1/auth/login` | `{ "token": "…" }` → sets the session cookie |
| `POST /api/v1/auth/logout` | Clears the cookie |

Agents and scripts skip all of this and send
`Authorization: Bearer <token>` as before — that path is unchanged.

The `Secure` cookie flag is set only when the request actually arrived over
HTTPS (directly or via `X-Forwarded-Proto`), so a plain-HTTP LAN deployment
still works while a TLS deployment gets the stronger cookie.

## Deploying behind a reverse proxy

Set `TRUST_PROXY` to the number of proxies in front of the app (usually `1`).
It defaults to `0` — trusting forwarded headers by default would let any client
spoof its source IP.

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
