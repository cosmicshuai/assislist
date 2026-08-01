// components/TaskCard.tsx — task card with source tag, badges, blocked state
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
    <div className={cn(
      'rounded-xl border bg-white shadow-sm transition dark:bg-slate-900/70',
      completed ? 'border-slate-200 opacity-60 dark:border-slate-800' : 'border-slate-200 dark:border-slate-800',
    )}>
      <div className="flex items-start gap-3 p-3">
        {/* Checkbox */}
        <button
          aria-label={completed ? 'Reopen' : 'Complete'}
          onClick={() => onToggle(task)}
          disabled={blocked.length > 0}
          className={cn(
            'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs transition',
            completed
              ? 'border-emerald-500 bg-emerald-500 text-white'
              : blocked.length > 0
                ? 'cursor-not-allowed border-slate-300 bg-slate-100 text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-600'
                : 'border-slate-400 hover:border-emerald-400 dark:border-slate-500 dark:hover:border-emerald-400',
          )}
          title={blocked.length > 0 ? `Blocked by ${blocked[0].title}` : completed ? 'Completed' : 'Complete'}
        >
          {completed ? '✓' : blocked.length > 0 ? '⛔' : ''}
        </button>

        {/* Main content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={cn('text-sm font-medium text-slate-900 dark:text-slate-100', completed && 'line-through text-slate-400 dark:text-slate-500')}>
              {task.title}
            </span>
            {hasChildren && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                aria-label={expanded ? 'Collapse' : 'Expand'}
              >
                {expanded ? '▾' : '▸'} {children.length}
              </button>
            )}
          </div>

          {task.context && !completed && (
            <p className="mt-1 whitespace-pre-wrap text-xs text-slate-500 dark:text-slate-400">{task.context}</p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <SourceTag source={task.source} />
            <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide', priorityColor[task.urgency])}>
              {priorityLabel[task.urgency]}
            </span>
            {task.priority !== task.urgency && (
              <span className="rounded-full border border-slate-300 px-2 py-0.5 text-[10px] text-slate-500 dark:border-slate-700 dark:text-slate-400">
                {priorityLabel[task.priority]} priority
              </span>
            )}
            {task.dueDate && (
              <span className={cn('rounded-full px-2 py-0.5 text-[10px]', task.status === 'active' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500')}>
                {formatDue(task.dueDate)}
              </span>
            )}
            {blocked.length > 0 && (
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-600 dark:text-amber-400">
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
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            title="Add subtask"
          >
            +
          </button>
          <button
            onClick={() => onDelete(task)}
            className="rounded p-1 text-slate-400 hover:bg-red-500/10 hover:text-red-400 dark:text-slate-500"
            title="Delete"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Children */}
      {hasChildren && expanded && (
        <div className="space-y-2 border-t border-slate-200 p-3 pl-8 dark:border-slate-800/60">
          {children.map((c) => (
            <TaskCard key={c.id} task={c} onToggle={onToggle} onDelete={onDelete} onAddSubtask={onAddSubtask} />
          ))}
        </div>
      )}
    </div>
  );
}
