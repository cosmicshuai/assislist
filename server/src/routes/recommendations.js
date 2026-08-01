// routes/recommendations.js — agent-style suggestions
import { Router } from 'express';
import { topNext, longTerm } from '../services/recommendationService.js';

const router = Router();

// GET /api/v1/recommendations — { top_next: [...], long_term: [...] }
router.get('/', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 3, 6);
    const [next, term] = await Promise.all([topNext(limit), longTerm(limit)]);
    res.json({ top_next: next, long_term: term });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Internal error' });
  }
});

export default router;
