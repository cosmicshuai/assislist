// routes/recommendations.js — agent-style suggestions (rule engine + agent-written)
import { Router } from 'express';
import { PgTaskRepository } from '../repositories/PgTaskRepository.js';
import { topNext, longTerm } from '../services/recommendationService.js';
import { enrichReasons } from '../services/aiService.js';

const router = Router();
const repo = new PgTaskRepository();

const AGENT_TTL_MS = 7 * 36e5; // agent picks are fresh for 7h

// GET /api/v1/recommendations?ai=1
// - Default: agent-written picks if fresh (<7h), else rule engine.
// - ?ai=1: additionally rewrite reasons via DeepSeek (if key set).
router.get('/', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 3, 6);

    // Prefer fresh agent picks
    const agent = await repo.getAgentRecommendations();
    const fresh = agent.fetchedAt && Date.now() - new Date(agent.fetchedAt).getTime() < AGENT_TTL_MS;
    let result;
    if (fresh && agent.top_next.length + agent.long_term.length > 0) {
      result = {
        top_next: agent.top_next.slice(0, limit),
        long_term: agent.long_term.slice(0, limit),
        ai: true,
        source: 'agent',
        refreshed: agent.fetchedAt,
      };
    } else {
      const [next, term] = await Promise.all([topNext(limit), longTerm(limit)]);
      result = { top_next: next, long_term: term, ai: false, source: 'engine' };
    }

    if (req.query.ai === '1' && result.source === 'engine') {
      const enriched = await enrichReasons({ topNext: result.top_next, longTerm: result.long_term });
      result = { ...enriched, source: 'engine' };
    }

    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Internal error' });
  }
});

// POST /api/v1/recommendations — agent writes its picks (from the 6h cron)
// Body: { top_next: [{task_id, reason}], long_term: [{task_id, reason}] }
router.post('/', async (req, res) => {
  try {
    const { top_next = [], long_term = [] } = req.body || {};
    if (!Array.isArray(top_next) || !Array.isArray(long_term)) {
      return res.status(400).json({ error: 'top_next and long_term must be arrays' });
    }
    const validate = (picks) =>
      picks.every((p) => p && Number.isInteger(p.task_id) && typeof p.reason === 'string');

    if (!validate(top_next) || !validate(long_term)) {
      return res.status(400).json({ error: 'picks must be [{task_id:int, reason:string}]' });
    }

    const savedNext = await repo.saveAgentRecommendations('top_next', top_next);
    const savedTerm = await repo.saveAgentRecommendations('long_term', long_term);
    res.status(201).json({
      saved: savedNext.saved + savedTerm.saved,
      source: 'agent',
      at: new Date().toISOString(),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Internal error' });
  }
});

export default router;
