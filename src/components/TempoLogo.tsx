import React from 'react';

interface TempoLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

export const TempoLogo: React.FC<TempoLogoProps> = ({ size = 28, className = '', showText = false }) => {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        <defs>
          <linearGradient id="logoBgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#141824" />
            <stop offset="100%" stopColor="#080a0f" />
          </linearGradient>
          <linearGradient id="logoRibbon" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </linearGradient>
          <linearGradient id="logoCore" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fda4af" />
            <stop offset="40%" stopColor="#f43f5e" />
            <stop offset="100%" stopColor="#e11d48" />
          </linearGradient>
        </defs>

        {/* Base Squircle */}
        <rect
          width="40"
          height="40"
          rx="10"
          className="fill-slate-100 dark:fill-[#0c0e16] stroke-slate-200 dark:stroke-[#202738]"
          strokeWidth="1.2"
        />

        {/* Top Horizon Bar */}
        <rect
          x="10"
          y="10"
          width="20"
          height="2.5"
          rx="1.25"
          className="fill-slate-800 dark:fill-[#f1f5f9]"
        />

        {/* Bottom Horizon Base */}
        <rect
          x="12"
          y="27.5"
          width="16"
          height="2.5"
          rx="1.25"
          className="fill-slate-800 dark:fill-[#f1f5f9]"
          opacity="0.9"
        />

        {/* Left Curve */}
        <path
          d="M 13.5 12.5 C 13.5 18 19 18.5 19 20 C 19 21.5 13.5 22 13.5 27.5"
          className="stroke-slate-800 dark:stroke-[#f1f5f9]"
          strokeWidth="2.2"
          strokeLinecap="round"
        />

        {/* Right Curve */}
        <path
          d="M 26.5 12.5 C 26.5 18 21 18.5 21 20 C 21 21.5 26.5 22 26.5 27.5"
          className="stroke-slate-800 dark:stroke-[#f1f5f9]"
          strokeWidth="2.2"
          strokeLinecap="round"
        />

        {/* Active Ruby Core */}
        <circle cx="20" cy="20" r="3.2" fill="url(#logoCore)" />
        <circle cx="19.4" cy="19.4" r="0.9" fill="#ffffff" opacity="0.9" />
      </svg>

      {showText && (
        <div className="flex items-center gap-1.5 leading-none">
          <span className="font-semibold text-base tracking-tight text-slate-900 dark:text-white font-sans">
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
