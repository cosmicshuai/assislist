// repositories/PgTaskRepository.js — Postgres implementation (drizzle)
import { and, asc, desc, eq, ilike, inArray, isNull, ne, or, sql } from 'drizzle-orm';
import { db, pool } from '../db/client.js';
import { projects, recommendations, taskDependencies, tasks } from '../db/schema.ts';
import {
  DependencyBlockedError,
  DependencyCycleError,
  TaskNotFoundError,
  TaskRepository,
} from './TaskRepository.js';

const PRIORITY_ORDER = { urgent: 1, high: 2, medium: 3, low: 4 };

function normalize(row) {
  if (!row) return null;
  // Support both drizzle camelCase rows and raw pg snake_case rows
  const r = row;
  return {
    id: r.id,
    projectId: r.projectId ?? r.project_id ?? null,
    title: r.title,
    context: r.context,
    status: r.status,
    priority: r.priority,
    urgency: r.urgency,
    dueDate: r.dueDate ? new Date(r.dueDate) : r.due_date ? new Date(r.due_date) : null,
    parentId: r.parentId ?? r.parent_id ?? null,
    source: r.source,
    completedAt: r.completedAt ? new Date(r.completedAt) : r.completed_at ? new Date(r.completed_at) : null,
    createdAt: r.createdAt ? new Date(r.createdAt) : r.created_at ? new Date(r.created_at) : null,
    updatedAt: r.updatedAt ? new Date(r.updatedAt) : r.updated_at ? new Date(r.updated_at) : null,
  };
}

const date = (d) => (d ? new Date(d) : null);

function normalizeProject(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    context: row.context,
    status: row.status,
    priority: row.priority,
    urgency: row.urgency,
    dueDate: row.dueDate ? new Date(row.dueDate) : row.due_date ? new Date(row.due_date) : null,
    source: row.source,
    completedAt: row.completedAt ? new Date(row.completedAt) : row.completed_at ? new Date(row.completed_at) : null,
    createdAt: row.createdAt ? new Date(row.createdAt) : row.created_at ? new Date(row.created_at) : null,
    updatedAt: row.updatedAt ? new Date(row.updatedAt) : row.updated_at ? new Date(row.updated_at) : null,
  };
}

export class PgTaskRepository extends TaskRepository {
  async create(task) {
    let parent = null;
    if (task.parentId) parent = await this.getById(task.parentId);
    const projectId = task.projectId ?? parent?.projectId ?? null;
    if (parent && parent.projectId !== projectId) {
      throw new Error('Parent task belongs to a different project');
    }
    const [row] = await db.insert(tasks).values({
      projectId,
      title: task.title,
      context: task.context ?? '',
      status: task.status ?? 'active',
      priority: task.priority ?? 'medium',
      urgency: task.urgency ?? 'medium',
      dueDate: date(task.dueDate),
      parentId: task.parentId ?? null,
      source: task.source ?? 'manual',
      completedAt: task.status === 'completed' ? new Date() : null,
    }).returning();
    return normalize(row);
  }

  async getById(id) {
    const [row] = await db.select().from(tasks).where(eq(tasks.id, id));
    if (!row) throw new TaskNotFoundError(id);
    return normalize(row);
  }

