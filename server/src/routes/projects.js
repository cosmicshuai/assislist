// routes/projects.js — project CRUD + archive/restore
import { Router } from 'express';
import { PgProjectRepository } from '../repositories/PgProjectRepository.js';
import { PgTaskRepository } from '../repositories/PgTaskRepository.js';
import { ProjectNotFoundError } from '../repositories/ProjectRepository.js';
import { deriveUrgency } from '../services/urgencyService.js';
import { agentForbidden, agentCanModifyProject, isAgent } from '../middleware/agentGuard.js';
import { BadRequestError, requireId } from '../lib/params.js';

const router = Router();
const repo = new PgProjectRepository();
const taskRepo = new PgTaskRepository();

const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const STATUSES = ['active', 'completed', 'abandoned', 'archived'];

function handleError(res, e) {
  if (e instanceof BadRequestError) return res.status(e.status).json({ error: e.message });
  if (e instanceof ProjectNotFoundError) return res.status(404).json({ error: e.message });
  console.error(e);
  return res.status(500).json({ error: 'Internal error' });
}

// GET /api/v1/projects — list with filters (archived excluded by default)
router.get('/', async (req, res) => {
  try {
    const { status, archived, q, sort, order } = req.query;
    const rows = await repo.list({ status, archived, q, sort, order });
    res.json(rows);
  } catch (e) {
    handleError(res, e);
  }
});

// GET /api/v1/projects/:id — detail + root tasks + counts
router.get('/:id', async (req, res) => {
  try {
    const id = requireId(req.params.id);
    const project = await repo.getById(id);
    const rootTasks = await taskRepo.list({ projectId: id, parentId: null });
    const counts = (await repo.attachCounts([id]))[0] || {};
    res.json({ ...project, ...counts, root_tasks: rootTasks });
  } catch (e) {
    handleError(res, e);
  }
});

// POST /api/v1/projects — create (user only; agent 403)
router.post('/', async (req, res) => {
  try {
    if (isAgent(req)) return agentForbidden(res, 'user projects (create a project via capture)');
    const { title, context, priority, due_date } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ error: 'Title is required' });
    if (priority && !PRIORITIES.includes(priority)) return res.status(400).json({ error: 'Invalid priority' });
    const project = await repo.create({
      title: title.trim(),
      context: context ?? '',
      priority: priority ?? 'medium',
      urgency: deriveUrgency({ priority: priority ?? 'medium', dueDate: due_date }),
      dueDate: due_date || null,
      source: 'manual',
    });
    res.status(201).json(project);
  } catch (e) {
    handleError(res, e);
  }
});

// PATCH /api/v1/projects/:id — update (agent 403)
router.patch('/:id', async (req, res) => {
  try {
    const id = requireId(req.params.id);
    const project = await repo.getById(id);
    if (!agentCanModifyProject(req, project)) return agentForbidden(res, 'projects');
    const { title, context, priority, due_date, status } = req.body;
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
    if (status !== undefined) {
      if (!STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });
      patch.status = status;
    }
    if (patch.priority !== undefined || patch.dueDate !== undefined) {
      patch.urgency = deriveUrgency({
        priority: patch.priority ?? project.priority,
        dueDate: patch.dueDate !== undefined ? patch.dueDate : project.dueDate,
      });
    }
    const updated = await repo.update(id, patch);
    res.json(updated);
  } catch (e) {
    handleError(res, e);
  }
});

// PATCH /api/v1/projects/:id/archive — status -> archived (agent 403)
router.patch('/:id/archive', async (req, res) => {
  try {
    const id = requireId(req.params.id);
    const project = await repo.getById(id);
    if (!agentCanModifyProject(req, project)) return agentForbidden(res, 'projects');
    res.json(await repo.archive(id));
  } catch (e) {
    handleError(res, e);
  }
});

// PATCH /api/v1/projects/:id/restore — status -> active (agent 403)
router.patch('/:id/restore', async (req, res) => {
  try {
    const id = requireId(req.params.id);
    const project = await repo.getById(id);
    if (!agentCanModifyProject(req, project)) return agentForbidden(res, 'projects');
    res.json(await repo.restore(id));
  } catch (e) {
    handleError(res, e);
  }
});

// DELETE /api/v1/projects/:id — hard cascade delete (agent 403)
router.delete('/:id', async (req, res) => {
  try {
    const id = requireId(req.params.id);
    const project = await repo.getById(id);
    if (!agentCanModifyProject(req, project)) return agentForbidden(res, 'projects');
    res.json(await repo.delete(id));
  } catch (e) {
    handleError(res, e);
  }
});

export default router;
