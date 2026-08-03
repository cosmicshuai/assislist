// lib/utils.ts — small helpers
import type { Task } from '../api/client';

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

/**
 * Topologically sort tasks so dependencies come before dependents
 * (Kahn's algorithm, stable — ties keep ascending id order).
 * Uses each task's blocked_by edges (the tasks it depends on).
 * Cycles are tolerated: leftover nodes are appended in id order so nothing
 * disappears from the list.
 */
export function topoSortTasks(tasks: Task[]): Task[] {
  if (tasks.length <= 1) return tasks;
  const byId = new Map<number, Task>(tasks.map((t) => [t.id, t]));
  const inSet = new Set(tasks.map((t) => t.id));
  const indegree = new Map<number, number>();
  const dependents = new Map<number, number[]>(); // blockerId -> dependent task ids

  for (const t of tasks) {
    indegree.set(t.id, 0);
  }
  for (const t of tasks) {
    for (const b of t.blocked_by || []) {
      if (!inSet.has(b.id)) continue;
      indegree.set(t.id, (indegree.get(t.id) || 0) + 1);
      const list = dependents.get(b.id) || [];
      list.push(t.id);
      dependents.set(b.id, list);
    }
  }

  const result: Task[] = [];
  const ready = tasks
    .filter((t) => (indegree.get(t.id) || 0) === 0)
    .sort((a, b) => a.id - b.id);

  while (ready.length > 0) {
    const cur = ready.shift()!;
    result.push(cur);
    for (const depId of dependents.get(cur.id) || []) {
      const next = indegree.get(depId)! - 1;
      indegree.set(depId, next);
      if (next === 0) {
        // Insert in id order to keep the output stable
        const node = byId.get(depId)!;
        const insertAt = ready.findIndex((r) => r.id > node.id);
        if (insertAt === -1) ready.push(node);
        else ready.splice(insertAt, 0, node);
      }
    }
  }

  const remaining = tasks
    .filter((t) => !result.some((r) => r.id === t.id))
    .sort((a, b) => a.id - b.id);
  return result.concat(remaining);
}

export const priorityColor: Record<string, string> = {
  urgent: 'bg-red-500/15 text-red-400 border-red-500/30',
  high: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  medium: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  low: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
};

export const priorityLabel: Record<string, string> = {
  urgent: 'Urgent',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

export function formatDue(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(d);
  due.setHours(0, 0, 0, 0);
  const diffDays = Math.round((due.getTime() - today.getTime()) / 864e5);
  if (diffDays === 0) return 'Due today';
  if (diffDays === 1) return 'Due tomorrow';
  if (diffDays === -1) return 'Due yesterday';
  if (diffDays < 0) return `Overdue ${-diffDays}d`;
  return `Due ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}
