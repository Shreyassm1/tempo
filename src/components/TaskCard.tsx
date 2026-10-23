import React from 'react';
import type { Task, UserSettings } from '../types';
import { PriorityBadge } from './PriorityBadge';
import { StatusIcon } from './StatusIcon';
import { formatDeadline, checkBreach } from '../utils/date';
import { Menacing } from './Frontier';
import { Clock, AlertCircle, Trash2, Pencil } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  settings?: UserSettings;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  isDragging?: boolean;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>, task: Task) => void;
  onDragEnd?: (e: React.DragEvent<HTMLDivElement>) => void;
  onTouchStart?: (e: React.TouchEvent<HTMLDivElement>, task: Task) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  settings,
  onEdit,
  onDelete,
  isDragging = false,
  onDragStart,
  onDragEnd,
  onTouchStart,
}) => {
  const isBreached = checkBreach(task.scheduled_deadline, task.due_date);
  const totalHours = (task.estimated_hours * (1 + task.buffer_ratio)).toFixed(1);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart?.(e, task)}
      onDragEnd={(e) => onDragEnd?.(e)}
      onTouchStart={(e) => onTouchStart?.(e, task)}
      onClick={() => onEdit(task)}
      data-task-id={task.id}
      className={`group relative rounded-lg border p-3.5 transition-all shadow-sm cursor-grab active:cursor-grabbing select-none ${
        isDragging
          ? 'opacity-40 scale-[0.98] border-indigo-400 bg-indigo-50/30 dark:border-indigo-500 dark:bg-indigo-950/30'
          : isBreached
          ? 'border-rose-300 bg-rose-50 dark:border-rose-800/70 dark:bg-[#26112a] hover:border-rose-400 shadow-rose-900/10'
          : 'bg-white dark:bg-[#140e1f] border-slate-200 dark:border-[#231934] hover:border-slate-300 dark:hover:border-[#392954]'
      }`}
    >
      {/* Top row: ID, Priority & Actions */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono font-medium text-slate-500 dark:text-zinc-500">
            {task.ticket_id}
          </span>
          {task.parent_ticket_id && (
            <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500" title={`Subtask of ${task.parent_ticket_id}`}>
              ↳ {task.parent_ticket_id}
            </span>
          )}
          <PriorityBadge priority={task.priority} size="sm" />
          {task.force_start_today && settings?.smart_rollover !== false && task.status !== 'done' && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/40">
              Starts today
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(task.id);
            }}
            title="Delete task"
            className="p-1 text-slate-400 hover:text-rose-600 dark:text-zinc-500 dark:hover:text-rose-400 rounded hover:bg-slate-100 dark:hover:bg-[#1f162f] transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Title */}
      <h4 className="text-[13px] font-medium text-slate-900 dark:text-zinc-100 leading-snug mb-1">
        {task.title}
      </h4>

      {/* Description */}
      {task.description && (
        <p className="text-xs text-slate-600 dark:text-zinc-400 line-clamp-2 mb-3 leading-relaxed">
          {task.description}
        </p>
      )}

      {/* Clean meta row: Scheduled deadline & Work total */}
      <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-[#201730] text-xs text-slate-500 dark:text-zinc-400">
        <div className="flex items-center gap-1.5 min-w-0">
          {task.status !== 'done' && task.scheduled_deadline ? (
            <div
              className={`flex items-center gap-1.5 truncate ${
                isBreached
                  ? 'text-rose-600 dark:text-rose-400 font-medium'
                  : 'text-slate-600 dark:text-zinc-400'
              }`}
            >
              {isBreached ? (
                <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              ) : (
                <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 shrink-0" />
              )}
              <span className="truncate">{formatDeadline(task.scheduled_deadline)}</span>
              {isBreached && <Menacing size={11} className="opacity-70" />}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-slate-400 dark:text-zinc-500">
              <StatusIcon status={task.status} className="w-3.5 h-3.5" />
              <span className="capitalize">{task.status.replace('_', ' ')}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <span className="tabular-nums text-slate-500 dark:text-zinc-400 text-[11px]">
            {totalHours}h
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(task);
            }}
            className="flex items-center gap-1 text-[11px] text-slate-700 hover:text-slate-950 dark:text-zinc-300 dark:hover:text-white font-medium px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-[#1e152e] dark:hover:bg-[#291c3e] transition-colors"
            title="Edit ticket"
          >
            <Pencil className="w-3 h-3" />
            <span>Edit</span>
          </button>
        </div>
      </div>
    </div>
  );
};
