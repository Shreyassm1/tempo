import { invoke } from '@tauri-apps/api/core';
import type {
  CreateTaskInput,
  Task,
  UpdateTaskInput,
  UserSettings,
  WhatIfRequest,
  WhatIfResponse,
} from '../types';

const isTauriEnv = (): boolean => {
  return typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);
};

// In-memory fallback database for browser preview/development
let mockSettings: UserSettings = {
  work_start_time: '10:00',
  work_end_time: '18:00',
  work_days: '1,2,3,4,5',
  default_buffer_ratio: 0.20,
  context_switch_minutes: 15,
  timezone_offset_minutes: 0,
  smart_rollover: true,
};

let mockTasks: Task[] = [];
let mockLastTicketNum = 100;

// Helper to simulate calendar calculation in fallback mode
function calculateLocalSchedule(tasks: Task[], settings: UserSettings): Task[] {
  const [startH, startM] = settings.work_start_time.split(':').map(Number);
  const [endH, endM] = settings.work_end_time.split(':').map(Number);
  const workDays = new Set(settings.work_days.split(',').map(s => Number(s.trim())));
  const isSmartRollover = settings.smart_rollover !== false;

  const active = tasks
    .map(t => (!isSmartRollover && t.force_start_today ? { ...t, force_start_today: false } : t))
    .filter(t => t.status === 'in_progress' || t.status === 'todo' || t.status === 'backlog');
  
  const prioScore: Record<string, number> = { urgent: 1, high: 2, medium: 3, low: 4 };
  const statusScore: Record<string, number> = { in_progress: 1, todo: 2, backlog: 3 };

  active.sort((a, b) => {
    const sDiff = (statusScore[a.status] || 4) - (statusScore[b.status] || 4);
    if (sDiff !== 0) return sDiff;
    const pDiff = (prioScore[a.priority] || 5) - (prioScore[b.priority] || 5);
    if (pDiff !== 0) return pDiff;
    return a.priority_index - b.priority_index;
  });

  let cursor = new Date();
  
  const snapCursor = (d: Date) => {
    const cur = new Date(d);
    for (let i = 0; i < 14; i++) {
      const day = cur.getDay();
      const dayIso = day === 0 ? 7 : day;
      const isWorkDay = workDays.has(dayIso);

      const h = cur.getHours();
      const m = cur.getMinutes();
      const curMins = h * 60 + m;
      const startMins = startH * 60 + startM;
      const endMins = endH * 60 + endM;

      if (isWorkDay) {
        if (curMins < startMins) {
          cur.setHours(startH, startM, 0, 0);
          return cur;
        } else if (curMins >= endMins) {
          cur.setDate(cur.getDate() + 1);
          cur.setHours(startH, startM, 0, 0);
          continue;
        } else {
          return cur;
        }
      } else {
        cur.setDate(cur.getDate() + 1);
        cur.setHours(startH, startM, 0, 0);
      }
    }
    return cur;
  };

  const advanceWorkMinutes = (startDt: Date, totalMinutes: number): Date => {
    let cur = snapCursor(startDt);
    let remaining = totalMinutes;

    while (remaining > 0) {
      cur = snapCursor(cur);
      const endOfDay = new Date(cur);
      endOfDay.setHours(endH, endM, 0, 0);

      const avail = Math.max(0, Math.floor((endOfDay.getTime() - cur.getTime()) / 60000));
      if (remaining <= avail) {
        cur = new Date(cur.getTime() + remaining * 60000);
        remaining = 0;
      } else {
        const remainingAfterToday = remaining - avail;
        if (isSmartRollover && remainingAfterToday < 60) {
          cur = new Date(endOfDay.getTime() + remainingAfterToday * 60000);
          remaining = 0;
        } else {
          remaining -= avail;
          cur = new Date(endOfDay.getTime() + 60000);
          cur = snapCursor(cur);
        }
      }
    }
    return cur;
  };

  cursor = snapCursor(cursor);

  const scheduledMap = new Map<string, Task>();
  for (const t of active) {
    const buffer = t.buffer_ratio > 0 ? t.buffer_ratio : settings.default_buffer_ratio;
    const rawMins = Math.max(15, t.estimated_hours * 60);
    const bufferedMins = Math.round(rawMins * (1 + buffer)) + settings.context_switch_minutes;

    cursor = snapCursor(cursor);

    // Smart rollover: postpone starting if < 1h left today and task can't finish
    if (isSmartRollover && !t.force_start_today) {
      const endOfDay = new Date(cursor);
      endOfDay.setHours(endH, endM, 0, 0);
      const avail = Math.max(0, Math.floor((endOfDay.getTime() - cursor.getTime()) / 60000));
      if (avail < 60 && bufferedMins > avail + 59) {
        const nextDay = new Date(endOfDay.getTime() + 60000);
        cursor = snapCursor(nextDay);
      }
    }

    const startIso = cursor.toISOString();
    const deadline = advanceWorkMinutes(cursor, bufferedMins);
    const deadlineIso = deadline.toISOString();
    cursor = deadline;

    scheduledMap.set(t.id, {
      ...t,
      scheduled_start: startIso,
      scheduled_deadline: deadlineIso,
    });
  }

  return tasks.map(t => scheduledMap.get(t.id) || t);
}

