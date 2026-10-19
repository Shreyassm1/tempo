import React from 'react';
import type { Task, UserSettings } from '../types';
import { PriorityBadge } from './PriorityBadge';
import { StatusIcon } from './StatusIcon';
import { formatDeadline, checkBreach } from '../utils/date';
import { Clock, AlertCircle } from 'lucide-react';
import { parseISO, format } from 'date-fns';

interface TimelineViewProps {
  tasks: Task[];
  settings: UserSettings;
}

export const TimelineView: React.FC<TimelineViewProps> = ({ tasks, settings }) => {
  const activeTasks = tasks.filter(
    (t) =>
      (t.status === 'in_progress' || t.status === 'todo' || t.status === 'backlog') &&
      t.scheduled_start &&
      t.scheduled_deadline
  );

  const totalWork = activeTasks.reduce((s, t) => s + t.estimated_hours, 0).toFixed(1);
  const totalBuffer = activeTasks.reduce((s, t) => s + t.estimated_hours * t.buffer_ratio, 0).toFixed(1);
  const totalCombined = activeTasks.reduce((s, t) => s + t.estimated_hours * (1 + t.buffer_ratio), 0).toFixed(1);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4">
      {/* Streamlined Timeline Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-[#1c202d]">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500 dark:text-zinc-400" />
            <span>Timeline</span>
            <span className="text-xs text-slate-500 dark:text-zinc-400 font-normal">
              ({activeTasks.length} tasks · {totalWork}h work + {totalBuffer}h buffer)
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-zinc-500 mt-0.5">
            Work hours: {settings.work_start_time} – {settings.work_end_time} · Total scheduled: {totalCombined}h
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-zinc-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-slate-800 dark:bg-zinc-200 rounded-sm" />
            <span>Work</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-slate-400 dark:bg-zinc-600 rounded-sm" />
            <span>Buffer</span>
          </div>
        </div>
      </div>

      {/* Visual Gantt Sequence */}
      <div className="space-y-3">
        {activeTasks.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400 dark:text-zinc-500 rounded-xl border border-dashed border-slate-300 dark:border-[#1c202d]">
            No active tasks scheduled
          </div>
        ) : (
          activeTasks.map((task) => {
            const isBreached = checkBreach(task.scheduled_deadline, task.due_date);
            const bufferHours = (task.estimated_hours * task.buffer_ratio).toFixed(1);
            const taskTotal = (task.estimated_hours * (1 + task.buffer_ratio)).toFixed(1);

            let startDateFormatted = '';
            let deadlineDateFormatted = '';
            try {
              if (task.scheduled_start) {
                startDateFormatted = format(parseISO(task.scheduled_start), 'MMM d, h:mm a');
              }
              if (task.scheduled_deadline) {
                deadlineDateFormatted = format(parseISO(task.scheduled_deadline), 'MMM d, h:mm a');
              }
            } catch {
              // fallback
            }

            return (
              <div
                key={task.id}
                className={`rounded-xl border p-4 transition-all shadow-sm ${
                  isBreached
                    ? 'border-rose-300 bg-rose-50/50 dark:border-rose-900/50 dark:bg-rose-950/10'
                    : 'bg-white dark:bg-[#0e1017] border-slate-200 dark:border-[#1c202d]'
                }`}
              >
                {/* Header Row */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <StatusIcon status={task.status} className="w-3.5 h-3.5 shrink-0" />
                    <span className="font-mono text-xs text-slate-500 dark:text-zinc-500">
                      {task.ticket_id}
                    </span>
                    <h3 className="text-xs font-medium text-slate-900 dark:text-zinc-100 truncate">
                      {task.title}
                    </h3>
                    <PriorityBadge priority={task.priority} size="sm" />
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    {isBreached && (
                      <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 text-xs font-medium">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                        Overdue
                      </span>
                    )}
                    <span className="text-slate-500 dark:text-zinc-400 text-xs tabular-nums">
                      {taskTotal}h <span className="text-slate-400 dark:text-zinc-500 text-[11px]">({task.estimated_hours}h + {bufferHours}h)</span>
                    </span>
                  </div>
                </div>

                {/* Single Gantt Bar & Dates */}
                <div className="space-y-2">
                  <div className="w-full h-2 bg-slate-100 dark:bg-[#171a25] flex overflow-hidden rounded-full">
                    <div
                      className="bg-slate-800 dark:bg-zinc-200 h-full rounded-l-full"
                      style={{
                        width: `${Math.round((1 / (1 + task.buffer_ratio)) * 100)}%`,
                      }}
                      title={`Work: ${task.estimated_hours}h`}
                    />
                    <div
                      className="bg-slate-400 dark:bg-zinc-600 h-full rounded-r-full"
                      style={{
                        width: `${Math.round((task.buffer_ratio / (1 + task.buffer_ratio)) * 100)}%`,
                      }}
                      title={`Buffer: ${bufferHours}h`}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400 font-sans">
                    <span className="flex items-center gap-1 text-slate-500 dark:text-zinc-500">
                      <Clock className="w-3.5 h-3.5" />
                      {startDateFormatted || formatDeadline(task.scheduled_start)}
                    </span>
                    <span className={isBreached ? 'text-rose-600 dark:text-rose-400 font-medium' : 'text-slate-700 dark:text-zinc-300'}>
                      {deadlineDateFormatted || formatDeadline(task.scheduled_deadline)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