  async list(filters = {}) {
    const conds = [];
    if (filters.status) conds.push(eq(tasks.status, filters.status));
    if (filters.priority) conds.push(eq(tasks.priority, filters.priority));
    if (filters.urgency) conds.push(eq(tasks.urgency, filters.urgency));
    if (filters.projectId !== undefined && filters.projectId !== null) {
      conds.push(eq(tasks.projectId, filters.projectId));
    }
    // null means "root tasks only" (parent_id IS NULL); undefined means no
    // filter. Collapsing the two returned the whole tree under the name
    // `root_tasks`.
    if (filters.parentId === null) {
      conds.push(isNull(tasks.parentId));
    } else if (filters.parentId !== undefined) {
      conds.push(eq(tasks.parentId, filters.parentId));
    }
    if (filters.q) {
      conds.push(or(ilike(tasks.title, `%${filters.q}%`), ilike(tasks.context, `%${filters.q}%`)));
    }
    if (filters.due === 'today') {
      conds.push(sql`${tasks.dueDate}::date = CURRENT_DATE`);
    } else if (filters.due === 'overdue') {
      conds.push(sql`${tasks.dueDate} < CURRENT_DATE AND ${tasks.status} = 'active'`);
    } else if (filters.due === 'upcoming') {
      conds.push(sql`${tasks.dueDate} >= CURRENT_DATE AND ${tasks.status} = 'active'`);
    }

    let q = db.select().from(tasks);
    if (conds.length) q = q.where(and(...conds));

    const sortCol = filters.sort || 'created_at';
    const order = filters.order === 'ASC' ? asc : desc;
    if (sortCol === 'priority') {
      q = q.orderBy(sql`CASE priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END`, desc(tasks.createdAt));
    } else if (sortCol === 'due_date') {
      q = q.orderBy(asc(tasks.dueDate), desc(tasks.createdAt));
    } else if (sortCol === 'title') {
      q = q.orderBy(order(tasks.title));
    } else if (sortCol === 'urgency') {
      q = q.orderBy(sql`CASE urgency WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END`, desc(tasks.createdAt));
    } else {
      q = q.orderBy(desc(tasks.createdAt));
    }

    const rows = await q;
    const rowsById = new Map(rows.map((r) => [r.id, r]));
    const tasksWithBlockers = await this.attachBlockers(rows.map((r) => r.id), rowsById);
    return tasksWithBlockers;
  }

  // Efficiently attach blocked_by to a batch of task ids
  async attachBlockers(ids, rowsById) {
    if (ids.length === 0) return [];
    const depRows = await db
      .select({ taskId: taskDependencies.taskId, blocker: tasks })
      .from(taskDependencies)
      .innerJoin(tasks, eq(tasks.id, taskDependencies.dependsOnTaskId))
      .where(inArray(taskDependencies.taskId, ids));
    const map = new Map();
    for (const d of depRows) {
      const list = map.get(d.taskId) || [];
      list.push(normalize(d.blocker));
      map.set(d.taskId, list);
    }
    return ids.map((id) => {
      const t = normalize(rowsById.get(id));
      return { ...t, blocked_by: map.get(id) || [] };
    });
  }

  async update(id, patch) {
    await this.getById(id);
    const values = {};
    if (patch.title !== undefined) values.title = patch.title;
    if (patch.context !== undefined) values.context = patch.context;
    if (patch.priority !== undefined) values.priority = patch.priority;
    if (patch.urgency !== undefined) values.urgency = patch.urgency;
    if (patch.dueDate !== undefined) values.dueDate = date(patch.dueDate);
    if (patch.parentId !== undefined) values.parentId = patch.parentId ?? null;
    if (patch.status !== undefined) {
      values.status = patch.status;
      values.completedAt = patch.status === 'completed' ? new Date() : null;
    }
    values.updatedAt = new Date();
    const [row] = await db.update(tasks).set(values).where(eq(tasks.id, id)).returning();
    return normalize(row);
  }

  async delete(id) {
    const res = await db.delete(tasks).where(eq(tasks.id, id));
    if (res.rowCount === 0) throw new TaskNotFoundError(id);
    return { success: true, id };
  }

  async complete(id) {
    const task = await this.getById(id);
    if (task.status === 'completed') return task;

    // Strict dependency block: any open blocker => reject
    const blockers = await this.getBlockedBy(id);
    const open = blockers.filter((b) => b.status !== 'completed');
    if (open.length > 0) {
      throw new DependencyBlockedError(open[0].title);
    }
    return this.update(id, { status: 'completed' });
  }

  async getChildren(id) {
    const rows = await db.select().from(tasks).where(eq(tasks.parentId, id)).orderBy(asc(tasks.createdAt));
    return rows.map(normalize);
  }

