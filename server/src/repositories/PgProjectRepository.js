// repositories/PgProjectRepository.js — Postgres implementation (drizzle)
import { and, asc, desc, eq, ilike, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { projects, tasks } from '../db/schema.ts';
import { ProjectNotFoundError, ProjectRepository } from './ProjectRepository.js';

function normalize(row) {
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

const date = (d) => (d ? new Date(d) : null);

export class PgProjectRepository extends ProjectRepository {
  async create(project) {
    const [row] = await db.insert(projects).values({
      title: project.title,
      context: project.context ?? '',
      status: project.status ?? 'active',
      priority: project.priority ?? 'medium',
      urgency: project.urgency ?? 'medium',
      dueDate: date(project.dueDate),
      source: project.source ?? 'manual',
      completedAt: project.status === 'completed' ? new Date() : null,
    }).returning();
    return normalize(row);
  }

  async getById(id) {
    const [row] = await db.select().from(projects).where(eq(projects.id, id));
    if (!row) throw new ProjectNotFoundError(id);
    return normalize(row);
  }

  async list(filters = {}) {
    const conds = [];
    if (filters.status) conds.push(eq(projects.status, filters.status));
    if (filters.archived === 'all') {
      // no status filter — include archived too
    } else if (filters.archived === 'true' || filters.archived === true) {
      conds.push(eq(projects.status, 'archived'));
    } else if (filters.archived === 'false' || filters.archived === false) {
      conds.push(sql`${projects.status} <> 'archived'`);
    } else if (!filters.status) {
      // default: exclude archived unless explicitly requested
      conds.push(sql`${projects.status} <> 'archived'`);
    }
    if (filters.q) conds.push(ilike(projects.title, `%${filters.q}%`));

    let q = db.select().from(projects);
    if (conds.length) q = q.where(and(...conds));

    const order = filters.order === 'ASC' ? asc : desc;
    const sortCol = filters.sort || 'created_at';
    if (sortCol === 'priority') {
      q = q.orderBy(sql`CASE priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END`, desc(projects.createdAt));
    } else if (sortCol === 'due_date') {
      q = q.orderBy(asc(projects.dueDate), desc(projects.createdAt));
    } else if (sortCol === 'title') {
      q = q.orderBy(order(projects.title));
    } else if (sortCol === 'urgency') {
      q = q.orderBy(sql`CASE urgency WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END`, desc(projects.createdAt));
    } else {
      q = q.orderBy(desc(projects.createdAt));
    }

    const rows = await q;
    const withCounts = await this.attachCounts(rows.map((r) => r.id));
    const map = new Map(withCounts.map((r) => [r.id, r]));
    return rows.map((r) => ({ ...normalize(r), ...(map.get(r.id) || {}) }));
  }

  // Efficiently attach root_task_count + open_task_count for a batch of ids
  async attachCounts(ids) {
    const base = new Map(ids.map((id) => [id, { id, rootTaskCount: 0, openTaskCount: 0, totalTaskCount: 0 }]));
    if (ids.length === 0) return [...base.values()];
    const rows = await db
      .select({
        projectId: tasks.projectId,
        rootTasks: sql`count(*) FILTER (WHERE ${tasks.parentId} IS NULL)::int`,
        openTasks: sql`count(*) FILTER (WHERE ${tasks.status} <> 'completed')::int`,
        totalTasks: sql`count(*)::int`,
      })
      .from(tasks)
      .where(sql`${tasks.projectId} IN (${sql.join(ids.map((id) => sql`${id}`), sql`, `)})`)
      .groupBy(tasks.projectId);
    for (const r of rows) {
      base.set(r.projectId, {
        id: r.projectId,
        rootTaskCount: r.rootTasks,
        openTaskCount: r.openTasks,
        totalTaskCount: r.totalTasks,
      });
    }
    return [...base.values()];
  }

  async update(id, patch) {
    await this.getById(id);
    const values = {};
    if (patch.title !== undefined) values.title = patch.title;
    if (patch.context !== undefined) values.context = patch.context;
    if (patch.priority !== undefined) values.priority = patch.priority;
    if (patch.urgency !== undefined) values.urgency = patch.urgency;
    if (patch.dueDate !== undefined) values.dueDate = date(patch.dueDate);
    if (patch.status !== undefined) {
      values.status = patch.status;
      values.completedAt = patch.status === 'completed' ? new Date() : null;
    }
    values.updatedAt = new Date();
    const [row] = await db.update(projects).set(values).where(eq(projects.id, id)).returning();
    return normalize(row);
  }

  async delete(id) {
    await this.getById(id);
    const res = await db.delete(projects).where(eq(projects.id, id));
    if (res.rowCount === 0) throw new ProjectNotFoundError(id);
    return { success: true, id };
  }

  async archive(id) {
    return this.update(id, { status: 'archived' });
  }

  async restore(id) {
    return this.update(id, { status: 'active' });
  }
}
