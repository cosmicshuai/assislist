// routes/tasks.js — task CRUD
import { Router } from 'express';
import { PgTaskRepository } from '../repositories/PgTaskRepository.js';
import { deriveUrgency } from '../services/urgencyService.js';
import { TaskNotFoundError, DependencyBlockedError } from '../repositories/TaskRepository.js';

const router = Router();
const repo = new PgTaskRepository();

const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const STATUSES = ['active', 'completed'];

function handleError(res, e) {
  if (e instanceof TaskNotFoundError) return res.status(404).json({ error: e.message });
  if (e instanceof DependencyBlockedError) return res.status(400).json({ error: e.message, blockedBy: e.blocker });
  console.error(e);
  return res.status(500).json({ error: 'Internal error' });
}

// GET /api/v1/tasks — list with filters
router.get('/', async (req, res) => {
  try {
    const { status, priority, urgency, due, q, parent_id, sort, order } = req.query;
    const rows = await repo.list({
      status,
      priority,
      urgency,
      due,
      q,
      parentId: parent_id !== undefined ? Number(parent_id) : undefined,
      sort,
      order,
    });
    res.json(rows);
  } catch (e) {
    handleError(res, e);
  }
});

// GET /api/v1/tasks/:id — detail + children + deps
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const task = await repo.getById(id);
    const [children, blockedBy, blocks] = await Promise.all([
      repo.getChildren(id),
      repo.getBlockedBy(id),
      repo.getBlocks(id),
    ]);
    res.json({ ...task, children, blocked_by: blockedBy, blocks });
  } catch (e) {
    handleError(res, e);
  }
});

// POST /api/v1/tasks — create single
router.post('/', async (req, res) => {
  try {
    const { title, context, priority, due_date, parent_id } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ error: 'Title is required' });
    if (priority && !PRIORITIES.includes(priority)) return res.status(400).json({ error: 'Invalid priority' });
    const task = await repo.create({
      title: title.trim(),
      context: context ?? '',
      priority: priority ?? 'medium',
      urgency: deriveUrgency({ priority: priority ?? 'medium', dueDate: due_date }),
      dueDate: due_date || null,
      parentId: parent_id || null,
    });
    res.status(201).json(task);
  } catch (e) {
    handleError(res, e);
  }
});

// PUT /api/v1/tasks/:id — update
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { title, context, priority, due_date, parent_id, status } = req.body;
    const patch = {};
    if (title !== undefined) {
      if (!title.trim()) return res.status(400).json({ error: 'Title cannot be empty' });
      patch.title = title.trim();
    }
    if (context !== undefined) patch.context = context;
    if (priority !== undefined) {
      if (!PRIORITIES.includes(priority)) return res.status(400).json({ error: 'Invalid priority' });
      patch.priority = priority;
    }
    if (due_date !== undefined) patch.dueDate = due_date || null;
    if (parent_id !== undefined) patch.parentId = parent_id || null;
    if (status !== undefined) {
      if (!STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });
      patch.status = status;
    }
    // recompute urgency if priority or due changed
    const current = await repo.getById(id);
    patch.urgency = deriveUrgency({
      priority: patch.priority ?? current.priority,
      dueDate: patch.dueDate !== undefined ? patch.dueDate : current.dueDate,
    });
    const updated = await repo.update(id, patch);
    res.json(updated);
  } catch (e) {
    handleError(res, e);
  }
});

// PATCH /api/v1/tasks/:id/complete — strict dependency check
router.patch('/:id/complete', async (req, res) => {
  try {
    const task = await repo.complete(Number(req.params.id));
    res.json(task);
  } catch (e) {
    handleError(res, e);
  }
});

// DELETE /api/v1/tasks/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await repo.delete(Number(req.params.id));
    res.json(result);
  } catch (e) {
    handleError(res, e);
  }
});

export default router;
