// routes/recommendations.js — agent-style suggestions (rule engine + optional AI enrichment)
import { Router } from 'express';
import { topNext, longTerm } from '../services/recommendationService.js';
import { enrichReasons } from '../services/aiService.js';

const router = Router();

// GET /api/v1/recommendations?ai=1 — { top_next, long_term, ai }
// Without ?ai=1: rule-engine reasons. With ?ai=1 and DEEPSEEK_API_KEY set:
// DeepSeek rewrites the reasons. Falls back to engine reasons on any failure.
router.get('/', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 3, 6);
    const [next, term] = await Promise.all([topNext(limit), longTerm(limit)]);
    if (req.query.ai === '1') {
      const enriched = await enrichReasons({ topNext: next, longTerm: term });
      res.json(enriched);
    } else {
      res.json({ top_next: next, long_term: term, ai: false });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Internal error' });
  }
});

export default router;
