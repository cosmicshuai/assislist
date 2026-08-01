// middleware/auth.js — Bearer token check
import { requireApiToken } from '../config.js';

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token || token !== requireApiToken()) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}
