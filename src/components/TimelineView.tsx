import React from 'react';
import type { Task, UserSettings } from '../types';
import { PriorityBadge } from './PriorityBadge';
import { StatusIcon } from './StatusIcon';
import { formatDeadline, checkBreach } from '../utils/date';
import { Clock, AlertCircle } from 'lucide-react';
import { parseISO, format } from 'date-fns';
import { Horseshoe, Menacing, SteelBall, ToBeContinued, Tumbleweed } from './Frontier';

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
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-[#231934]">
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
            <span className="w-2.5 h-2.5 bg-amber-600 dark:bg-amber-400 rounded-sm" />
            <span>Work</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm dust" />
            <span>Buffer</span>
          </div>
        </div>
      </div>

      {/* Visual Gantt Sequence */}
      {/* The race route: each ticket is a stage on one trail */}
      <div className="relative space-y-3 pl-9">
        {activeTasks.length > 0 && (
          <div className="absolute left-[13px] top-4 bottom-4 border-l-2 border-dashed border-slate-400/70 dark:border-zinc-600" aria-hidden="true" />
        )}
        {activeTasks.length === 0 ? (
          <div className="-ml-9 py-16 flex flex-col items-center gap-2 text-xs text-slate-500 dark:text-zinc-500 rounded-xl border border-dashed border-slate-300 dark:border-[#231934] bg-white/70 dark:bg-[#110c1a]/80">
            <Tumbleweed className="text-slate-400 dark:text-zinc-600" />
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
                className={`relative rounded-xl border p-4 transition-all shadow-sm ${
                  isBreached
                    ? 'border-rose-300 bg-rose-50 dark:border-rose-800/70 dark:bg-[#26112a]'
                    : 'bg-white dark:bg-[#120c1a] border-slate-200 dark:border-[#231934]'
                }`}
              >
                {/* Stage marker on the trail */}
                <span className="absolute -left-9 top-4 w-7 h-7 flex items-center justify-center rounded-full bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 shadow-sm" aria-hidden="true">
                  {task.status === 'in_progress' ? (
                    <SteelBall size={22} />
                  ) : (
                    <Horseshoe className={`w-5 h-5 ${isBreached ? 'text-rose-500' : 'text-amber-700 dark:text-amber-400'}`} />
                  )}
                </span>

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
                        <Menacing size={11} className="opacity-70" />
                      </span>
                    )}
                    <span className="text-slate-500 dark:text-zinc-400 text-xs tabular-nums">
                      {taskTotal}h <span className="text-slate-400 dark:text-zinc-500 text-[11px]">({task.estimated_hours}h + {bufferHours}h)</span>
                    </span>
                  </div>
                </div>

                {/* Single Gantt Bar & Dates */}
                <div className="space-y-2">
                  <div className="w-full h-2 bg-slate-100 dark:bg-[#1d142b] flex overflow-hidden rounded-full">
                    <div
                      className="bg-amber-600 dark:bg-amber-400 h-full rounded-l-full"
                      style={{
                        width: `${Math.round((1 / (1 + task.buffer_ratio)) * 100)}%`,
                      }}
                      title={`Work: ${task.estimated_hours}h`}
                    />
                    <div
                      className="dust h-full rounded-r-full"
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
        {activeTasks.length > 0 && (
          <div className="-ml-9 pt-2 flex justify-end">
            <ToBeContinued />
          </div>
        )}
      </div>
    </div>
  );
};
