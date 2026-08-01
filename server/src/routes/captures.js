// routes/captures.js — WhatsApp/AI capture endpoint
import { Router } from 'express';
import { capture, CaptureValidationError } from '../services/captureService.js';

const router = Router();

// POST /api/v1/captures — create a task tree from an AI breakdown
router.post('/', async (req, res) => {
  try {
    const result = await capture(req.body);
    res.status(201).json(result);
  } catch (e) {
    if (e instanceof CaptureValidationError) {
      return res.status(e.status).json({ error: e.message });
    }
    console.error(e);
    return res.status(500).json({ error: 'Internal error' });
  }
});

export default router;
