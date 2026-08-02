// middleware/auth.js — Bearer token check + actor detection
// Actor model: TODO_AGENT_TOKEN => 'agent'; TODO_API_TOKEN => 'user'.
// When TODO_AGENT_TOKEN is unset, all valid tokens are 'user' (backward compat).
import { config, requireApiToken } from '../config.js';

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  if (config.agentToken && token === config.agentToken) {
    req.actor = 'agent';
    return next();
  }
  if (token === requireApiToken()) {
    req.actor = 'user';
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}
