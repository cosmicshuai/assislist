// routes/auth.js — browser unlock flow (no accounts; one shared user token)
//
// The web UI holds no credential. The operator pastes TODO_API_TOKEN once,
// and the server exchanges it for an httpOnly session cookie that JavaScript
// (and therefore any XSS or compromised dependency) cannot read.
import { Router } from 'express';
import { config } from '../config.js';
import {
  SESSION_COOKIE,
  cookieOptions,
  createSession,
  readCookie,
  timingSafeEqualString,
  verifySession,
} from '../services/sessionService.js';

const router = Router();

// GET /api/v1/auth/session — is this browser unlocked?
router.get('/session', (req, res) => {
  res.json({ authenticated: verifySession(readCookie(req, SESSION_COOKIE)) });
});

// POST /api/v1/auth/login — exchange the user token for a session cookie.
// The agent token is deliberately rejected here: agent scope is for machines
// and must not be upgradeable to a full-access UI session.
router.post('/login', (req, res) => {
  const token = req.body?.token;
  if (typeof token !== 'string' || token.length === 0) {
    return res.status(400).json({ error: 'token is required' });
  }
  if (!config.apiToken || !timingSafeEqualString(token, config.apiToken)) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const session = createSession();
  res.cookie(SESSION_COOKIE, session.value, {
    ...cookieOptions(req),
    maxAge: config.sessionTtlSeconds * 1000,
  });
  res.json({ authenticated: true, expiresAt: new Date(session.expiresAt * 1000).toISOString() });
});

// POST /api/v1/auth/logout — drop the session cookie
router.post('/logout', (req, res) => {
  res.clearCookie(SESSION_COOKIE, cookieOptions(req));
  res.json({ authenticated: false });
});

export default router;
