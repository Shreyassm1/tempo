export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low';

export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'done' | 'canceled';

export interface Task {
  id: string;
  ticket_id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  priority_index: number;
  estimated_hours: number;
  buffer_ratio: number;
  scheduled_start: string | null;
  scheduled_deadline: string | null;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  force_start_today?: boolean;
}

export interface UserSettings {
  work_start_time: string; // "10:00"
  work_end_time: string;   // "18:00"
  work_days: string;       // "1,2,3,4,5"
  default_buffer_ratio: number; // 0.20
  context_switch_minutes: number; // 15
  timezone_offset_minutes: number;
  smart_rollover?: boolean;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  priority: TaskPriority;
  estimated_hours: number;
  buffer_ratio?: number;
  due_date?: string;
  status?: TaskStatus;
  force_start_today?: boolean;
}

export interface UpdateTaskInput {
  id: string;
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  priority_index?: number;
  estimated_hours?: number;
  buffer_ratio?: number;
  due_date?: string;
  force_start_today?: boolean;
}

export interface WhatIfRequest {
  candidate_title: string;
  candidate_estimated_hours: number;
  candidate_priority: TaskPriority;
  candidate_buffer_ratio?: number;
  candidate_due_date?: string;
  existing_task_id?: string;
  candidate_force_start_today?: boolean;
}

export interface TaskImpact {
  task_id: string;
  ticket_id: string;
  title: string;
  priority: TaskPriority;
  original_deadline: string | null;
  simulated_deadline: string | null;
  delay_hours: number;
  delay_days: number;
  is_delayed: boolean;
  hard_due_date: string | null;
  breaches_hard_due_date: boolean;
}

export interface SimulationSummary {
  total_tasks_evaluated: number;
  tasks_delayed_count: number;
  total_delay_hours: number;
  critical_breaches: number;
}

export interface WhatIfResponse {
  candidate_scheduled_start: string;
  candidate_scheduled_deadline: string;
  candidate_effective_hours: number;
  impacted_tasks: TaskImpact[];
  summary: SimulationSummary;
}
