import React, { useState, useEffect } from 'react';
import type { Task, UserSettings } from '../types';
import { formatDeadline, checkBreach } from '../utils/date';
import { Clock, ShieldAlert, ArrowRight, ArrowLeft } from 'lucide-react';

interface TickerStripProps {
  tasks: Task[];
  settings: UserSettings;
  onSelectTask?: (task: Task) => void;
}

export const TickerStrip: React.FC<TickerStripProps> = ({ tasks, settings, onSelectTask }) => {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const [startH, startM] = settings.work_start_time.split(':').map(Number);
  const [endH, endM] = settings.work_end_time.split(':').map(Number);
  const workDays = new Set(settings.work_days.split(',').map(s => Number(s.trim())));

  const curDay = currentTime.getDay() === 0 ? 7 : currentTime.getDay();
  const curMins = currentTime.getHours() * 60 + currentTime.getMinutes();
  const startMins = startH * 60 + startM;
  const endMins = endH * 60 + endM;

  const isWorkDay = workDays.has(curDay);
  const isForwardStreamActive = isWorkDay && curMins >= startMins && curMins < endMins;

  const activeTasks = tasks.filter(t => t.status !== 'done' && t.status !== 'canceled');
  const totalBaseHours = activeTasks.reduce((acc, t) => acc + t.estimated_hours, 0);
  const totalBufferHours = activeTasks.reduce((acc, t) => acc + t.estimated_hours * t.buffer_ratio, 0);

  const formattedTime = currentTime.toLocaleTimeString([], {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <div className="bg-[#0b0d13] border-b border-[#202431] px-4 py-1.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono select-none">
      {/* SATOR / Temporal Briefing Telemetry */}
      <div className="flex items-center gap-3">
        {/* Tactical Chronometer */}
        <div className="flex items-center gap-1.5 text-[11px] text-gray-200 bg-[#12151f] px-2.5 py-0.5 border border-[#232735] tabular-nums">
          <Clock className="w-3 h-3 text-red-500" />
          <span className="text-gray-400">UTC+5:30</span>
          <span className="font-bold text-gray-100">{formattedTime}</span>
        </div>

        {/* Working Hours Stream Status */}
        <div
          className={`flex items-center gap-2 px-2.5 py-0.5 text-[11px] font-medium border ${
            isForwardStreamActive
              ? 'bg-red-950/30 border-red-800/60 text-red-300'
              : 'bg-blue-950/30 border-blue-800/60 text-blue-300'
          }`}
        >
          {isForwardStreamActive ? (
            <>
              <ArrowRight className="w-3 h-3 text-red-500 shrink-0" />
              <span>Working Hours Active</span>
              <span className="text-gray-600">·</span>
              <span className="text-red-400 tabular-nums">Ends at {settings.work_end_time}</span>
            </>
          ) : (
            <>
              <ArrowLeft className="w-3 h-3 text-blue-400 shrink-0" />
              <span>Off-Hours (Queue Paused)</span>
              <span className="text-gray-600">·</span>
              <span className="text-blue-400 tabular-nums">Resumes {settings.work_start_time}</span>
            </>
          )}
        </div>

        {/* Work Load Budget */}
        <div className="hidden lg:flex items-center gap-2 text-[10px] text-gray-400 bg-[#12151f] px-2.5 py-0.5 border border-[#232735]">
          <span className="text-gray-500 uppercase">Workload:</span>
          <span className="text-gray-200 font-bold tabular-nums">{totalBaseHours.toFixed(1)}h work</span>
          <span className="text-gray-600">+</span>
          <span className="text-blue-400 tabular-nums">{totalBufferHours.toFixed(1)}h buffer</span>
        </div>
      </div>

      {/* Up Next Ticker Strip */}
      <div className="flex items-center gap-2 overflow-x-auto py-0.5 max-w-full">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider shrink-0">
          Up Next:
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {activeTasks.slice(0, 6).map((task) => {
            const isCollision = checkBreach(task.scheduled_deadline, task.due_date);
            return (
              <button
                key={task.id}
                onClick={() => onSelectTask && onSelectTask(task)}
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] border transition-colors hover:border-gray-400 ${
                  isCollision
                    ? 'bg-red-950/40 border-red-700 text-red-200'
                    : task.status === 'in_progress'
                    ? 'bg-[#151a26] border-red-900/50 text-red-300'
                    : 'bg-[#10131c] border-[#222634] text-gray-300'
                }`}
              >
                <span className="font-bold text-gray-100">{task.ticket_id}</span>
                <span className="text-gray-400 tabular-nums">
                  {task.status === 'in_progress' ? '►' : '◽'} {task.estimated_hours}h
                </span>
                {task.scheduled_deadline && (
                  <span className="text-gray-400">
                    {formatDeadline(task.scheduled_deadline)}
                  </span>
                )}
                {isCollision && <ShieldAlert className="w-3 h-3 text-red-400" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
