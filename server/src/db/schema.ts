// schema.ts — drizzle schema for Todo System
import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const taskStatus = pgEnum('task_status', ['active', 'completed']);
export const priorityLevel = pgEnum('priority_level', ['low', 'medium', 'high', 'urgent']);
export const taskSource = pgEnum('task_source', ['manual', 'whatsapp']);

export const tasks = pgTable(
  'tasks',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    title: text('title').notNull(),
    context: text('context').notNull().default(''),
    status: taskStatus('status').notNull().default('active'),
    priority: priorityLevel('priority').notNull().default('medium'),
    urgency: priorityLevel('urgency').notNull().default('medium'),
    dueDate: timestamp('due_date', { mode: 'date' }),
    parentId: integer('parent_id').references(() => tasks.id, {
      onDelete: 'cascade',
    }),
    source: taskSource('source').notNull().default('manual'),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_tasks_status').on(t.status),
    index('idx_tasks_priority').on(t.priority),
    index('idx_tasks_urgency').on(t.urgency),
    index('idx_tasks_parent').on(t.parentId),
    index('idx_tasks_due').on(t.dueDate),
  ],
);

export const taskDependencies = pgTable(
  'task_dependencies',
  {
    taskId: integer('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    dependsOnTaskId: integer('depends_on_task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.taskId, t.dependsOnTaskId] }),
    uniqueIndex('uq_task_dependencies').on(t.taskId, t.dependsOnTaskId),
    check('ck_no_self_dependency', sql`task_id <> depends_on_task_id`),
  ],
);

export const recommendationKind = pgEnum('recommendation_kind', ['top_next', 'long_term']);
export const recommendationSource = pgEnum('recommendation_source', ['engine', 'agent']);

export const recommendations = pgTable(
  'recommendations',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    taskId: integer('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    kind: recommendationKind('kind').notNull(),
    rank: integer('rank').notNull().default(0),
    reason: text('reason').notNull().default(''),
    source: recommendationSource('source').notNull().default('engine'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('uq_recommendations_kind_task').on(t.kind, t.taskId),
    index('idx_recommendations_kind_rank').on(t.kind, t.rank),
  ],
);

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
