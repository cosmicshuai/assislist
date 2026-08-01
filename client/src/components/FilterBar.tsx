// components/FilterBar.tsx — filter controls (status/priority/urgency/due/search)
import type { TaskFilters } from '../api/client';
import { cn } from '../lib/utils';

interface Props {
  filters: TaskFilters;
  onChange: (f: TaskFilters) => void;
}

const chip = (active: boolean) =>
  cn(
    'rounded-full border px-3 py-1 text-xs transition',
    active
      ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-300'
      : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-600',
  );

export function FilterBar({ filters, onChange }: Props) {
  const set = (patch: Partial<TaskFilters>) => onChange({ ...filters, ...patch });
  const toggle = (key: keyof TaskFilters, value: string) => {
    // clicking the same value again clears it
    if (filters[key] === value) {
      const { [key]: _drop, ...rest } = filters;
      onChange(rest);
    } else {
      set({ [key]: value } as Partial<TaskFilters>);
    }
  };

  return (
    <div className="space-y-2">
      <input
        value={filters.q || ''}
        onChange={(e) => set({ q: e.target.value })}
        placeholder="Search tasks…"
        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-500"
      />
      <div className="flex flex-wrap gap-1.5">
        <button className={chip(filters.status === 'active')} onClick={() => toggle('status', 'active')}>Active</button>
        <button className={chip(filters.status === 'completed')} onClick={() => toggle('status', 'completed')}>Done</button>
        <button className={chip(filters.urgency === 'urgent')} onClick={() => toggle('urgency', 'urgent')}>Urgent</button>
        <button className={chip(filters.urgency === 'high')} onClick={() => toggle('urgency', 'high')}>High</button>
        <button className={chip(filters.due === 'overdue')} onClick={() => toggle('due', 'overdue')}>Overdue</button>
        <button className={chip(filters.due === 'today')} onClick={() => toggle('due', 'today')}>Today</button>
        <button className={chip(filters.due === 'upcoming')} onClick={() => toggle('due', 'upcoming')}>Upcoming</button>
        <button className={chip(filters.priority === 'urgent')} onClick={() => toggle('priority', 'urgent')}>P:Urgent</button>
        <button className={chip(filters.priority === 'high')} onClick={() => toggle('priority', 'high')}>P:High</button>
      </div>
      {(filters.status || filters.urgency || filters.due || filters.priority || filters.q) && (
        <button
          onClick={() => onChange({})}
          className="text-xs text-slate-500 underline hover:text-slate-300"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
