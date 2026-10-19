import React, { useState, useEffect } from 'react';
import type { UserSettings } from '../types';
import { X, Clock, Calendar, Shield, Check, SunMoon } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onSave: (newSettings: UserSettings) => Promise<void>;
  themeMode?: 'system' | 'light' | 'dark';
  onThemeChange?: (mode: 'system' | 'light' | 'dark') => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
  themeMode = 'system',
  onThemeChange,
}) => {
  const [startTime, setStartTime] = useState(settings.work_start_time);
  const [endTime, setEndTime] = useState(settings.work_end_time);
  const [bufferRatio, setBufferRatio] = useState(settings.default_buffer_ratio);
  const [contextMins, setContextMins] = useState(settings.context_switch_minutes);
  const [selectedDays, setSelectedDays] = useState<number[]>(
    settings.work_days.split(',').map(Number)
  );
  const [currentTheme, setCurrentTheme] = useState<'system' | 'light' | 'dark'>(themeMode);
  const [smartRollover, setSmartRollover] = useState(settings.smart_rollover !== false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStartTime(settings.work_start_time);
      setEndTime(settings.work_end_time);
      setBufferRatio(settings.default_buffer_ratio);
      setContextMins(settings.context_switch_minutes);
      setSelectedDays(settings.work_days.split(',').map(Number));
      setCurrentTheme(themeMode);
      setSmartRollover(settings.smart_rollover !== false);
    }
  }, [isOpen, settings, themeMode]);

  if (!isOpen) return null;

  const daysOfWeek = [
    { num: 1, label: 'Mon' },
    { num: 2, label: 'Tue' },
    { num: 3, label: 'Wed' },
    { num: 4, label: 'Thu' },
    { num: 5, label: 'Fri' },
    { num: 6, label: 'Sat' },
    { num: 7, label: 'Sun' },
  ];

  const toggleDay = (num: number) => {
    if (selectedDays.includes(num)) {
      if (selectedDays.length > 1) {
        setSelectedDays(selectedDays.filter((d) => d !== num));
      }
    } else {
      setSelectedDays([...selectedDays, num].sort());
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (onThemeChange) {
        onThemeChange(currentTheme);
      }
      await onSave({
        ...settings,
        work_start_time: startTime,
        work_end_time: endTime,
        work_days: selectedDays.join(','),
        default_buffer_ratio: bufferRatio,
        context_switch_minutes: contextMins,
        smart_rollover: smartRollover,
      });
      onClose();
    } catch (e) {
      console.error('Failed to save settings:', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 backdrop-blur-sm p-4"
    >
      <div className="bg-white dark:bg-[#0e1017] border border-slate-200 dark:border-[#1e2332] w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-[#1b1f2d]">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">
              Schedule settings
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-500 mt-0.5">
              Configure daily work hours, buffer margins, and appearance.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white p-1 rounded-md hover:bg-slate-100 dark:hover:bg-[#191d2a] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Theme Mode Selector */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-700 dark:text-zinc-300 flex items-center gap-2">
              <SunMoon className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-400" />
              Theme Appearance
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'system', label: 'Device theme' },
                { id: 'light', label: 'Light' },
                { id: 'dark', label: 'Dark' },
              ].map((t) => {
                const active = currentTheme === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setCurrentTheme(t.id as 'system' | 'light' | 'dark');
                      if (onThemeChange) {
                        onThemeChange(t.id as 'system' | 'light' | 'dark');
                      }
                    }}
                    className={`py-2 px-3 text-xs font-medium rounded-lg border transition-all ${
                      active
                        ? 'bg-slate-900 border-slate-900 text-white dark:bg-zinc-200 dark:border-zinc-200 dark:text-zinc-950 shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 dark:bg-[#131622] dark:border-[#222736] dark:text-zinc-400 dark:hover:text-zinc-200'
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Working Hours */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-700 dark:text-zinc-300 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-400" />
              Daily working hours
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[11px] text-slate-500 dark:text-zinc-400 mb-1 block">Start</span>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#131622] border border-slate-200 dark:border-[#222736] rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-slate-400 dark:focus:border-zinc-500 tabular-nums"
                />
              </div>
              <div>
                <span className="text-[11px] text-slate-500 dark:text-zinc-400 mb-1 block">End</span>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#131622] border border-slate-200 dark:border-[#222736] rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-slate-400 dark:focus:border-zinc-500 tabular-nums"
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-500">
              Tasks automatically roll over to the next workday outside these hours.
            </p>
          </div>

          {/* Active Work Days */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-700 dark:text-zinc-300 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-400" />
              Working days
            </label>
            <div className="flex gap-1.5">
              {daysOfWeek.map((day) => {
                const active = selectedDays.includes(day.num);
                return (
                  <button
                    key={day.num}
                    type="button"
                    onClick={() => toggleDay(day.num)}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                      active
                        ? 'bg-slate-900 border-slate-900 text-white dark:bg-zinc-200 dark:border-zinc-200 dark:text-zinc-950 font-semibold shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 dark:bg-[#131622] dark:border-[#222736] dark:text-zinc-400 dark:hover:text-zinc-200'
                    }`}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Default Buffer Margin */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-700 dark:text-zinc-300 flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-400" />
                Default safety buffer
              </label>
              <span className="text-xs font-medium text-slate-700 dark:text-zinc-300 tabular-nums">
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
            <p className="text-[11px] text-slate-500">
              Buffer added to absorb unexpected delays, reviews, and questions.
            </p>
          </div>

          {/* Context Switching Penalty */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-700 dark:text-zinc-300">
                Buffer between tasks
              </label>
              <span className="text-xs font-medium text-slate-700 dark:text-zinc-300 tabular-nums">
                {contextMins} mins
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="60"
              step="5"
              value={contextMins}
              onChange={(e) => setContextMins(parseInt(e.target.value))}
              className="w-full accent-slate-800 dark:accent-zinc-200"
            />
            <p className="text-[11px] text-slate-500">
              Rest and transition time between consecutive tasks.
            </p>
          </div>

          {/* Smart Day Rollover */}
          <div className="pt-3 border-t border-slate-100 dark:border-[#1b1f2d]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-zinc-300 block">
                  Smart day rollover (&lt; 1h rule)
                </label>
                <p className="text-[11px] text-slate-500 dark:text-zinc-500 mt-0.5">
                  Finish tasks today if &lt; 1h overtime is needed. Postpone starting long tasks if &lt; 1h remains in the workday.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={smartRollover}
                onClick={() => setSmartRollover(!smartRollover)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  smartRollover ? 'bg-slate-900 dark:bg-zinc-100' : 'bg-slate-200 dark:bg-zinc-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full shadow ring-0 transition duration-200 ease-in-out ${
                    smartRollover
                      ? 'translate-x-4 bg-white dark:bg-zinc-950'
                      : 'translate-x-0 bg-white dark:bg-zinc-300'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-[#1b1f2d] flex justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-black text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 text-xs font-medium rounded-lg shadow-sm transition-all disabled:opacity-40 active:scale-95"
          >
            <Check className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save settings'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
