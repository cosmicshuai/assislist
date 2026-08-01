// components/KanbanBoard.tsx — homepage: projects grouped by urgency
import { useMemo } from 'react';
import { type Task } from '../api/client';
import { useTasks } from '../hooks/useTasks';
import { SourceTag } from './SourceTag';
import { AddTaskForm } from './AddTaskForm';
import { cn, formatDue, priorityColor, priorityLabel } from '../lib/utils';

interface Props {
  onOpenProject: (id: number) => void;
}

const COLUMNS: Array<{ key: string; label: string; color: string }> = [
  { key: 'urgent', label: 'Urgent', color: 'border-red-500/40 bg-red-500/5' },
  { key: 'high', label: 'High', color: 'border-orange-500/40 bg-orange-500/5' },
  { key: 'medium', label: 'Medium', color: 'border-blue-500/40 bg-blue-500/5' },
  { key: 'low', label: 'Low', color: 'border-slate-500/40 bg-slate-500/5' },
  { key: 'done', label: 'Done', color: 'border-emerald-500/40 bg-emerald-500/5' },
];

export function KanbanBoard({ onOpenProject }: Props) {
  const { tasks, loading, error, reload } = useTasks({});

  // Build tree and pick parent projects (tasks with no parent)
  const projects = useMemo(() => {
    const byId = new Map<number, Task>();
    tasks.forEach((t) => byId.set(t.id, t));
    const childrenOf = new Map<number, Task[]>();
    tasks.forEach((t) => {
      if (t.parentId && byId.has(t.parentId)) {
        const list = childrenOf.get(t.parentId) || [];
        list.push(t);
        childrenOf.set(t.parentId, list);
      }
    });
    return tasks
      .filter((t) => !t.parentId || !byId.has(t.parentId))
      .map((t) => ({ ...t, children: childrenOf.get(t.id) || [] }));
  }, [tasks]);

  const columns = useMemo(() => {
    const groups: Record<string, Task[]> = { urgent: [], high: [], medium: [], low: [], done: [] };
    projects.forEach((p) => {
      if (p.status === 'completed') groups.done.push(p);
      else groups[p.urgency]?.push(p) || groups.medium.push(p);
    });
    return groups;
  }, [projects]);

  if (error) return <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">{error}</div>;
  if (loading) return <p className="py-8 text-center text-sm text-slate-500">Loading…</p>;

  const totalOpen = projects.filter((p) => p.status !== 'completed').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Projects</h1>
          <p className="text-xs text-slate-500">{totalOpen} open · {projects.length} total</p>
        </div>
      </div>

      <AddTaskForm onCreated={reload} />

      <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-4">
        {COLUMNS.map((col) => {
          const items = columns[col.key] || [];
          return (
            <div
              key={col.key}
              className={cn(
                'flex min-h-[50vh] w-72 shrink-0 snap-start flex-col rounded-2xl border p-2',
                col.color,
              )}
            >
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">{col.label}</span>
                <span className="rounded-full bg-slate-800/80 px-2 py-0.5 text-[10px] text-slate-400">{items.length}</span>
              </div>
              <div className="flex flex-1 flex-col gap-2">
                {items.length === 0 && (
                  <div className="rounded-lg border border-dashed border-slate-700/50 p-4 text-center text-[11px] text-slate-600">
                    Empty
                  </div>
                )}
                {items.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => onOpenProject(p.id)}
                    className="group rounded-xl border border-slate-800 bg-slate-900/80 p-3 text-left shadow-sm transition hover:border-slate-600 hover:bg-slate-800/80"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className={cn('text-sm font-medium text-slate-100', p.status === 'completed' && 'line-through text-slate-500')}>
                        {p.title}
                      </span>
                      <span className="text-xs text-slate-500 opacity-0 transition group-hover:opacity-100">→</span>
                    </div>
                    {p.context && <p className="mt-1 line-clamp-2 text-xs text-slate-400">{p.context}</p>}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <SourceTag source={p.source} />
                      <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase', priorityColor[p.urgency])}>
                        {priorityLabel[p.urgency]}
                      </span>
                      {p.children && p.children.length > 0 && (
                        <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">
                          {p.children.length} sub{p.children.length === 1 ? '' : 's'}
                        </span>
                      )}
                      {p.dueDate && p.status !== 'completed' && (
                        <span className="rounded-full px-1.5 py-0.5 text-[10px] text-amber-400">{formatDue(p.dueDate)}</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
