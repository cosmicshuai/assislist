// routes/dependencies.js — task dependency edges
import { Router } from 'express';
import { PgTaskRepository } from '../repositories/PgTaskRepository.js';
import { TaskNotFoundError, DependencyCycleError } from '../repositories/TaskRepository.js';
import { BadRequestError, requireId } from '../lib/params.js';

const router = Router();
const repo = new PgTaskRepository();

function handleError(res, e) {
  if (e instanceof BadRequestError) return res.status(e.status).json({ error: e.message });
  if (e instanceof TaskNotFoundError) return res.status(404).json({ error: e.message });
  if (e instanceof DependencyCycleError) return res.status(400).json({ error: e.message });
  console.error(e);
  return res.status(500).json({ error: 'Internal error' });
}

// POST /api/v1/tasks/:id/dependencies — add depends_on
router.post('/:taskId/dependencies', async (req, res) => {
  try {
    const taskId = requireId(req.params.taskId, 'taskId');
    const { depends_on_id } = req.body ?? {};
    if (depends_on_id === undefined || depends_on_id === null) {
      return res.status(400).json({ error: 'depends_on_id is required' });
    }
    const result = await repo.addDependency(taskId, requireId(depends_on_id, 'depends_on_id'));
    res.status(201).json(result);
  } catch (e) {
    handleError(res, e);
  }
});

// DELETE /api/v1/tasks/:taskId/dependencies/:depId
router.delete('/:taskId/dependencies/:depId', async (req, res) => {
  try {
    const result = await repo.removeDependency(
      requireId(req.params.taskId, 'taskId'),
      requireId(req.params.depId, 'depId'),
    );
    res.json(result);
  } catch (e) {
    handleError(res, e);
  }
});

export default router;
