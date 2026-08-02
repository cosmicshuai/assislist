// routes/tasks.js — task CRUD (project-scoped)
import { Router } from 'express';
import { PgTaskRepository } from '../repositories/PgTaskRepository.js';
import { PgProjectRepository } from '../repositories/PgProjectRepository.js';
import { deriveUrgency } from '../services/urgencyService.js';
import { TaskNotFoundError, DependencyBlockedError } from '../repositories/TaskRepository.js';
import { ProjectNotFoundError } from '../repositories/ProjectRepository.js';
import { agentForbidden, agentCanModifyTask } from '../middleware/agentGuard.js';

const router = Router();
const repo = new PgTaskRepository();
const projectRepo = new PgProjectRepository();

const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const STATUSES = ['active', 'completed', 'abandoned'];

function handleError(res, e) {
  if (e instanceof TaskNotFoundError) return res.status(404).json({ error: e.message });
  if (e instanceof ProjectNotFoundError) return res.status(404).json({ error: e.message });
  if (e instanceof DependencyBlockedError) return res.status(400).json({ error: e.message, blockedBy: e.blocker });
  if (e instanceof Error && e.message === 'Parent task belongs to a different project') {
    return res.status(400).json({ error: e.message });
  }
  console.error(e);
  return res.status(500).json({ error: 'Internal error' });
}

// GET /api/v1/tasks — list with filters (project_id required filter supported)
router.get('/', async (req, res) => {
  try {
    const { status, priority, urgency, due, q, project_id, parent_id, sort, order } = req.query;
    const rows = await repo.list({
      status,
      priority,
      urgency,
      due,
      q,
      projectId: project_id !== undefined ? Number(project_id) : undefined,
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

// POST /api/v1/tasks — create single (project_id required; agent may add subtasks)
router.post('/', async (req, res) => {
  try {
    const { title, context, priority, due_date, parent_id, project_id } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ error: 'Title is required' });
    if (priority && !PRIORITIES.includes(priority)) return res.status(400).json({ error: 'Invalid priority' });

    // Resolve project: explicit project_id, or inherit from parent
    let projectId = project_id !== undefined && project_id !== null ? Number(project_id) : null;
    if (parent_id !== undefined && parent_id !== null) {
      const parent = await repo.getById(Number(parent_id));
      if (projectId === null) projectId = parent.projectId;
      if (parent.projectId !== projectId) {
        return res.status(400).json({ error: 'Parent task belongs to a different project' });
      }
    }
    if (projectId === null) {
      return res.status(400).json({ error: 'project_id is required for tasks without a parent' });
    }
    // Ensure project exists
    await projectRepo.getById(projectId);

    // Agent scope: may only add a task under a parent (subtask), never a root task
    if (req.actor === 'agent' && (parent_id === undefined || parent_id === null)) {
      return agentForbidden(res, 'user tasks (agent may only add subtasks)');
    }

    const task = await repo.create({
      projectId,
      title: title.trim(),
      context: context ?? '',
      priority: priority ?? 'medium',
      urgency: deriveUrgency({ priority: priority ?? 'medium', dueDate: due_date }),
      dueDate: due_date || null,
      parentId: parent_id || null,
      source: req.actor === 'agent' ? 'whatsapp' : 'manual',
    });
    res.status(201).json(task);
  } catch (e) {
    handleError(res, e);
  }
});

// PUT /api/v1/tasks/:id — update (agent: whatsapp only)
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const current = await repo.getById(id);
    if (!agentCanModifyTask(req, current)) return agentForbidden(res, 'user-created tasks');

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
    if (parent_id !== undefined) {
      const newParentId = parent_id || null;
      if (newParentId) {
        const parent = await repo.getById(newParentId);
        if (parent.projectId !== current.projectId) {
          return res.status(400).json({ error: 'Parent task belongs to a different project' });
        }
      }
      patch.parentId = newParentId;
    }
    if (status !== undefined) {
      if (!STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });
      patch.status = status;
    }
    // recompute urgency if priority or due changed
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

// PATCH /api/v1/tasks/:id/complete — strict dependency check (agent: whatsapp only)
router.patch('/:id/complete', async (req, res) => {
  try {
    const current = await repo.getById(Number(req.params.id));
    if (!agentCanModifyTask(req, current)) return agentForbidden(res, 'user-created tasks');
    const task = await repo.complete(Number(req.params.id));
    res.json(task);
  } catch (e) {
    handleError(res, e);
  }
});

// PATCH /api/v1/tasks/:id/abandon — mark as abandoned (agent: whatsapp only)
router.patch('/:id/abandon', async (req, res) => {
  try {
    const current = await repo.getById(Number(req.params.id));
    if (!agentCanModifyTask(req, current)) return agentForbidden(res, 'user-created tasks');
    const task = await repo.abandon(Number(req.params.id));
    res.json(task);
  } catch (e) {
    handleError(res, e);
  }
});

// DELETE /api/v1/tasks/:id (agent: whatsapp only)
router.delete('/:id', async (req, res) => {
  try {
    const current = await repo.getById(Number(req.params.id));
    if (!agentCanModifyTask(req, current)) return agentForbidden(res, 'user-created tasks');
    const result = await repo.delete(Number(req.params.id));
    res.json(result);
  } catch (e) {
    handleError(res, e);
  }
});

export default router;
