import { useState, useEffect } from 'react';
import type { Task, TaskPriority, TaskStatus, UserSettings, CreateTaskInput, UpdateTaskInput } from './types';
import { api } from './services/api';
import { Header } from './components/Header';
import type { ActiveView } from './components/Header';
import { TaskBoard } from './components/TaskBoard';
import { TaskList } from './components/TaskList';
import { TimelineView } from './components/TimelineView';
import { WhatIfSimulator } from './components/WhatIfSimulator';
import { SettingsModal } from './components/SettingsModal';
import { CreateTaskModal } from './components/CreateTaskModal';
import { EditTaskModal } from './components/EditTaskModal';
import { checkBreach } from './utils/date';
import { Layers, FileText, Clock, ArrowLeftRight, Plus } from 'lucide-react';

export function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [settings, setSettings] = useState<UserSettings>({
    work_start_time: '10:00',
    work_end_time: '18:00',
    work_days: '1,2,3,4,5',
    default_buffer_ratio: 0.20,
    context_switch_minutes: 15,
    timezone_offset_minutes: 0,
  });

  const [activeView, setActiveView] = useState<ActiveView>('board');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createInitialStatus, setCreateInitialStatus] = useState<TaskStatus>('todo');
  const [prefillWhatIfTask, setPrefillWhatIfTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isRecalculating, setIsRecalculating] = useState(false);

  // Device Theme Tracking (System / Light / Dark)
  const [themeMode, setThemeMode] = useState<'system' | 'light' | 'dark'>(() => {
    return (localStorage.getItem('tempo_theme') as 'system' | 'light' | 'dark') || 'system';
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const applyTheme = () => {
      const isDark =
        themeMode === 'dark' || (themeMode === 'system' && mediaQuery.matches);
      
      if (isDark) {
        document.documentElement.classList.add('dark');
        document.documentElement.style.colorScheme = 'dark';
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.style.colorScheme = 'light';
      }
    };

    applyTheme();

    const handler = () => {
      if (themeMode === 'system') {
        applyTheme();
      }
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [themeMode]);

  const handleThemeChange = (newTheme: 'system' | 'light' | 'dark') => {
    setThemeMode(newTheme);
    localStorage.setItem('tempo_theme', newTheme);
  };

  // Initial load
  const loadData = async () => {
    try {
      const [fetchedSettings, fetchedTasks] = await Promise.all([
        api.getSettings(),
        api.getTasks(),
      ]);

      const localTzOffset = -new Date().getTimezoneOffset();
      if (fetchedSettings.timezone_offset_minutes !== localTzOffset) {
        const updatedSettings = {
          ...fetchedSettings,
          timezone_offset_minutes: localTzOffset,
        };
        const recalculatedTasks = await api.updateSettings(updatedSettings);
        setSettings(updatedSettings);
        setTasks(recalculatedTasks);
        return;
      }

      setSettings(fetchedSettings);
      setTasks(fetchedTasks);
    } catch (err) {
      console.error('Error loading initial data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCreateOpen(false);
        setIsSettingsOpen(false);
        setEditingTask(null);
        return;
      }

      // Settings shortcut (Cmd/Ctrl + ,)
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault();
        setIsSettingsOpen(true);
        return;
      }

      // Sync schedule shortcut (Cmd/Ctrl + R)
      if ((e.metaKey || e.ctrlKey) && (e.key === 'r' || e.key === 'R')) {
        e.preventDefault();
        handleRecalculate();
        return;
      }

      if (
        ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)
      ) {
        return;
      }

      if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        setCreateInitialStatus('todo');
        setIsCreateOpen(true);
      } else if (e.key === '1') {
        setActiveView('board');
      } else if (e.key === '2') {
        setActiveView('list');
      } else if (e.key === '3') {
        setActiveView('timeline');
      } else if (e.key === '4') {
        setActiveView('whatif');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Actions
  const handleUpdateStatus = async (id: string, newStatus: TaskStatus) => {
    try {
      await api.updateTask({ id, status: newStatus });
      const updated = await api.getTasks();
      setTasks(updated);
    } catch (err) {
      console.error('Error updating task status:', err);
    }
  };

  const handleUpdatePriority = async (id: string, newPriority: TaskPriority) => {
    try {
      await api.updateTask({ id, priority: newPriority });
      const updated = await api.getTasks();
      setTasks(updated);
    } catch (err) {
      console.error('Error updating task priority:', err);
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await api.deleteTask(id);
      const updated = await api.getTasks();
      setTasks(updated);
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  };

  const handleCreateTask = async (input: CreateTaskInput) => {
    try {
      await api.createTask(input);
      const updated = await api.getTasks();
      setTasks(updated);
    } catch (err) {
      console.error('Error creating task:', err);
    }
  };

  const handleSaveTask = async (input: UpdateTaskInput) => {
    try {
      await api.updateTask(input);
      const updated = await api.getTasks();
      setTasks(updated);
    } catch (err) {
      console.error('Error saving updated task:', err);
    }
  };

  const handleSaveSettings = async (newSettings: UserSettings) => {
    setIsRecalculating(true);
    try {
      const localTzOffset = -new Date().getTimezoneOffset();
      const settingsWithTz = {
        ...newSettings,
        timezone_offset_minutes: localTzOffset,
      };
      const recalculatedTasks = await api.updateSettings(settingsWithTz);
      setSettings(settingsWithTz);
      setTasks(recalculatedTasks);
    } catch (err) {
      console.error('Error saving settings:', err);
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleRecalculate = async () => {
    setIsRecalculating(true);
    try {
      const recalculated = await api.recalculateSchedule();
      setTasks(recalculated);
    } catch (err) {
      console.error('Error recalculating schedule:', err);
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleOpenCreateWithStatus = (status: TaskStatus) => {
    setCreateInitialStatus(status);
    setIsCreateOpen(true);
  };

  // Check critical breaches count
  const breachCount = tasks.filter(
    (t) => t.status !== 'done' && checkBreach(t.scheduled_deadline, t.due_date)
  ).length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090a0f] text-slate-900 dark:text-zinc-100 flex flex-col font-sans select-none antialiased">
      {/* Top App Header */}
      <Header
        activeView={activeView}
        setActiveView={(view) => {
          setActiveView(view);
          if (view !== 'whatif') setPrefillWhatIfTask(null);
        }}
        settings={settings}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenCreateModal={() => {
          setCreateInitialStatus('todo');
          setIsCreateOpen(true);
        }}
        onRecalculate={handleRecalculate}
        isRecalculating={isRecalculating}
        breachCount={breachCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        {activeView === 'board' && (
          <TaskBoard
            tasks={tasks}
            settings={settings}
            onUpdateStatus={handleUpdateStatus}
            onDeleteTask={handleDeleteTask}
            onEditTask={(task) => setEditingTask(task)}
            onOpenCreateWithStatus={handleOpenCreateWithStatus}
          />
        )}

        {activeView === 'list' && (
          <TaskList
            tasks={tasks}
            onUpdateStatus={handleUpdateStatus}
            onUpdatePriority={handleUpdatePriority}
            onDeleteTask={handleDeleteTask}
            onEditTask={(task) => setEditingTask(task)}
          />
        )}

        {activeView === 'timeline' && (
          <TimelineView tasks={tasks} settings={settings} />
        )}

        {activeView === 'whatif' && (
          <WhatIfSimulator
            tasks={tasks}
            settings={settings}
            prefillTask={prefillWhatIfTask}
            onTaskCreated={() => {
              loadData();
              setActiveView('board');
            }}
          />
        )}
      </main>

      {/* Clean Mobile Bottom Navigation Bar */}
      <nav className="md:hidden border-t border-slate-200 dark:border-[#1c202d] bg-white/95 dark:bg-[#0b0d13]/95 backdrop-blur-md sticky bottom-0 z-40 px-3 py-2 flex items-center justify-around shadow-sm">
        <button
          onClick={() => setActiveView('board')}
          className={`flex flex-col items-center gap-1 py-1 px-3 text-[11px] font-medium transition-colors ${
            activeView === 'board' ? 'text-slate-900 dark:text-white font-semibold' : 'text-slate-500 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-300'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Board</span>
        </button>
        <button
          onClick={() => setActiveView('list')}
          className={`flex flex-col items-center gap-1 py-1 px-3 text-[11px] font-medium transition-colors ${
            activeView === 'list' ? 'text-slate-900 dark:text-white font-semibold' : 'text-slate-500 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-300'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>List</span>
        </button>
        <button
          onClick={() => {
            setCreateInitialStatus('todo');
            setIsCreateOpen(true);
          }}
          className="p-2.5 bg-slate-900 hover:bg-black text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 rounded-full shadow-md active:scale-95 transition-transform"
          title="New Task"
        >
          <Plus className="w-5 h-5" />
        </button>
        <button
          onClick={() => setActiveView('timeline')}
          className={`flex flex-col items-center gap-1 py-1 px-3 text-[11px] font-medium transition-colors ${
            activeView === 'timeline' ? 'text-slate-900 dark:text-white font-semibold' : 'text-slate-500 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-300'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Timeline</span>
        </button>
        <button
          onClick={() => setActiveView('whatif')}
          className={`flex flex-col items-center gap-1 py-1 px-3 text-[11px] font-medium transition-colors ${
            activeView === 'whatif' ? 'text-slate-900 dark:text-white font-semibold' : 'text-slate-500 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-300'
          }`}
        >
          <ArrowLeftRight className="w-4 h-4" />
          <span>Simulator</span>
        </button>
      </nav>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={handleSaveSettings}
        themeMode={themeMode}
        onThemeChange={handleThemeChange}
      />

      {/* Create Issue Modal */}
      <CreateTaskModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateTask}
        settings={settings}
        initialStatus={createInitialStatus}
      />

      {/* Edit Task Modal */}
      <EditTaskModal
        isOpen={!!editingTask}
        onClose={() => setEditingTask(null)}
        task={editingTask}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
        settings={settings}
      />
    </div>
  );
}

export default App;
