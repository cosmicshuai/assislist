// routes/dependencies.js — task dependency edges
import { Router } from 'express';
import { PgTaskRepository } from '../repositories/PgTaskRepository.js';
import { TaskNotFoundError, DependencyCycleError } from '../repositories/TaskRepository.js';

const router = Router();
const repo = new PgTaskRepository();

function handleError(res, e) {
  if (e instanceof TaskNotFoundError) return res.status(404).json({ error: e.message });
  if (e instanceof DependencyCycleError) return res.status(400).json({ error: e.message });
  console.error(e);
  return res.status(500).json({ error: 'Internal error' });
}

// POST /api/v1/tasks/:id/dependencies — add depends_on
router.post('/:taskId/dependencies', async (req, res) => {
  try {
    const taskId = Number(req.params.taskId);
    const { depends_on_id } = req.body;
    if (!depends_on_id) return res.status(400).json({ error: 'depends_on_id is required' });
    const result = await repo.addDependency(taskId, Number(depends_on_id));
    res.status(201).json(result);
  } catch (e) {
    handleError(res, e);
  }
});

// DELETE /api/v1/tasks/:taskId/dependencies/:depId
router.delete('/:taskId/dependencies/:depId', async (req, res) => {
  try {
    const result = await repo.removeDependency(Number(req.params.taskId), Number(req.params.depId));
    res.json(result);
  } catch (e) {
    handleError(res, e);
  }
});

export default router;
