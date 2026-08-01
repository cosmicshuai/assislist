// App.tsx — main screen: task tree + quick add + filters
import { useMemo, useRef, useState } from 'react';
import { api, type Task, type TaskFilters } from './api/client';
import { useTasks } from './hooks/useTasks';
import { TaskCard } from './components/TaskCard';
import { AddTaskForm } from './components/AddTaskForm';
import { FilterBar } from './components/FilterBar';
import { SwipeRow } from './components/SwipeRow';

export default function App() {
  const [filters, setFilters] = useState<TaskFilters>({});
  const [showAdd, setShowAdd] = useState(false);
  const { tasks, loading, error, reload } = useTasks(filters);

  // Build tree: top-level tasks with children attached
  const tree = useMemo(() => {
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
    const top = tasks
      .filter((t) => !t.parentId || !byId.has(t.parentId))
      .map((t) => ({ ...t, children: childrenOf.get(t.id) || [] }));
    return top;
  }, [tasks]);

  async function handleToggle(task: Task) {
    try {
      if (task.status === 'completed') {
        await api.updateTask(task.id, { status: 'active' });
      } else {
        await api.completeTask(task.id);
      }
      await reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to update task');
    }
  }

  async function handleDelete(task: Task) {
    if (!confirm(`Delete "${task.title}"?`)) return;
    try {
      await api.deleteTask(task.id);
      await reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete task');
    }
  }

  function handleAddSubtask(parent: Task) {
    setShowAdd(true);
    // Focus the form after render; simplest is to show it and set parent
    document.dispatchEvent(new CustomEvent('todo:subtask', { detail: { parentId: parent.id } }));
  }

  // Pull-to-refresh (touch)
  const touchY = useRef<number | null>(null);
  const [pullHint, setPullHint] = useState(false);
  function onTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    if (window.scrollY === 0) touchY.current = e.touches[0].clientY;
  }
  function onTouchMove(e: React.TouchEvent<HTMLDivElement>) {
    if (touchY.current === null) return;
    const dy = e.touches[0].clientY - touchY.current;
    if (dy > 80) setPullHint(true);
  }
  function onTouchEnd() {
    if (touchY.current !== null && pullHint) reload();
    touchY.current = null;
    setPullHint(false);
  }

  return (
    <div
      className="mx-auto flex min-h-full max-w-xl flex-col gap-4 p-4 pb-24"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-100">Todos</h1>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="rounded-lg bg-cyan-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-cyan-500"
        >
          {showAdd ? 'Close' : '+ Add'}
        </button>
      </header>

      {showAdd && (
        <AddTaskForm
          onCreated={async () => {
            setShowAdd(false);
            await reload();
          }}
        />
      )}

      <FilterBar filters={filters} onChange={setFilters} />

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {pullHint && (
        <p className="py-1 text-center text-xs text-cyan-400">Release to refresh…</p>
      )}

      {loading ? (
        <p className="py-8 text-center text-sm text-slate-500">Loading…</p>
      ) : tree.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center text-sm text-slate-500">
          No tasks yet. Add one, or send a WhatsApp message to the bot.
        </div>
      ) : (
        <div className="space-y-2">
          {tree.map((t) => (
            <SwipeRow
              key={t.id}
              onComplete={() => handleToggle(t)}
              onDelete={() => handleDelete(t)}
              disabled={t.status === 'completed' || (t.blocked_by || []).some((b) => b.status !== 'completed')}
            >
              <TaskCard
                task={t}
                children={t.children}
                onToggle={handleToggle}
                onDelete={handleDelete}
                onAddSubtask={handleAddSubtask}
              />
            </SwipeRow>
          ))}
        </div>
      )}

      {/* Bottom action bar (mobile) */}
      <div className="safe-bottom fixed inset-x-0 bottom-0 border-t border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center justify-around py-2">
          <button
            onClick={() => setShowAdd(true)}
            className="flex flex-col items-center gap-0.5 px-4 text-xs text-cyan-400"
          >
            <span className="text-lg leading-none">＋</span>
            Add
          </button>
          <button
            onClick={() => { setFilters({}); reload(); }}
            className="flex flex-col items-center gap-0.5 px-4 text-xs text-slate-400"
          >
            <span className="text-lg leading-none">⟳</span>
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
