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

    // Prefer fresh agent picks, but never surface completed/abandoned items
    const agent = await repo.getAgentRecommendations();
    const fresh = agent.fetchedAt && Date.now() - new Date(agent.fetchedAt).getTime() < AGENT_TTL_MS;
    let result;
    if (fresh && agent.top_next.length + agent.long_term.length > 0) {
      // If filtering emptied one section (e.g. all recommended tasks got
      // completed), fall back to the rule engine for that section only.
      const needNext = agent.top_next.length === 0;
      const needTerm = agent.long_term.length === 0;
      const [engineNext, engineTerm] =
        needNext || needTerm
          ? await Promise.all([
              needNext ? topNext(limit) : Promise.resolve([]),
              needTerm ? longTerm(limit) : Promise.resolve([]),
            ])
          : [null, null];
      result = {
        top_next: agent.top_next.length > 0 ? agent.top_next.slice(0, limit) : engineNext,
        long_term: agent.long_term.length > 0 ? agent.long_term.slice(0, limit) : engineTerm,
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
// Body: { top_next: [{task_id, reason}], long_term: [{project_id, reason}] }
router.post('/', async (req, res) => {
  try {
    const { top_next = [], long_term = [] } = req.body || {};
    if (!Array.isArray(top_next) || !Array.isArray(long_term)) {
      return res.status(400).json({ error: 'top_next and long_term must be arrays' });
    }
    const validate = (picks, targetKey) =>
      picks.every((p) => p && Number.isInteger(p[targetKey]) && typeof p.reason === 'string');

    if (!validate(top_next, 'task_id') || !validate(long_term, 'project_id')) {
      return res.status(400).json({ error: 'top_next must be [{task_id:int, reason:string}]; long_term must be [{project_id:int, reason:string}]' });
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
