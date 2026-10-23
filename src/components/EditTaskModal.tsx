import React, { useState, useEffect } from 'react';
import type { Task, TaskPriority, TaskStatus, UpdateTaskInput, UserSettings } from '../types';
import { PriorityBadge } from './PriorityBadge';
import { StatusIcon } from './StatusIcon';
import { X, Check, Calendar, Clock, Trash2 } from 'lucide-react';

interface EditTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onSave: (input: UpdateTaskInput) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  settings: UserSettings;
}

// Convert ISO string to format accepted by datetime-local input (YYYY-MM-DDTHH:mm)
const formatForInput = (isoString?: string | null): string => {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const mins = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${mins}`;
};

export const EditTaskModal: React.FC<EditTaskModalProps> = ({
  isOpen,
  onClose,
  task,
  onSave,
  onDelete,
  settings,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [estimatedHours, setEstimatedHours] = useState(3.0);
  const [bufferRatio, setBufferRatio] = useState(settings.default_buffer_ratio);
  const [dueDate, setDueDate] = useState('');
  const [forceStartToday, setForceStartToday] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setStatus(task.status || 'todo');
      setPriority(task.priority || 'medium');
      setEstimatedHours(task.estimated_hours || 1.0);
      setBufferRatio(
        task.buffer_ratio !== undefined ? task.buffer_ratio : settings.default_buffer_ratio
      );
      setDueDate(formatForInput(task.due_date));
      setForceStartToday(task.force_start_today || false);
    }
  }, [task, settings.default_buffer_ratio]);

  if (!isOpen || !task) return null;

  const statuses: { id: TaskStatus; label: string }[] = [
    { id: 'backlog', label: 'Backlog' },
    { id: 'todo', label: 'To Do' },
    { id: 'in_progress', label: 'In Progress' },
    { id: 'done', label: 'Done' },
    { id: 'canceled', label: 'Canceled' },
  ];

  const priorities: TaskPriority[] = ['urgent', 'high', 'medium', 'low'];
  const presets = [1, 2, 4, 8, 12];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    try {
      await onSave({
        id: task.id,
        title: title.trim(),
        description: description.trim(),
        status,
        priority,
        estimated_hours: Number(estimatedHours) || 1.0,
        buffer_ratio: Number(bufferRatio),
        due_date: dueDate ? new Date(dueDate).toISOString() : '',
        force_start_today: forceStartToday,
      });
      onClose();
    } catch (err) {
      console.error('Failed to update task:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setDeleting(true);
    try {
      await onDelete(task.id);
      onClose();
    } catch (err) {
      console.error('Failed to delete task:', err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 backdrop-blur-sm p-4"
    >
      <div className="bg-white dark:bg-[#120c1a] border border-slate-200 dark:border-[#261a3a] w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-[#221834] shrink-0">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-[#211731] text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-transparent">
                {task.ticket_id}
              </span>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">
                Edit task
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white p-1 rounded-md hover:bg-slate-100 dark:hover:bg-[#201630] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            {/* Title */}
            <div>
              <label className="text-xs text-slate-600 dark:text-zinc-400 block mb-1.5 font-medium">
                Title
              </label>
              <input
                type="text"
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full bg-slate-50 dark:bg-[#191126] border border-slate-200 dark:border-[#2a1e3e] rounded-lg px-3.5 py-2.5 text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-slate-400 dark:focus:border-zinc-500"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-xs text-slate-600 dark:text-zinc-400 block mb-1.5 font-medium">
                Description
              </label>
              <textarea
                placeholder="Add notes, specifications, or links..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full bg-slate-50 dark:bg-[#191126] border border-slate-200 dark:border-[#2a1e3e] rounded-lg px-3.5 py-2 text-xs text-slate-900 dark:text-zinc-200 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-slate-400 dark:focus:border-zinc-500 resize-none"
              />
            </div>

            {/* Status Selection */}
            <div>
              <label className="text-xs text-slate-600 dark:text-zinc-400 block mb-1.5 font-medium">
                Status
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {statuses.map((s) => {
                  const active = status === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setStatus(s.id)}
                      className={`flex items-center gap-2 py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
                        active
                          ? 'border-slate-400 bg-slate-100 dark:border-zinc-400 dark:bg-[#241937] text-slate-900 dark:text-white shadow-sm'
                          : 'border-slate-200 bg-slate-50 hover:border-slate-300 dark:border-[#2a1e3e] dark:bg-[#191126] text-slate-600 dark:text-zinc-400 dark:hover:border-zinc-700'
                      }`}
                    >
                      <StatusIcon status={s.id} className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{s.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Priority Selection */}
            <div>
              <label className="text-xs text-slate-600 dark:text-zinc-400 block mb-1.5 font-medium">
                Priority
              </label>
              <div className="grid grid-cols-4 gap-2">
                {priorities.map((p) => {
                  const active = priority === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`py-2 px-1 rounded-lg border flex justify-center transition-all ${
                        active
                          ? 'border-slate-400 bg-slate-100 dark:border-zinc-500 dark:bg-[#211632] shadow-sm'
                          : 'border-slate-200 bg-slate-50 hover:border-slate-300 dark:border-[#2a1e3e] dark:bg-[#191126] dark:hover:border-zinc-700'
                      }`}
                    >
                      <PriorityBadge priority={p} size="sm" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Estimated Hours & Presets */}
            <div>
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-zinc-400 mb-1.5">
                <span className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-zinc-300">
                  <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-400" />
                  Estimated work
                </span>
                <span className="text-slate-900 dark:text-zinc-100 font-medium tabular-nums">
                  {estimatedHours} hrs
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0.5"
                  max="40"
                  step="0.5"
                  value={estimatedHours}
                  onChange={(e) => setEstimatedHours(parseFloat(e.target.value))}
                  className="w-24 bg-slate-50 dark:bg-[#191126] border border-slate-200 dark:border-[#2a1e3e] rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-zinc-100 tabular-nums focus:outline-none focus:border-slate-400 dark:focus:border-zinc-500"
                />
                <div className="flex items-center gap-1.5 flex-1">
                  {presets.map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setEstimatedHours(h)}
                      className={`px-2.5 py-1 text-xs rounded-lg border transition-all tabular-nums ${
                        estimatedHours === h
                          ? 'bg-slate-900 text-white dark:bg-zinc-200 dark:text-zinc-950 border-slate-900 dark:border-zinc-200 font-medium'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 dark:bg-[#191126] dark:border-[#2a1e3e] dark:text-zinc-400 dark:hover:text-zinc-200'
                      }`}
                    >
                      {h}h
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Buffer Margin */}
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-700 dark:text-zinc-300 font-medium">Safety buffer</span>
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

            {/* Hard Due Date */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <label className="font-medium text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-400" />
                  Due date (optional)
                </label>
                {dueDate && (
                  <button
                    type="button"
                    onClick={() => setDueDate('')}
                    className="text-[11px] text-rose-500 hover:text-rose-600 dark:text-rose-400 transition-colors"
                  >
                    Clear date
                  </button>
                )}
              </div>
              <input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#191126] border border-slate-200 dark:border-[#2a1e3e] rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-slate-400 dark:focus:border-zinc-500 tabular-nums"
              />
            </div>

            {/* Start Today Override (only when Smart Rollover is enabled) */}
            {settings.smart_rollover !== false && (
              <div className="pt-2 border-t border-slate-100 dark:border-[#221834]">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-zinc-300 block">
                      Start today anyway
                    </label>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-500 mt-0.5">
                      Start this task today even if less than 1 hour remains in the workday.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={forceStartToday}
                    onClick={() => setForceStartToday(!forceStartToday)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      forceStartToday ? 'bg-slate-900 dark:bg-zinc-100' : 'bg-slate-200 dark:bg-zinc-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full shadow ring-0 transition duration-200 ease-in-out ${
                        forceStartToday
                          ? 'translate-x-4 bg-white dark:bg-zinc-950'
                          : 'translate-x-0 bg-white dark:bg-zinc-300'
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-100 dark:border-[#221834] flex items-center justify-between shrink-0">
            {onDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-1 text-xs text-rose-500 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 py-1.5 px-2 rounded hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deleting ? 'Deleting...' : 'Delete'}</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !title.trim()}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-black text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 text-xs font-medium rounded-lg shadow-sm transition-all disabled:opacity-40 active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>{saving ? 'Saving...' : 'Save changes'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
