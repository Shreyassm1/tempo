import React from 'react';
import { SteelBall } from './Frontier';

interface TempoLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

export const TempoLogo: React.FC<TempoLogoProps> = ({ size = 28, className = '', showText = false }) => {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <SteelBall size={size} />

      {showText && (
        <div className="flex items-center gap-1.5 leading-none">
          <span className="font-semibold text-base tracking-tight text-slate-900 dark:text-white">
            Tempo
          </span>
          <span className="text-[10px] font-medium tracking-wide text-slate-500 dark:text-zinc-500 uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/40">
            beta
          </span>
        </div>
      )}
    </div>
  );
};
