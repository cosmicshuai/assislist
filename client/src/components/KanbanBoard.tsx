// components/KanbanBoard.tsx — homepage: projects grouped by urgency + hover preview
import { useMemo, useState } from 'react';
import { type Task } from '../api/client';
import { useTasks } from '../hooks/useTasks';
import { SourceTag } from './SourceTag';
import { AddTaskForm } from './AddTaskForm';
import { cn, formatDue, priorityColor, priorityLabel } from '../lib/utils';

interface Props {
  onOpenProject: (id: number) => void;
}

const COLUMNS: Array<{ key: string; label: string; color: string; header: string }> = [
  { key: 'urgent', label: 'Urgent', color: 'border-red-500/40 bg-red-500/5', header: 'text-red-400' },
  { key: 'high', label: 'High', color: 'border-orange-500/40 bg-orange-500/5', header: 'text-orange-400' },
  { key: 'medium', label: 'Medium', color: 'border-blue-500/40 bg-blue-500/5', header: 'text-blue-400' },
  { key: 'low', label: 'Low', color: 'border-slate-500/40 bg-slate-500/5', header: 'text-slate-400' },
  { key: 'done', label: 'Done', color: 'border-emerald-500/40 bg-emerald-500/5', header: 'text-emerald-400' },
];

interface PopupState {
  task: Task;
  x: number;
  y: number;
  above: boolean;
}

export function KanbanBoard({ onOpenProject }: Props) {
  const { tasks, loading, error, reload } = useTasks({});
  const [popup, setPopup] = useState<PopupState | null>(null);
  const [showAdd, setShowAdd] = useState(false);

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

  // Hover popup positioning: fixed, above the tile when possible
  function onTileEnter(e: React.MouseEvent, task: Task) {
    const rect = e.currentTarget.getBoundingClientRect();
    const above = rect.top > 260;
    setPopup({
      task,
      x: Math.min(rect.left, window.innerWidth - 300),
      y: above ? rect.top - 12 : rect.bottom + 12,
      above,
    });
  }

  if (error) return <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">{error}</div>;
  if (loading) return <p className="py-8 text-center text-sm text-slate-500">Loading…</p>;

  const totalOpen = projects.filter((p) => p.status !== 'completed').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Projects</h1>
          <p className="text-xs text-slate-500">{totalOpen} open · {projects.length} total</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="rounded-lg bg-cyan-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-cyan-500"
        >
          {showAdd ? 'Close' : '+ New'}
        </button>
      </div>

      {showAdd && <AddTaskForm onCreated={() => { setShowAdd(false); reload(); }} />}

      <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-4">
        {COLUMNS.map((col) => {
          const items = columns[col.key] || [];
          return (
            <div
              key={col.key}
              className={cn(
                'flex min-h-[55vh] w-72 shrink-0 snap-start flex-col rounded-2xl border p-2',
                'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40',
                col.color,
              )}
            >
              <div className="mb-2 flex items-center justify-between px-1">
                <span className={cn('text-xs font-semibold uppercase tracking-wider', col.header)}>{col.label}</span>
                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-400">{items.length}</span>
              </div>
              <div className="flex flex-1 flex-col gap-2">
                {items.length === 0 && (
                  <div className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-[11px] text-slate-400 dark:border-slate-700 dark:text-slate-600">
                    Empty
                  </div>
                )}
                {items.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => onOpenProject(p.id)}
                    onMouseEnter={(e) => onTileEnter(e, p)}
                    onMouseLeave={() => setPopup(null)}
                    className="group rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-400 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/80 dark:hover:border-slate-600 dark:hover:bg-slate-800/80"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className={cn('text-sm font-medium text-slate-900 dark:text-slate-100', p.status === 'completed' && 'line-through text-slate-400 dark:text-slate-500')}>
                        {p.title}
                      </span>
                      <span className="text-xs text-slate-400 opacity-0 transition group-hover:opacity-100">→</span>
                    </div>
                    {p.context && <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{p.context}</p>}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <SourceTag source={p.source} />
                      <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase', priorityColor[p.urgency])}>
                        {priorityLabel[p.urgency]}
                      </span>
                      {p.children && p.children.length > 0 && (
                        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          {p.children.length} sub{p.children.length === 1 ? '' : 's'}
                        </span>
                      )}
                      {p.dueDate && p.status !== 'completed' && (
                        <span className="rounded-full px-1.5 py-0.5 text-[10px] text-amber-600 dark:text-amber-400">{formatDue(p.dueDate)}</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Hover preview popup */}
      {popup && (
        <div
          className="pointer-events-none fixed z-50 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-800"
          style={{
            left: popup.x,
            top: popup.y,
            transform: popup.above ? 'translateY(-100%)' : 'none',
          }}
        >
          <div className="flex items-start justify-between gap-2">
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{popup.task.title}</span>
            <SourceTag source={popup.task.source} />
          </div>
          {popup.task.context ? (
            <p className="mt-2 whitespace-pre-wrap text-xs text-slate-600 dark:text-slate-300">{popup.task.context}</p>
          ) : (
            <p className="mt-2 text-xs italic text-slate-400">No context</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase', priorityColor[popup.task.urgency])}>
              {priorityLabel[popup.task.urgency]} urgency
            </span>
            {popup.task.dueDate && (
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-600 dark:text-amber-400">
                {formatDue(popup.task.dueDate)}
              </span>
            )}
            {popup.task.children && popup.task.children.length > 0 && (
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                {popup.task.children.length} subtasks
              </span>
            )}
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] text-slate-600 dark:bg-slate-700 dark:text-slate-300">
              {popup.task.status}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
