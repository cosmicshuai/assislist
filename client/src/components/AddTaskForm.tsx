// components/AddTaskForm.tsx — quick add task (manual capture)
import { useState } from 'react';
import { api } from '../api/client';

interface Props {
  onCreated: () => void;
  parentId?: number | null;
}

export function AddTaskForm({ onCreated, parentId = null }: Props) {
  const [title, setTitle] = useState('');
  const [context, setContext] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.createTask({
        title: title.trim(),
        context: context.trim(),
        priority,
        parentId,
      });
      setTitle('');
      setContext('');
      setPriority('medium');
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/70 p-3">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Add a task…"
        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-500"
      />
      <input
        value={context}
        onChange={(e) => setContext(e.target.value)}
        placeholder="Context (optional)"
        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-500"
      />
      <div className="flex items-center justify-between gap-2">
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as typeof priority)}
          className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-200 outline-none focus:border-cyan-500"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
        <button
          type="submit"
          disabled={submitting || !title.trim()}
          className="rounded-lg bg-cyan-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-cyan-500 disabled:opacity-40"
        >
          {submitting ? 'Adding…' : 'Add'}
        </button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </form>
  );
}
