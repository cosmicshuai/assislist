// repositories/PgTaskRepository.js — Postgres implementation (drizzle)
import { and, asc, desc, eq, ilike, inArray, ne, or, sql } from 'drizzle-orm';
import { db, pool } from '../db/client.js';
import { taskDependencies, tasks } from '../db/schema.ts';
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

export class PgTaskRepository extends TaskRepository {
  async create(task) {
    const [row] = await db.insert(tasks).values({
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
    if (filters.parentId !== undefined && filters.parentId !== null) {
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
    return rows.map(normalize);
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

  async insertVia(client, data) {
    const cols = ['title', 'context', 'status', 'priority', 'urgency', 'due_date', 'parent_id', 'source'];
    const vals = [
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