export const api = {
  async getTasks(): Promise<Task[]> {
    if (isTauriEnv()) {
      try {
        return await invoke<Task[]>('get_tasks');
      } catch (e) {
        console.warn('Tauri invoke failed, falling back to local engine:', e);
      }
    }
    mockTasks = calculateLocalSchedule(mockTasks, mockSettings);
    return [...mockTasks];
  },

  async createTask(input: CreateTaskInput): Promise<Task> {
    if (isTauriEnv()) {
      try {
        return await invoke<Task>('create_task', { input });
      } catch (e) {
        console.warn('Tauri invoke failed, falling back to local engine:', e);
      }
    }

    const nextNum = ++mockLastTicketNum;
    const newTask: Task = {
      id: `task-${Date.now()}`,
      ticket_id: `TEM-${nextNum}`,
      title: input.title,
      description: input.description || '',
      status: input.status || 'todo',
      priority: input.priority,
      priority_index: mockTasks.length + 1,
      estimated_hours: input.estimated_hours,
      buffer_ratio: input.buffer_ratio ?? mockSettings.default_buffer_ratio,
      scheduled_start: null,
      scheduled_deadline: null,
      due_date: input.due_date || null,
      completed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      force_start_today: input.force_start_today || false,
    };

    mockTasks.push(newTask);
    mockTasks = calculateLocalSchedule(mockTasks, mockSettings);
    return mockTasks.find(t => t.id === newTask.id)!;
  },

  async updateTask(input: UpdateTaskInput): Promise<Task> {
    if (isTauriEnv()) {
      try {
        return await invoke<Task>('update_task', { input });
      } catch (e) {
        console.warn('Tauri invoke failed, falling back to local engine:', e);
      }
    }

    const idx = mockTasks.findIndex(t => t.id === input.id);
    if (idx === -1) throw new Error('Task not found');

    const curr = mockTasks[idx];
    const isDone = input.status === 'done';
    mockTasks[idx] = {
      ...curr,
      ...input,
      title: input.title ?? curr.title,
      description: input.description ?? curr.description,
      status: input.status ?? curr.status,
      priority: input.priority ?? curr.priority,
      priority_index: input.priority_index ?? curr.priority_index,
      estimated_hours: input.estimated_hours ?? curr.estimated_hours,
      buffer_ratio: input.buffer_ratio ?? curr.buffer_ratio,
      due_date: input.due_date !== undefined ? (input.due_date ? input.due_date : null) : curr.due_date,
      completed_at: isDone && !curr.completed_at ? new Date().toISOString() : !isDone ? null : curr.completed_at,
      updated_at: new Date().toISOString(),
      force_start_today: input.force_start_today !== undefined ? input.force_start_today : curr.force_start_today,
    };

    mockTasks = calculateLocalSchedule(mockTasks, mockSettings);
    return mockTasks[idx];
  },

  async deleteTask(id: string): Promise<void> {
    if (isTauriEnv()) {
      try {
        await invoke('delete_task', { id });
        return;
      } catch (e) {
        console.warn('Tauri invoke failed, falling back to local engine:', e);
      }
    }
    mockTasks = mockTasks.filter(t => t.id !== id);
    mockTasks = calculateLocalSchedule(mockTasks, mockSettings);
  },

  async getSettings(): Promise<UserSettings> {
    if (isTauriEnv()) {
      try {
        return await invoke<UserSettings>('get_settings');
      } catch (e) {
        console.warn('Tauri invoke failed, falling back to local engine:', e);
      }
    }
    return { ...mockSettings };
  },

  async updateSettings(settings: UserSettings): Promise<Task[]> {
    if (isTauriEnv()) {
      try {
        return await invoke<Task[]>('update_settings', { settings });
      } catch (e) {
        console.warn('Tauri invoke failed, falling back to local engine:', e);
      }
    }
    mockSettings = { ...settings };
    mockTasks = calculateLocalSchedule(mockTasks, mockSettings);
    return [...mockTasks];
  },

  async recalculateSchedule(): Promise<Task[]> {
    if (isTauriEnv()) {
      try {
        return await invoke<Task[]>('recalculate_schedule');
      } catch (e) {
        console.warn('Tauri invoke failed, falling back to local engine:', e);
      }
    }
    mockTasks = calculateLocalSchedule(mockTasks, mockSettings);
    return [...mockTasks];
  },

  async simulateImpact(request: WhatIfRequest): Promise<WhatIfResponse> {
    if (isTauriEnv()) {
      try {
        return await invoke<WhatIfResponse>('simulate_impact', { request });
      } catch (e) {
        console.warn('Tauri invoke failed, falling back to local engine:', e);
      }
    }

    // Local simulation engine
    const baseline = calculateLocalSchedule(mockTasks, mockSettings);
    const baselineMap = new Map(baseline.map(t => [t.id, t]));

    const candId = 'candidate-sim';
    const buffer = request.candidate_buffer_ratio ?? mockSettings.default_buffer_ratio;
    const candTask: Task = {
      id: candId,
      ticket_id: 'SIM-CAND',
      title: request.candidate_title,
      description: 'Candidate Task',
      status: 'todo',
      priority: request.candidate_priority,
      priority_index: 0,
      estimated_hours: request.candidate_estimated_hours,
      buffer_ratio: buffer,
      scheduled_start: null,
      scheduled_deadline: null,
      due_date: request.candidate_due_date || null,
      completed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const simulatedList = [...mockTasks, candTask];
    const simulated = calculateLocalSchedule(simulatedList, mockSettings);
    const simulatedMap = new Map(simulated.map(t => [t.id, t]));

    const candScheduled = simulatedMap.get(candId)!;
    const rawMins = request.candidate_estimated_hours * 60;
    const effHours = ((rawMins * (1 + buffer)) + mockSettings.context_switch_minutes) / 60;

    const impactedTasks = [];
    let delayedCount = 0;
    let totalDelayHours = 0;
    let criticalBreaches = 0;

    for (const task of mockTasks) {
      if (task.status === 'done' || task.status === 'canceled') continue;
      const orig = baselineMap.get(task.id);
      const sim = simulatedMap.get(task.id);

      let delayH = 0;
      let delayD = 0;
      let isDelayed = false;
      let breaches = false;

      if (orig?.scheduled_deadline && sim?.scheduled_deadline) {
        const origTime = new Date(orig.scheduled_deadline).getTime();
        const simTime = new Date(sim.scheduled_deadline).getTime();
        const diffMins = Math.floor((simTime - origTime) / 60000);

        if (diffMins > 5) {
          isDelayed = true;
          delayedCount++;
          delayH = Math.max(0.1, Number((diffMins / 60).toFixed(1)));
          delayD = Math.max(0.1, Number((delayH / 8).toFixed(1)));
          totalDelayHours += delayH;
        }

        if (task.due_date) {
          const hardTime = new Date(task.due_date).getTime();
          if (simTime > hardTime && origTime <= hardTime) {
            breaches = true;
            criticalBreaches++;
          }
        }
      }

      impactedTasks.push({
        task_id: task.id,
        ticket_id: task.ticket_id,
        title: task.title,
        priority: task.priority,
        original_deadline: orig?.scheduled_deadline || null,
        simulated_deadline: sim?.scheduled_deadline || null,
        delay_hours: delayH,
        delay_days: delayD,
        is_delayed: isDelayed,
        hard_due_date: task.due_date,
        breaches_hard_due_date: breaches,
      });
    }

    impactedTasks.sort((a, b) => {
      if (a.breaches_hard_due_date !== b.breaches_hard_due_date) {
        return a.breaches_hard_due_date ? -1 : 1;
      }
      if (a.is_delayed !== b.is_delayed) {
        return a.is_delayed ? -1 : 1;
      }
      return b.delay_hours - a.delay_hours;
    });

    return {
      candidate_scheduled_start: candScheduled.scheduled_start || new Date().toISOString(),
      candidate_scheduled_deadline: candScheduled.scheduled_deadline || new Date().toISOString(),
      candidate_effective_hours: Number(effHours.toFixed(1)),
      impacted_tasks: impactedTasks,
      summary: {
        total_tasks_evaluated: impactedTasks.length,
        tasks_delayed_count: delayedCount,
        total_delay_hours: Number(totalDelayHours.toFixed(1)),
        critical_breaches: criticalBreaches,
      },
    };
  },
};
