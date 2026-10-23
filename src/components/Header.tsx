import React from 'react';
import {
  Layers,
  FileText,
  Clock,
  ArrowLeftRight,
  Sliders,
  Plus,
  AlertCircle,
} from 'lucide-react';
import type { UserSettings } from '../types';
import { TempoLogo } from './TempoLogo';
import { SteelBall } from './Frontier';

export type ActiveView = 'board' | 'list' | 'timeline' | 'whatif';

interface HeaderProps {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  settings: UserSettings;
  onOpenSettings: () => void;
  onOpenCreateModal: () => void;
  onRecalculate: () => void;
  isRecalculating: boolean;
  breachCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeView,
  setActiveView,
  settings,
  onOpenSettings,
  onOpenCreateModal,
  onRecalculate,
  isRecalculating,
  breachCount,
}) => {
  const formatTime = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
  };

  const navItems: { id: ActiveView; label: string; icon: React.ReactNode; shortcut: string }[] = [
    { id: 'board', label: 'Board', icon: <Layers className="w-3.5 h-3.5" />, shortcut: '1' },
    { id: 'list', label: 'List', icon: <FileText className="w-3.5 h-3.5" />, shortcut: '2' },
    { id: 'timeline', label: 'Timeline', icon: <Clock className="w-3.5 h-3.5" />, shortcut: '3' },
    {
      id: 'whatif',
      label: 'Simulator',
      icon: <ArrowLeftRight className="w-3.5 h-3.5" />,
      shortcut: '4',
    },
  ];

  return (
    <header
      data-tauri-drag-region
      className="border-b border-slate-200 dark:border-[#221933] bg-white/85 dark:bg-[#0e0a16]/90 backdrop-blur-md sticky top-0 z-40 px-4 md:px-6 py-2.5 select-none"
    >
      <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
        {/* Brand & Desktop View Tabs */}
        <div className="flex items-center gap-6">
          <TempoLogo size={30} showText={true} />

          {/* Segmented Control Tabs */}
          <nav className="hidden md:flex items-center bg-slate-100 dark:bg-[#181125] p-1 rounded-lg border border-slate-200 dark:border-[#251b37]">
            {navItems.map((item) => {
              const active = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  title={`${item.label} (${item.shortcut})`}
                  className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    active
                      ? 'bg-white dark:bg-[#2b1e40] text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Global Controls & Status */}
        <div className="flex items-center gap-2.5">
          {breachCount > 0 && (
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs rounded-full">
              <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
              <span>{breachCount} at risk</span>
            </div>
          )}

          {/* Working Hours Pill */}
          <button
            onClick={onOpenSettings}
            title="Configure working hours and buffer"
            className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-[#181125] hover:bg-slate-200 dark:hover:bg-[#1e152e] border border-slate-200 dark:border-[#251b37] rounded-lg text-xs text-slate-700 dark:text-zinc-300 transition-colors"
          >
            <span className="w-1.5 h-1.5 bg-emerald-500 dark:bg-emerald-400 inline-block rounded-full" />
            <span>
              {formatTime(settings.work_start_time)} – {formatTime(settings.work_end_time)}
            </span>
            <span className="text-slate-400 dark:text-zinc-600">·</span>
            <span className="text-slate-500 dark:text-zinc-400">
              +{Math.round(settings.default_buffer_ratio * 100)}% buffer
            </span>
          </button>

          {/* Recalculate Timeline button */}
          <button
            onClick={onRecalculate}
            disabled={isRecalculating}
            title="Sync schedule (Ctrl/Cmd + R)"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-[#181125] hover:bg-slate-200 dark:hover:bg-[#1e152e] border border-slate-200 dark:border-[#251b37] rounded-lg text-xs font-medium text-slate-700 dark:text-zinc-300 transition-colors disabled:opacity-50"
          >
            <SteelBall size={16} />
            <span className="hidden sm:inline">Sync</span>
          </button>

          {/* Settings */}
          <button
            onClick={onOpenSettings}
            title="Settings (Ctrl/Cmd + ,)"
            className="p-2 bg-slate-100 dark:bg-[#181125] hover:bg-slate-200 dark:hover:bg-[#1e152e] border border-slate-200 dark:border-[#251b37] rounded-lg text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>

          {/* New Task Button (Desktop only) */}
          <button
            onClick={onOpenCreateModal}
            title="Create task (C)"
            className="hidden md:flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-black text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 text-xs font-medium rounded-lg shadow-sm transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New task</span>
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 bg-slate-800 dark:bg-zinc-200 text-[10px] text-slate-300 dark:text-zinc-700 rounded font-mono">
              C
            </kbd>
          </button>
        </div>
      </div>
    </header>
  );
};
