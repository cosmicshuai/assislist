// components/ProjectDetail.tsx — drill-down: a project's children tasks
import { useEffect, useMemo, useState } from 'react';
import { api, type Task } from '../api/client';
import { TaskCard } from './TaskCard';
import { SourceTag } from './SourceTag';
import { AddTaskForm } from './AddTaskForm';
import { cn, priorityColor, priorityLabel } from '../lib/utils';

interface Props {
  projectId: number;
  onBack: () => void;
}

export function ProjectDetail({ projectId, onBack }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const all = await api.listTasks({});
      setTasks(all);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const project = useMemo(() => tasks.find((t) => t.id === projectId), [tasks, projectId]);
  const children = useMemo(
    () => tasks.filter((t) => t.parentId === projectId).sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || '')),
    [tasks, projectId],
  );

  async function handleToggle(task: Task) {
    try {
      if (task.status === 'completed') {
        await api.updateTask(task.id, { status: 'active' });
      } else {
        await api.completeTask(task.id);
      }
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to update task');
    }
  }

  async function handleDelete(task: Task) {
    if (!confirm(`Delete "${task.title}"?`)) return;
    try {
      await api.deleteTask(task.id);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete task');
    }
  }

  if (error) return <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">{error}</div>;
  if (loading) return <p className="py-8 text-center text-sm text-slate-500">Loading…</p>;
  if (!project) return <p className="py-8 text-center text-sm text-slate-500">Project not found.</p>;

  const openCount = children.filter((c) => c.status !== 'completed').length;

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">← Projects</button>

      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/70">
        <div className="flex items-center justify-between gap-2">
          <h1 className={cn('text-lg font-semibold text-slate-900 dark:text-slate-100', project.status === 'completed' && 'line-through text-slate-400 dark:text-slate-500')}>
            {project.title}
          </h1>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="shrink-0 rounded-lg bg-cyan-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-cyan-500"
          >
            {showAdd ? 'Close' : '+ Subtask'}
          </button>
        </div>
        {project.context && <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-400">{project.context}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <SourceTag source={project.source} />
          <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide', priorityColor[project.urgency])}>
            {priorityLabel[project.urgency]}
          </span>
          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            {openCount} of {children.length} open
          </span>
        </div>
      </div>

      {showAdd && <AddTaskForm onCreated={() => { setShowAdd(false); load(); }} parentId={projectId} />}

      {children.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400 dark:border-slate-800 dark:text-slate-500">
          No subtasks yet — add one above, or let the agent break this project down from WhatsApp.
        </div>
      ) : (
        <div className="space-y-2">
          {children.map((c) => (
            <TaskCard
              key={c.id}
              task={c}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onAddSubtask={() => { setShowAdd(true); }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
