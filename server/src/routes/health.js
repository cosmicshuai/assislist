// routes/health.js — liveness and readiness
//
// These are deliberately two endpoints. Liveness answers "is the process
// alive?" and must never depend on the database, or a slow Postgres would
// trigger restart loops. Readiness answers "can this instance serve traffic?"
// and must depend on the database, or an orchestrator will happily route to an
// instance that 500s every request.
import { Router } from 'express';
import { pool } from '../db/client.js';
import { log } from '../middleware/logging.js';

const router = Router();

const READY_TIMEOUT_MS = 2000;

router.get('/health', (req, res) => {
  res.json({ ok: true, service: 'assislist', time: new Date().toISOString() });
});

router.get('/ready', async (req, res) => {
  const client = await Promise.race([
    pool.connect(),
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), READY_TIMEOUT_MS)),
  ]).catch((err) => err);

  if (client instanceof Error) {
    // The driver error text can contain the connection string, password
    // included — log it, never return it.
    log('error', 'readiness check failed', { err: client.message });
    return res.status(503).json({ ok: false, db: 'down' });
  }

  try {
    await client.query('SELECT 1');
    res.json({ ok: true, db: 'up', service: 'assislist', time: new Date().toISOString() });
  } catch (err) {
    log('error', 'readiness query failed', { err: err.message });
    res.status(503).json({ ok: false, db: 'down' });
  } finally {
    client.release();
  }
});

export default router;