  async getBlockedBy(taskId) {
    const rows = await db
      .select({ t: tasks })
      .from(taskDependencies)
      .innerJoin(tasks, eq(tasks.id, taskDependencies.dependsOnTaskId))
      .where(eq(taskDependencies.taskId, taskId));
    return rows.map((r) => normalize(r.t));
  }

  async getBlocks(taskId) {
    const rows = await db
      .select({ t: tasks })
      .from(taskDependencies)
      .innerJoin(tasks, eq(tasks.id, taskDependencies.taskId))
      .where(eq(taskDependencies.dependsOnTaskId, taskId));
    return rows.map((r) => normalize(r.t));
  }

  async addDependency(taskId, dependsOnTaskId) {
    if (taskId === dependsOnTaskId) throw new DependencyCycleError();
    await this.getById(taskId);
    await this.getById(dependsOnTaskId);
    // Cycle check: would adding taskId->dependsOnTaskId create a loop?
    const wouldCycle = await this.wouldCreateCycle(taskId, dependsOnTaskId);
    if (wouldCycle) throw new DependencyCycleError();
    await db.insert(taskDependencies).values({ taskId, dependsOnTaskId }).onConflictDoNothing();
    return { success: true };
  }

  async removeDependency(taskId, dependsOnTaskId) {
    const res = await db
      .delete(taskDependencies)
      .where(
        and(
          eq(taskDependencies.taskId, taskId),
          eq(taskDependencies.dependsOnTaskId, dependsOnTaskId),
        ),
      );
    return { success: true, removed: res.rowCount > 0 };
  }

  // Would adding taskId -> dependsOnTaskId (taskId depends on dependsOnTaskId)
  // create a cycle? Yes iff dependsOnTaskId already reaches taskId by
  // following existing dependency edges (getBlockedBy walks dependents -> blockers).
  async wouldCreateCycle(taskId, dependsOnTaskId) {
    const visited = new Set();
    const stack = [dependsOnTaskId];
    while (stack.length) {
      const cur = stack.pop();
      if (cur === taskId) return true;
      if (visited.has(cur)) continue;
      visited.add(cur);
      const blockers = await this.getBlockedBy(cur);
      for (const b of blockers) stack.push(b.id);
    }
    return false;
  }

