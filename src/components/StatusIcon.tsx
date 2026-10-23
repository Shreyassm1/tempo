import React from 'react';
import type { TaskStatus } from '../types';
import { Flag, XCircle } from 'lucide-react';
import { Horseshoe, SteelBall } from './Frontier';

interface StatusIconProps {
  status: TaskStatus;
  className?: string;
}

// Backlog: a horseshoe not yet nailed on. To do: shod and ready. In progress: the steel ball is in play. Done: the finish flag.
export const StatusIcon: React.FC<StatusIconProps> = ({ status, className = 'w-4 h-4' }) => {
  switch (status) {
    case 'in_progress':
      return (
        <span className={`${className} inline-flex items-center justify-center shrink-0`}>
          <SteelBall size={14} className="w-full h-full" />
        </span>
      );
    case 'todo':
      return <Horseshoe className={`${className} text-amber-700 dark:text-amber-400`} />;
    case 'done':
      return <Flag className={`${className} text-emerald-600 dark:text-emerald-400`} />;
    case 'canceled':
      return <XCircle className={`${className} text-slate-400 dark:text-zinc-500`} />;
    case 'backlog':
    default:
      return <Horseshoe dashed className={`${className} text-slate-400 dark:text-zinc-500`} />;
  }
};
