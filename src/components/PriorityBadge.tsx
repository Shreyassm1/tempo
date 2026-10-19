import React from 'react';
import type { TaskPriority } from '../types';

interface PriorityBadgeProps {
  priority: TaskPriority;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({
  priority,
  showLabel = true,
  size = 'md',
}) => {
  const configs = {
    urgent: {
      color: 'text-rose-700 bg-rose-50 border-rose-200 dark:text-rose-400 dark:bg-rose-500/10 dark:border-rose-500/20',
      dot: 'bg-rose-500',
      label: 'Urgent',
    },
    high: {
      color: 'text-amber-800 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-500/10 dark:border-amber-500/20',
      dot: 'bg-amber-500',
      label: 'High',
    },
    medium: {
      color: 'text-sky-700 bg-sky-50 border-sky-200 dark:text-sky-400 dark:bg-sky-500/10 dark:border-sky-500/20',
      dot: 'bg-sky-500',
      label: 'Medium',
    },
    low: {
      color: 'text-slate-600 bg-slate-100 border-slate-200 dark:text-zinc-400 dark:bg-zinc-500/10 dark:border-zinc-500/20',
      dot: 'bg-slate-400 dark:bg-zinc-500',
      label: 'Low',
    },
  };

  const config = configs[priority] || configs.medium;

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium border rounded-full font-sans ${config.color} ${
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-xs'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {showLabel && <span>{config.label}</span>}
    </span>
  );
};
