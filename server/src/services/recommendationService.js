// services/recommendationService.js — agent-style suggestions from the task store
import { PgTaskRepository } from '../repositories/PgTaskRepository.js';

const repo = new PgTaskRepository();

const URGENCY_ORDER = { urgent: 0, high: 1, medium: 2, low: 3 };
const PRIORITY_ORDER = { urgent: 0, high: 1, medium: 2, low: 3 };

/**
 * Top things from agents — "do next":
 * Ready (unblocked) active tasks, ranked by urgency, then due soonest, then priority.
 */
export async function topNext(limit = 3) {
  const tasks = await repo.list({});
  const active = tasks.filter((t) => t.status === 'active');

  // blocked = has at least one open blocker
  const openBlockers = new Map();
  for (const t of tasks) {
    const blockers = t.blocked_by || [];
    const open = blockers.filter((b) => b.status !== 'completed').length;
    if (open > 0) openBlockers.set(t.id, open);
  }

  const ready = active.filter((t) => !openBlockers.has(t.id));
  // Prefer leaf tasks (no children) so we suggest concrete actions, not containers
  const childIds = new Set(active.filter((t) => t.parentId).map((t) => t.parentId));

  const scored = ready.map((t) => ({
    task: t,
    score:
      URGENCY_ORDER[t.urgency] * 1000 +
      (childIds.has(t.id) ? 100 : 0) +
      (t.dueDate ? Math.min(new Date(t.dueDate).getTime() - Date.now(), 0) / 864e5 : 0),
    reason: buildNextReason(t, openBlockers, childIds),
  }));

  scored.sort((a, b) => a.score - b.score || PRIORITY_ORDER[a.task.priority] - PRIORITY_ORDER[b.task.priority]);
  return scored.slice(0, limit).map((s) => ({ task: s.task, reason: s.reason }));
}

/**
 * Things in mind — "long term impact":
 * Open projects (parents) that are most consequential: highest priority,
 * most open subtasks, longest-running.
 */
export async function longTerm(limit = 3) {
  const tasks = await repo.list({});
  const active = tasks.filter((t) => t.status === 'active');
  const byId = new Map(tasks.map((t) => [t.id, t]));

  const projects = active.filter((t) => !t.parentId || !byId.has(t.parentId));
  const openChildren = new Map();
  active.forEach((t) => {
    if (t.parentId) openChildren.set(t.parentId, (openChildren.get(t.parentId) || 0) + 1);
  });

  const scored = projects.map((p) => ({
    task: p,
    openCount: openChildren.get(p.id) || 0,
    ageDays: p.createdAt ? Math.max(1, (Date.now() - new Date(p.createdAt).getTime()) / 864e5) : 1,
    score:
      PRIORITY_ORDER[p.priority] * 1000 +
      Math.min((openChildren.get(p.id) || 0), 5) * 100 +
      Math.min(p.createdAt ? (Date.now() - new Date(p.createdAt).getTime()) / 864e5 : 0, 30) / 10,
  }));

  scored.sort((a, b) => a.score - b.score);
  return scored.slice(0, limit).map((s) => ({
    task: s.task,
    reason: buildLongTermReason(s.task, s.openCount, s.ageDays),
  }));
}

function buildNextReason(task, openBlockers, childIds) {
  if (task.dueDate && new Date(task.dueDate) < new Date()) {
    return `Overdue ${task.title.toLowerCase()} — highest priority to close now`;
  }
  if (task.dueDate) return `Due ${new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} — do before it slips`;
  if (childIds.has(task.id)) return `Ready to start — unblocks ${task.title.toLowerCase()}`;
  return `Top ${task.urgency} priority item in your list`;
}

function buildLongTermReason(task, openCount, ageDays) {
  const parts = [];
  if (openCount > 0) parts.push(`${openCount} open sub${openCount === 1 ? '' : 's'}`);
  if (ageDays >= 7) parts.push(`active ${Math.round(ageDays)}d`);
  const prefix = parts.length ? `Ongoing project — ${parts.join(', ')}` : 'Open project';
  return `${prefix}; compounding impact over time`;
}