  async findSimilar(title, limit = 3) {
    // simple trigram-ish: normalized title contains significant words
    const words = title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3)
      .slice(0, 4);
    if (words.length === 0) return [];
    const conds = words.map((w) => ilike(tasks.title, `%${w}%`));
    const rows = await db
      .select()
      .from(tasks)
      .where(and(or(...conds), ne(tasks.id, 0)))
      .orderBy(desc(tasks.createdAt))
      .limit(limit);
    return rows.map(normalize);
  }

  // --- Agent-written recommendations ---

  // Replace agent recommendations for a kind with the given picks.
  // Each pick: { task_id?, project_id?, reason? } — one of task_id/project_id.
  async saveAgentRecommendations(kind, picks) {
    await db.delete(recommendations).where(eq(recommendations.kind, kind));
    if (picks.length === 0) return { saved: 0 };
    let rank = 0;
    for (const p of picks) {
      await db.insert(recommendations).values({
        taskId: p.task_id ?? null,
        projectId: p.project_id ?? null,
        kind,
        rank: rank++,
        reason: p.reason || '',
        source: 'agent',
      }).onConflictDoNothing();
    }
    return { saved: picks.length };
  }

  // Load the most recent agent recommendations for both kinds, with joins.
  // top_next entries carry { task, reason }; long_term carry { project, reason }.
  // Skips tasks whose project is archived (FR-013).
  async getAgentRecommendations() {
    const rows = await db
      .select({
        rec: recommendations,
        task: tasks,
        project: projects,
      })
      .from(recommendations)
      .leftJoin(tasks, eq(tasks.id, recommendations.taskId))
      .leftJoin(projects, eq(projects.id, recommendations.projectId))
      .where(eq(recommendations.source, 'agent'))
      .orderBy(desc(recommendations.createdAt));

    // Build archived project id set from all projects
    const allProjects = await db.select().from(projects);
    const archivedProjectIds = new Set(allProjects.filter((p) => p.status === 'archived').map((p) => p.id));

    const out = { top_next: [], long_term: [], fetchedAt: null };
    for (const r of rows) {
      if (!out.fetchedAt) out.fetchedAt = r.rec.createdAt;
      const entry = { reason: r.rec.reason };
      if (r.rec.kind === 'top_next') {
        if (!r.task) continue; // task deleted -> skip
        if (r.task.status !== 'active') continue; // completed/abandoned -> never recommend
        if (archivedProjectIds.has(r.task.projectId)) continue; // FR-013: skip archived project tasks
        entry.task = normalize(r.task);
        out.top_next.push(entry);
      } else {
        if (!r.project) continue; // project deleted -> skip
        if (r.project.status !== 'active') continue; // completed/abandoned -> never recommend
        entry.project = normalizeProject(r.project);
        out.long_term.push(entry);
      }
    }
    out.top_next.sort((a, b) => a.task.id - b.task.id);
    out.long_term.sort((a, b) => a.project.id - b.project.id);
    return out;
  }

  // Mark a task abandoned (status + completedAt null; keeps history)
  async abandon(id) {
    const task = await this.getById(id);
    if (task.status === 'abandoned') return task;
    return this.update(id, { status: 'abandoned' });
  }

  async createTree(parent, children) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const parentRow = await this.insertVia(client, parent);
      const childRows = [];
      // First pass: insert all children, remember index -> row
      const indexToRow = [];
      for (const c of children) {
        const row = await this.insertVia(client, {
          ...c,
          projectId: parentRow.projectId,
          parentId: parentRow.id,
          status: 'active',
          completedAt: null,
        });
        indexToRow.push(row);
        childRows.push(row);
      }
      // Second pass: wire dependencies (children.dependsOn are sibling indices)
      for (let i = 0; i < children.length; i += 1) {
        const deps = children[i].dependsOn || [];
        for (const idx of deps) {
          if (idx < 0 || idx >= indexToRow.length || idx === i) continue;
          await client.query(
            'INSERT INTO task_dependencies (task_id, depends_on_task_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [indexToRow[i].id, indexToRow[idx].id],
          );
        }
      }
      await client.query('COMMIT');
      return { parent: parentRow, children: childRows };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  // Create breakdown items as ROOT tasks of a project (no parent task),
  // wiring sibling dependencies by index. Used by capture when no project_id.
  async createRootTasks(projectId, children) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const rows = [];
      for (const c of children) {
        const row = await this.insertVia(client, {
          ...c,
          projectId,
          parentId: null,
          status: 'active',
          completedAt: null,
        });
        rows.push(row);
      }
      for (let i = 0; i < children.length; i += 1) {
        const deps = children[i].dependsOn || [];
        for (const idx of deps) {
          if (idx < 0 || idx >= rows.length || idx === i) continue;
          await client.query(
            'INSERT INTO task_dependencies (task_id, depends_on_task_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [rows[i].id, rows[idx].id],
          );
        }
      }
      await client.query('COMMIT');
      return rows;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async insertVia(client, data) {
    const cols = ['project_id', 'title', 'context', 'status', 'priority', 'urgency', 'due_date', 'parent_id', 'source'];
    const vals = [
      data.projectId,
      data.title,
      data.context ?? '',
      data.status ?? 'active',
      data.priority ?? 'medium',
      data.urgency ?? 'medium',
      data.dueDate ? new Date(data.dueDate) : null,
      data.parentId ?? null,
      data.source ?? 'manual',
    ];
    const res = await client.query(
      `INSERT INTO tasks (${cols.join(', ')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`,
      vals,
    );
    return normalize(res.rows[0]);
  }
}
