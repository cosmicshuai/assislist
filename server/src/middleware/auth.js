// middleware/auth.js — authentication + actor detection
//
// Two ways in:
//   1. `Authorization: Bearer <token>` — agents, CLI, scripts.
//        TODO_AGENT_TOKEN => actor 'agent'; TODO_API_TOKEN => actor 'user'.
//        When TODO_AGENT_TOKEN is unset, all valid tokens are 'user'.
//   2. A signed session cookie — the web UI, after the operator unlocks it
//        once with the user token. Always actor 'user'.
//
// Token comparison is constant time and both candidates are always evaluated,
// so neither the outcome nor which token matched is observable through timing.
import { config } from '../config.js';
import { SESSION_COOKIE, readCookie, timingSafeEqualString, verifySession } from '../services/sessionService.js';

/** Classify a bearer token. Returns 'agent', 'user', or null. */
export function actorForToken(token) {
  if (!token) return null;
  // Evaluate both comparisons unconditionally — branching on the first result
  // would make the work performed depend on which token was supplied.
  const isAgent = Boolean(config.agentToken) && timingSafeEqualString(token, config.agentToken);
  const isUser = Boolean(config.apiToken) && timingSafeEqualString(token, config.apiToken);
  if (isAgent) return 'agent';
  if (isUser) return 'user';
  return null;
}

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';

  if (token) {
    const actor = actorForToken(token);
    if (actor) {
      req.actor = actor;
      return next();
    }
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (verifySession(readCookie(req, SESSION_COOKIE))) {
    req.actor = 'user';
    return next();
  }

  return res.status(401).json({ error: 'Unauthorized' });
}
