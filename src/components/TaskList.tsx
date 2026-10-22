import React, { useState, useRef, useEffect } from 'react';
import type { Task, TaskPriority, TaskStatus } from '../types';
import { PriorityBadge } from './PriorityBadge';
import { StatusIcon } from './StatusIcon';
import { formatDeadline, checkBreach } from '../utils/date';
import { Search, AlertCircle, Trash2, Pencil } from 'lucide-react';

interface TaskListProps {
  tasks: Task[];
  onUpdateStatus: (id: string, newStatus: TaskStatus) => void;
  onUpdatePriority: (id: string, newPriority: TaskPriority) => void;
  onDeleteTask: (id: string) => void;
  onEditTask?: (task: Task) => void;
}

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  onUpdateStatus,
  onUpdatePriority,
  onDeleteTask,
  onEditTask,
}) => {
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)
      ) {
        return;
      }
      if (e.key === '/' || ((e.metaKey || e.ctrlKey) && (e.key === 'f' || e.key === 'F'))) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      t.ticket_id.toLowerCase().includes(search.toLowerCase()) ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(search.toLowerCase()));

    const matchesPriority = priorityFilter === 'all' || t.priority === priorityFilter;
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;

    return matchesSearch && matchesPriority && matchesStatus;
  });

  const statuses: TaskStatus[] = ['backlog', 'todo', 'in_progress', 'done', 'canceled'];
  const priorities: TaskPriority[] = ['urgent', 'high', 'medium', 'low'];

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#0d0f17] p-3 rounded-xl border border-slate-200 dark:border-[#1c202d] shadow-sm">
        <div className="flex items-center gap-2.5 flex-1 min-w-[240px] px-2">
          <Search className="w-4 h-4 text-slate-400 dark:text-zinc-500 shrink-0" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-xs text-slate-900 dark:text-zinc-200 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none"
          />
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-slate-400 dark:text-zinc-500 bg-slate-100 dark:bg-[#1a1e2b] border border-slate-200 dark:border-zinc-800 rounded">
            /
          </kbd>
        </div>

        <div className="flex items-center gap-2">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-100 dark:bg-[#141722] text-xs text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-[#202534] rounded-lg px-3 py-1.5 focus:outline-none focus:border-slate-400 dark:focus:border-zinc-500"
          >
            <option value="all">All statuses</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s.replace('_', ' ')}
              </option>
            ))}
          </select>

          {/* Priority filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-slate-100 dark:bg-[#141722] text-xs text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-[#202534] rounded-lg px-3 py-1.5 focus:outline-none focus:border-slate-400 dark:focus:border-zinc-500"
          >
            <option value="all">All priorities</option>
            {priorities.map((p) => (
              <option key={p} value={p}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-[#1c202d] bg-white dark:bg-[#0d0f17] shadow-sm">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-[#1c202d] bg-slate-50 dark:bg-[#111420] text-slate-600 dark:text-zinc-400 font-medium text-[11px]">
              <th className="py-3 px-4 w-28">Task</th>
              <th className="py-3 px-3 w-36">Status</th>
              <th className="py-3 px-4">Title</th>
              <th className="py-3 px-3 w-28">Priority</th>
              <th className="py-3 px-3 w-24">Hours</th>
              <th className="py-3 px-4 w-44">Scheduled finish</th>
              <th className="py-3 px-4 w-36">Due date</th>
              <th className="py-3 px-3 w-24 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-[#171b26]">
            {filteredTasks.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-16 text-center text-xs text-slate-400 dark:text-zinc-500">
                  No matching tasks found
                </td>
              </tr>
            ) : (
              filteredTasks.map((task) => {
                const isBreached = checkBreach(task.scheduled_deadline, task.due_date);
                return (
                  <tr
                    key={task.id}
                    className={`hover:bg-slate-50 dark:hover:bg-[#131622] transition-colors group ${
                      isBreached ? 'bg-rose-50/60 dark:bg-rose-950/15' : ''
                    }`}
                  >
                    {/* Identifier */}
                    <td className="py-3 px-4 font-mono font-medium text-slate-500 dark:text-zinc-400">
                      {task.ticket_id}
                      {task.parent_ticket_id && (
                        <div className="text-[10px] text-slate-400 dark:text-zinc-500" title={`Subtask of ${task.parent_ticket_id}`}>
                          ↳ {task.parent_ticket_id}
                        </div>
                      )}
                    </td>

                    {/* Status Dropdown */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <StatusIcon status={task.status} className="w-3.5 h-3.5 shrink-0" />
                        <select
                          value={task.status}
                          onChange={(e) => onUpdateStatus(task.id, e.target.value as TaskStatus)}
                          className="bg-transparent text-slate-700 dark:text-zinc-300 text-xs focus:outline-none capitalize cursor-pointer hover:text-slate-900 dark:hover:text-white"
                        >
                          {statuses.map((s) => (
                            <option key={s} value={s} className="bg-white dark:bg-[#111420] text-slate-800 dark:text-zinc-200">
                              {s.replace('_', ' ')}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>

                    {/* Title */}
                    <td
                      onClick={() => onEditTask?.(task)}
                      className={`py-3 px-4 max-w-md ${onEditTask ? 'cursor-pointer' : ''}`}
                    >
                      <div className="font-medium text-slate-900 dark:text-zinc-100 truncate hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                        {task.title}
                      </div>
                      {task.description && (
                        <div className="text-slate-500 dark:text-zinc-500 text-[11px] truncate mt-0.5">
                          {task.description}
                        </div>
                      )}
                    </td>

                    {/* Priority Dropdown */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <PriorityBadge priority={task.priority} size="sm" showLabel={false} />
                        <select
                          value={task.priority}
                          onChange={(e) => onUpdatePriority(task.id, e.target.value as TaskPriority)}
                          className="bg-transparent text-xs focus:outline-none cursor-pointer text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white capitalize"
                        >
                          {priorities.map((p) => (
                            <option key={p} value={p} className="bg-white dark:bg-[#111420] text-slate-800 dark:text-zinc-200">
                              {p.charAt(0).toUpperCase() + p.slice(1)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>

                    {/* Effort & Buffer */}
                    <td className="py-3 px-3">
                      <div className="tabular-nums text-slate-800 dark:text-zinc-300">
                        {task.estimated_hours}h
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-zinc-500 tabular-nums">
                        +{Math.round(task.buffer_ratio * 100)}% buf
                      </div>
                    </td>

                    {/* Realistic Deadline */}
                    <td className="py-3 px-4">
                      {task.status !== 'done' && task.scheduled_deadline ? (
                        <div className="flex items-center gap-1.5">
                          {isBreached && (
                            <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          )}
                          <span
                            className={`text-xs tabular-nums ${
                              isBreached ? 'text-rose-600 dark:text-rose-400 font-medium' : 'text-slate-700 dark:text-zinc-300'
                            }`}
                          >
                            {formatDeadline(task.scheduled_deadline)}
                          </span>
                        </div>
                      ) : task.status === 'done' ? (
                        <span className="text-emerald-600 dark:text-emerald-400 text-xs font-medium">Done</span>
                      ) : (
                        <span className="text-slate-400 dark:text-zinc-600 text-xs">—</span>
                      )}
                    </td>

                    {/* Hard Due Date */}
                    <td className="py-3 px-4 text-slate-500 dark:text-zinc-400 text-xs tabular-nums">
                      {task.due_date ? formatDeadline(task.due_date) : '—'}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                        {onEditTask && (
                          <button
                            onClick={() => onEditTask(task)}
                            title="Edit task"
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-[#1a1e2b] rounded transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => onDeleteTask(task.id)}
                          title="Delete task"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:text-zinc-500 dark:hover:text-rose-400 dark:hover:bg-[#1a1e2b] rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
