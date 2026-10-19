import React, { useState, useRef, useEffect } from 'react';
import type { Task, TaskStatus, UserSettings } from '../types';
import { TaskCard } from './TaskCard';
import { StatusIcon } from './StatusIcon';
import { Plus } from 'lucide-react';

interface TaskBoardProps {
  tasks: Task[];
  settings?: UserSettings;
  onUpdateStatus: (id: string, newStatus: TaskStatus) => void;
  onDeleteTask: (id: string) => void;
  onEditTask: (task: Task) => void;
  onOpenCreateWithStatus: (status: TaskStatus) => void;
}

export const TaskBoard: React.FC<TaskBoardProps> = ({
  tasks,
  settings,
  onUpdateStatus,
  onDeleteTask,
  onEditTask,
  onOpenCreateWithStatus,
}) => {
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null);

  // Touch drag state for mobile/tablets
  const [touchDraggingTask, setTouchDraggingTask] = useState<Task | null>(null);
  const [touchPos, setTouchPos] = useState<{ x: number; y: number } | null>(null);
  const [touchTargetCol, setTouchTargetCol] = useState<TaskStatus | null>(null);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const touchCandidateTask = useRef<Task | null>(null);
  const isTouchDragActive = useRef<boolean>(false);

  const columns: { status: TaskStatus; title: string }[] = [
    { status: 'backlog', title: 'Backlog' },
    { status: 'todo', title: 'To Do' },
    { status: 'in_progress', title: 'In Progress' },
    { status: 'done', title: 'Done' },
  ];

  // Desktop Drag Handlers
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, task: Task) => {
    setDraggedTaskId(task.id);
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverCol(null);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, status: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverCol !== status) {
      setDragOverCol(status);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>, status: TaskStatus) => {
    // Only clear if mouse actually left the column container
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    if (dragOverCol === status) {
      setDragOverCol(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetStatus: TaskStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (taskId) {
      const task = tasks.find((t) => t.id === taskId);
      if (task && task.status !== targetStatus) {
        onUpdateStatus(taskId, targetStatus);
      }
    }
    setDraggedTaskId(null);
    setDragOverCol(null);
  };

  // Mobile / Touch Drag Handlers
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>, task: Task) => {
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    touchCandidateTask.current = task;
    isTouchDragActive.current = false;
  };

  useEffect(() => {
    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStartPos.current) return;
      const touch = e.touches[0];
      const deltaX = Math.abs(touch.clientX - touchStartPos.current.x);
      const deltaY = Math.abs(touch.clientY - touchStartPos.current.y);

      // Trigger touch drag after 15px movement
      if (!isTouchDragActive.current && (deltaX > 15 || deltaY > 15)) {
        isTouchDragActive.current = true;
        if (touchCandidateTask.current) {
          setTouchDraggingTask(touchCandidateTask.current);
        }
      }

      if (isTouchDragActive.current) {
        setTouchPos({ x: touch.clientX, y: touch.clientY });

        // Identify which column the finger is over
        const elemUnderFinger = document.elementFromPoint(touch.clientX, touch.clientY);
        const colElem = elemUnderFinger?.closest('[data-status-column]');
        const colStatus = colElem?.getAttribute('data-status-column') as TaskStatus | null;
        setTouchTargetCol(colStatus);
      }
    };

    const handleTouchEnd = () => {
      if (isTouchDragActive.current && touchDraggingTask && touchTargetCol) {
        if (touchDraggingTask.status !== touchTargetCol) {
          onUpdateStatus(touchDraggingTask.id, touchTargetCol);
        }
      }
      touchStartPos.current = null;
      touchCandidateTask.current = null;
      isTouchDragActive.current = false;
      setTouchDraggingTask(null);
      setTouchPos(null);
      setTouchTargetCol(null);
    };

    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [touchDraggingTask, touchTargetCol, tasks, onUpdateStatus]);

  const activeDraggingId = draggedTaskId || touchDraggingTask?.id;

  return (
    <div className="flex flex-col md:flex-row md:items-start gap-4 p-4 md:p-6 h-full overflow-x-auto max-w-[1600px] mx-auto relative">
      {columns.map((col) => {
        const colTasks = tasks.filter((t) => t.status === col.status);
        const totalEffort = colTasks.reduce((sum, t) => sum + t.estimated_hours, 0);
        const isHovered = dragOverCol === col.status || touchTargetCol === col.status;

        return (
          <div
            key={col.status}
            data-status-column={col.status}
            onDragOver={(e) => handleDragOver(e, col.status)}
            onDragLeave={(e) => handleDragLeave(e, col.status)}
            onDrop={(e) => handleDrop(e, col.status)}
            className={`flex flex-col rounded-xl border w-full md:w-1/4 md:min-w-[270px] md:flex-1 max-h-[calc(100vh-130px)] shadow-sm transition-all duration-150 ${
              isHovered
                ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-400 dark:border-indigo-500/70 ring-2 ring-indigo-500/20 shadow-md'
                : 'bg-slate-100/70 dark:bg-[#0d0f17] border-slate-200/80 dark:border-[#1b1f2c]'
            }`}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200/80 dark:border-[#1b1f2c]">
              <div className="flex items-center gap-2">
                <StatusIcon status={col.status} />
                <h3 className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                  {col.title}
                </h3>
                <span className="text-[11px] font-medium px-2 py-0.2 bg-white dark:bg-[#171b26] text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-transparent rounded-full tabular-nums">
                  {colTasks.length}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {totalEffort > 0 && (
                  <span className="text-[11px] text-slate-500 dark:text-zinc-500 tabular-nums font-mono">
                    {totalEffort.toFixed(1)}h
                  </span>
                )}
                <button
                  onClick={() => onOpenCreateWithStatus(col.status)}
                  className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-[#181c28] rounded-md transition-colors"
                  title={`Add task to ${col.title}`}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Task Cards Container */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-[140px]">
              {colTasks.length === 0 ? (
                <div
                  className={`py-12 text-center text-xs rounded-lg border border-dashed transition-colors ${
                    isHovered
                      ? 'border-indigo-400 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400 font-medium bg-indigo-50/20 dark:bg-indigo-950/10'
                      : 'border-slate-300 dark:border-[#1e2332] text-slate-400 dark:text-zinc-600'
                  }`}
                >
                  {isHovered ? `Drop here for ${col.title}` : 'No tasks'}
                </div>
              ) : (
                colTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    settings={settings}
                    onEdit={onEditTask}
                    onDelete={onDeleteTask}
                    isDragging={activeDraggingId === task.id}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onTouchStart={handleTouchStart}
                  />
                ))
              )}

              {/* Drop Target Indicator when dragging over non-empty column */}
              {isHovered && colTasks.length > 0 && (
                <div className="py-2.5 text-center text-xs text-indigo-600 dark:text-indigo-400 font-medium rounded-lg border-2 border-dashed border-indigo-400 dark:border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20 animate-pulse">
                  Drop to move to {col.title}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Floating Ghost Pill for Touch Dragging */}
      {touchDraggingTask && touchPos && (
        <div
          className="fixed pointer-events-none z-50 transform -translate-x-1/2 -translate-y-1/2 bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-950 px-3.5 py-2 rounded-xl shadow-2xl border border-slate-700 dark:border-zinc-300 text-xs font-medium flex items-center gap-2"
          style={{ left: `${touchPos.x}px`, top: `${touchPos.y}px` }}
        >
          <span className="font-mono text-[10px] opacity-75">{touchDraggingTask.ticket_id}</span>
          <span className="truncate max-w-[160px]">{touchDraggingTask.title}</span>
        </div>
      )}
    </div>
  );
};
