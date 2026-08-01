// components/TaskCard.tsx — expandable task card
import { useState } from 'react';
import type { Task } from '../api/client';
import { cn, formatDue, priorityColor, priorityLabel } from '../lib/utils';
import { SourceTag } from './SourceTag';

interface Props {
  task: Task;
  children?: Task[];
  onToggle: (t: Task) => void;
  onDelete: (t: Task) => void;
  onAddSubtask: (parent: Task) => void;
}

export function TaskCard({ task, children = [], onToggle, onDelete, onAddSubtask }: Props) {
  const [expanded, setExpanded] = useState(false);
  const blocked = (task.blocked_by || []).filter((b) => b.status !== 'completed');
  const completed = task.status === 'completed';
  const hasChildren = children.length > 0;

  return (
    <div className={cn('rounded-xl border bg-slate-900/70 shadow-sm transition', completed ? 'border-slate-800 opacity-60' : 'border-slate-800')}>
      <div className="flex items-start gap-3 p-3">
        {/* Checkbox */}
        <button
          aria-label={completed ? 'Reopen' : 'Complete'}
          onClick={() => onToggle(task)}
          disabled={blocked.length > 0}
          className={cn(
            'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs transition',
            completed
              ? 'border-emerald-500 bg-emerald-500 text-slate-950'
              : blocked.length > 0
                ? 'cursor-not-allowed border-slate-700 bg-slate-800 text-slate-600'
                : 'border-slate-500 hover:border-emerald-400',
          )}
          title={blocked.length > 0 ? `Blocked by ${blocked[0].title}` : completed ? 'Completed' : 'Complete'}
        >
          {completed ? '✓' : blocked.length > 0 ? '⛔' : ''}
        </button>

        {/* Main content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={cn('text-sm font-medium', completed ? 'line-through text-slate-500' : 'text-slate-100')}>
              {task.title}
            </span>
            {hasChildren && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-slate-500 hover:text-slate-300"
                aria-label={expanded ? 'Collapse' : 'Expand'}
              >
                {expanded ? '▾' : '▸'} {children.length}
              </button>
            )}
          </div>

          {task.context && !completed && (
            <p className="mt-1 whitespace-pre-wrap text-xs text-slate-400">{task.context}</p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <SourceTag source={task.source} />
            <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide', priorityColor[task.urgency])}>
              {priorityLabel[task.urgency]}
            </span>
            {task.priority !== task.urgency && (
              <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] text-slate-400">
                {priorityLabel[task.priority]} priority
              </span>
            )}
            {task.dueDate && (
              <span className={cn('rounded-full px-2 py-0.5 text-[10px]', task.status === 'active' ? 'text-amber-400' : 'text-slate-500')}>
                {formatDue(task.dueDate)}
              </span>
            )}
            {blocked.length > 0 && (
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-400">
                Blocked by {blocked[0].title}
                {blocked.length > 1 ? ` +${blocked.length - 1}` : ''}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 gap-1">
          <button
            onClick={() => onAddSubtask(task)}
            className="rounded p-1 text-slate-500 hover:bg-slate-800 hover:text-slate-300"
            title="Add subtask"
          >
            +
          </button>
          <button
            onClick={() => onDelete(task)}
            className="rounded p-1 text-slate-500 hover:bg-red-500/10 hover:text-red-400"
            title="Delete"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Children */}
      {hasChildren && expanded && (
        <div className="space-y-2 border-t border-slate-800/60 p-3 pl-8">
          {children.map((c) => (
            <TaskCard key={c.id} task={c} onToggle={onToggle} onDelete={onDelete} onAddSubtask={onAddSubtask} />
          ))}
        </div>
      )}
    </div>
  );
}
