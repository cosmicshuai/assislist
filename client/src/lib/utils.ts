// lib/utils.ts — small helpers
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
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
