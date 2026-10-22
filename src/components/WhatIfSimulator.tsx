import React, { useState, useEffect } from 'react';
import type { Task, TaskPriority, UserSettings, WhatIfRequest, WhatIfResponse } from '../types';
import { api } from '../services/api';
import { PriorityBadge } from './PriorityBadge';
import { formatDeadline } from '../utils/date';
import {
  ArrowLeftRight,
  Clock,
  ArrowRight,
  AlertCircle,
  Sliders,
  Check,
  Plus,
  Info,
} from 'lucide-react';

interface WhatIfSimulatorProps {
  tasks: Task[];
  settings: UserSettings;
  onTaskCreated: () => void;
  prefillTask?: Task | null;
}

export const WhatIfSimulator: React.FC<WhatIfSimulatorProps> = ({
  tasks,
  settings,
  onTaskCreated,
  prefillTask,
}) => {
  const [candidateTitle, setCandidateTitle] = useState(
    prefillTask ? prefillTask.title : 'Prepare product launch checklist'
  );
  const [estimatedHours, setEstimatedHours] = useState<number>(
    prefillTask ? prefillTask.estimated_hours : 5.0
  );
  const [priority, setPriority] = useState<TaskPriority>(
    prefillTask ? prefillTask.priority : 'urgent'
  );
  const [bufferRatio, setBufferRatio] = useState<number>(
    prefillTask ? prefillTask.buffer_ratio : settings.default_buffer_ratio
  );
  const [existingTaskId, setExistingTaskId] = useState<string | undefined>(
    prefillTask ? prefillTask.id : undefined
  );

  const [simulation, setSimulation] = useState<WhatIfResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [committing, setCommitting] = useState<boolean>(false);
  const [committedSuccess, setCommittedSuccess] = useState<boolean>(false);

  useEffect(() => {
    const runSimulation = async () => {
      setLoading(true);
      try {
        const req: WhatIfRequest = {
          candidate_title: candidateTitle,
          candidate_estimated_hours: Number(estimatedHours) || 1.0,
          candidate_priority: priority,
          candidate_buffer_ratio: bufferRatio,
          existing_task_id: existingTaskId,
        };
        const res = await api.simulateImpact(req);
        setSimulation(res);
      } catch (e) {
        console.error('Simulation failed:', e);
      } finally {
        setLoading(false);
      }
    };
    runSimulation();
  }, [candidateTitle, estimatedHours, priority, bufferRatio, existingTaskId]);

  const handleApplyToSchedule = async () => {
    if (!candidateTitle.trim()) return;
    setCommitting(true);
    try {
      if (existingTaskId) {
        await api.updateTask({
          id: existingTaskId,
          priority,
          estimated_hours: estimatedHours,
          buffer_ratio: bufferRatio,
        });
      } else {
        await api.createTask({
          title: candidateTitle,
          description: `Created via Simulator with priority [${priority}]`,
          priority,
          estimated_hours: estimatedHours,
          buffer_ratio: bufferRatio,
          status: 'todo',
        });
      }
      setCommittedSuccess(true);
      setTimeout(() => {
        setCommittedSuccess(false);
        onTaskCreated();
      }, 1000);
    } catch (e) {
      console.error('Failed to commit task:', e);
    } finally {
      setCommitting(false);
    }
  };

  const priorityTiers: { value: TaskPriority; label: string; desc: string }[] = [
    { value: 'urgent', label: 'Urgent', desc: 'Placed first in schedule' },
    { value: 'high', label: 'High', desc: 'Before standard tasks' },
    { value: 'medium', label: 'Medium', desc: 'Standard queue order' },
    { value: 'low', label: 'Low', desc: 'Runs in available gaps' },
  ];

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4">
      {/* Simulator Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-[#0d0f17] p-4 rounded-xl border border-slate-200 dark:border-[#1c202d] shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-slate-100 dark:bg-[#141722] rounded-lg border border-slate-200 dark:border-[#202534] text-slate-700 dark:text-zinc-300">
              <ArrowLeftRight className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">
              Schedule Simulator
            </h2>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#141722] text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-[#202534]">
              {loading ? 'Calculating...' : 'Preview'}
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-zinc-400 max-w-2xl">
            See how adding a task or changing priority shifts deadlines before saving.
          </p>
        </div>

        <button
          onClick={handleApplyToSchedule}
          disabled={committing || committedSuccess}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg transition-all ${
            committedSuccess
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-slate-900 hover:bg-black text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 shadow-sm active:scale-95'
          }`}
        >
          {committedSuccess ? (
            <>
              <Check className="w-4 h-4" />
              <span>Schedule updated</span>
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              <span>{existingTaskId ? 'Apply changes' : 'Add to schedule'}</span>
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Controls (Left) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-[#0d0f17] p-5 rounded-xl border border-slate-200 dark:border-[#1c202d] space-y-4 shadow-sm">
            <h3 className="text-xs font-semibold text-slate-800 dark:text-zinc-200 flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
              <span>Simulation parameters</span>
            </h3>

            {/* Task Source */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-600 dark:text-zinc-400 block font-medium">
                Task source
              </label>
              <select
                value={existingTaskId || 'new'}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'new') {
                    setExistingTaskId(undefined);
                  } else {
                    setExistingTaskId(val);
                    const found = tasks.find((t) => t.id === val);
                    if (found) {
                      setCandidateTitle(found.title);
                      setEstimatedHours(found.estimated_hours);
                      setBufferRatio(found.buffer_ratio);
                      setPriority(found.priority);
                    }
                  }
                }}
                className="w-full bg-slate-50 dark:bg-[#131622] border border-slate-200 dark:border-[#202534] rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-zinc-200 focus:outline-none focus:border-slate-400 dark:focus:border-zinc-500"
              >
                <option value="new">+ Test new task</option>
                {tasks
                  .filter((t) => t.status !== 'done')
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      Modify: {t.ticket_id} - {t.title}
                    </option>
                  ))}
              </select>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-600 dark:text-zinc-400 block font-medium">
                Task title
              </label>
              <input
                type="text"
                value={candidateTitle}
                onChange={(e) => setCandidateTitle(e.target.value)}
                placeholder="e.g. Finalize quarterly report"
                className="w-full bg-slate-50 dark:bg-[#131622] border border-slate-200 dark:border-[#202534] rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-zinc-200 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-slate-400 dark:focus:border-zinc-500"
              />
            </div>

            {/* Priority Tiers */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-600 dark:text-zinc-400 block font-medium">
                Priority level
              </label>
              <div className="grid grid-cols-2 gap-2">
                {priorityTiers.map((tier) => {
                  const active = priority === tier.value;
                  return (
                    <button
                      key={tier.value}
                      onClick={() => setPriority(tier.value)}
                      className={`flex flex-col items-start p-2.5 rounded-lg border text-left transition-all ${
                        active
                          ? 'bg-slate-100 border-slate-400 dark:bg-[#191d2c] dark:border-zinc-500 shadow-sm'
                          : 'bg-slate-50 dark:bg-[#131622] border-slate-200 dark:border-[#202534] hover:border-slate-300 dark:hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <PriorityBadge priority={tier.value} size="sm" />
                      </div>
                      <span className="text-[11px] text-slate-500 dark:text-zinc-500">{tier.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Effort & Buffer */}
            <div className="space-y-4 pt-3 border-t border-slate-100 dark:border-[#1c202d]">
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-600 dark:text-zinc-400 font-medium">Estimated hours</span>
                  <span className="text-slate-900 dark:text-zinc-100 font-medium tabular-nums">{estimatedHours} hrs</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="24"
                  step="0.5"
                  value={estimatedHours}
                  onChange={(e) => setEstimatedHours(parseFloat(e.target.value))}
                  className="w-full accent-slate-800 dark:accent-zinc-200"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-600 dark:text-zinc-400 font-medium">Buffer margin</span>
                  <span className="text-slate-700 dark:text-zinc-300 font-medium tabular-nums">
                    +{Math.round(bufferRatio * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.5"
                  step="0.05"
                  value={bufferRatio}
                  onChange={(e) => setBufferRatio(parseFloat(e.target.value))}
                  className="w-full accent-slate-800 dark:accent-zinc-200"
                />
              </div>
            </div>
          </div>

          {/* Explanation Panel */}
          <div className="bg-white dark:bg-[#0d0f17] p-4 rounded-xl border border-slate-200 dark:border-[#1c202d] text-xs text-slate-600 dark:text-zinc-400 space-y-1.5 shadow-sm">
            <div className="flex items-center gap-1.5 text-slate-800 dark:text-zinc-200 font-medium">
              <Info className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
              <span>How scheduling works</span>
            </div>
            <p className="text-slate-500 dark:text-zinc-500 leading-relaxed text-[11px]">
              Higher priority tasks are scheduled first during working hours. Lower priority tasks shift downstream based on total work time and buffer margins.
            </p>
          </div>
        </div>

        {/* Results (Right) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Telemetry KPI Cards */}
          {simulation && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-white dark:bg-[#0d0f17] p-3.5 rounded-xl border border-slate-200 dark:border-[#1c202d] shadow-sm">
                <div className="text-[11px] text-slate-500 dark:text-zinc-500">Total time</div>
                <div className="text-lg font-semibold text-slate-900 dark:text-zinc-100 mt-0.5 tabular-nums">
                  {simulation.candidate_effective_hours}h
                </div>
                <div className="text-[10px] text-slate-400 dark:text-zinc-500">Work + buffer</div>
              </div>

              <div className="bg-white dark:bg-[#0d0f17] p-3.5 rounded-xl border border-slate-200 dark:border-[#1c202d] shadow-sm">
                <div className="text-[11px] text-slate-500 dark:text-zinc-500">Tasks delayed</div>
                <div
                  className={`text-lg font-semibold mt-0.5 tabular-nums ${
                    simulation.summary.tasks_delayed_count > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {simulation.summary.tasks_delayed_count}
                </div>
                <div className="text-[10px] text-slate-400 dark:text-zinc-500">Pushed back</div>
              </div>

              <div className="bg-white dark:bg-[#0d0f17] p-3.5 rounded-xl border border-slate-200 dark:border-[#1c202d] shadow-sm">
                <div className="text-[11px] text-slate-500 dark:text-zinc-500">Total delay</div>
                <div className="text-lg font-semibold text-slate-900 dark:text-zinc-100 mt-0.5 tabular-nums">
                  +{simulation.summary.total_delay_hours}h
                </div>
                <div className="text-[10px] text-slate-400 dark:text-zinc-500">Queue shift</div>
              </div>

              <div
                className={`p-3.5 rounded-xl border shadow-sm ${
                  simulation.summary.critical_breaches > 0
                    ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50'
                    : 'bg-white dark:bg-[#0d0f17] border-slate-200 dark:border-[#1c202d]'
                }`}
              >
                <div className="text-[11px] text-slate-500 dark:text-zinc-500">Deadlines at risk</div>
                <div
                  className={`text-lg font-semibold mt-0.5 tabular-nums ${
                    simulation.summary.critical_breaches > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {simulation.summary.critical_breaches}
                </div>
                <div className="text-[10px] text-slate-400 dark:text-zinc-500">Due dates breached</div>
              </div>
            </div>
          )}

          {/* Candidate Projected ETA */}
          {simulation && (
            <div className="bg-slate-50 dark:bg-[#10131d] p-4 rounded-xl border border-slate-200 dark:border-[#202638] flex items-center justify-between shadow-sm">
              <div>
                <span className="text-[11px] text-slate-600 dark:text-zinc-400 font-medium">
                  Projected completion
                </span>
                <div className="text-xs font-semibold text-slate-900 dark:text-zinc-100 mt-1 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
                  {formatDeadline(simulation.candidate_scheduled_deadline)}
                </div>
              </div>

              <div className="text-right">
                <span className="text-[11px] text-slate-500 dark:text-zinc-500">Scheduled start</span>
                <div className="text-xs text-slate-700 dark:text-zinc-300 mt-1">
                  {formatDeadline(simulation.candidate_scheduled_start)}
                </div>
              </div>
            </div>
          )}

          {/* Downstream Impact List */}
          <div className="bg-white dark:bg-[#0d0f17] rounded-xl border border-slate-200 dark:border-[#1c202d] overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-[#1c202d] flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                Downstream impact ({simulation?.impacted_tasks.length || 0})
              </h3>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-[#171b26] max-h-[380px] overflow-y-auto">
              {simulation?.impacted_tasks.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 dark:text-zinc-500">
                  No downstream tasks affected.
                </div>
              ) : (
                simulation?.impacted_tasks.map((impact) => {
                  return (
                    <div
                      key={impact.task_id}
                      className={`p-3.5 flex items-center justify-between gap-4 transition-colors ${
                        impact.breaches_hard_due_date
                          ? 'bg-rose-50/70 dark:bg-rose-950/20'
                          : 'hover:bg-slate-50 dark:hover:bg-[#121520]'
                      }`}
                    >
                      <div className="space-y-1 min-w-[180px] flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-medium text-slate-500 dark:text-zinc-400">
                            {impact.ticket_id}
                          </span>
                          <PriorityBadge priority={impact.priority} size="sm" />
                          {impact.breaches_hard_due_date && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 px-2 py-0.2 rounded-full">
                              <AlertCircle className="w-3 h-3" />
                              Deadline missed
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-800 dark:text-zinc-200 truncate">
                          {impact.title}
                        </div>
                      </div>

                      {/* Before / After */}
                      <div className="flex items-center gap-3 text-xs">
                        <div className="text-right">
                          <div className="text-slate-400 dark:text-zinc-500 text-[10px]">Current</div>
                          <div className="text-slate-600 dark:text-zinc-400 text-xs">
                            {formatDeadline(impact.original_deadline)}
                          </div>
                        </div>

                        <ArrowRight
                          className={`w-3.5 h-3.5 ${
                            impact.is_delayed ? 'text-amber-500 dark:text-amber-400' : 'text-slate-400 dark:text-zinc-600'
                          }`}
                        />

                        <div className="text-right">
                          <div
                            className={`text-[10px] font-medium ${
                              impact.breaches_hard_due_date
                                ? 'text-rose-700 dark:text-rose-400'
                                : impact.is_delayed
                                ? 'text-amber-700 dark:text-amber-400'
                                : 'text-emerald-700 dark:text-emerald-400'
                            }`}
                          >
                            {impact.is_delayed ? `+${impact.delay_hours}h delay` : 'No delay'}
                          </div>
                          <div
                            className={`text-xs ${
                              impact.breaches_hard_due_date
                                ? 'text-rose-600 dark:text-rose-300 font-medium'
                                : 'text-slate-700 dark:text-zinc-200'
                            }`}
                          >
                            {formatDeadline(impact.simulated_deadline)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
