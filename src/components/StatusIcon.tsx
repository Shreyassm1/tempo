import React from 'react';
import type { TaskStatus } from '../types';
import { Circle, CircleDot, CheckCircle2, XCircle, Clock } from 'lucide-react';

interface StatusIconProps {
  status: TaskStatus;
  className?: string;
}

export const StatusIcon: React.FC<StatusIconProps> = ({ status, className = 'w-4 h-4' }) => {
  switch (status) {
    case 'in_progress':
      return <CircleDot className={`${className} text-sky-600 dark:text-sky-400`} />;
    case 'todo':
      return <Clock className={`${className} text-slate-400 dark:text-zinc-400`} />;
    case 'done':
      return <CheckCircle2 className={`${className} text-emerald-600 dark:text-emerald-400`} />;
    case 'canceled':
      return <XCircle className={`${className} text-slate-400 dark:text-zinc-500`} />;
    case 'backlog':
    default:
      return <Circle className={`${className} text-slate-400 dark:text-zinc-500`} strokeDasharray="3 3" />;
  }
};
