use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Task {
    pub id: String,
    pub ticket_id: String,
    pub title: String,
    pub description: String,
    pub status: String, // "backlog", "todo", "in_progress", "done", "canceled"
    pub priority: String, // "urgent", "high", "medium", "low"
    pub priority_index: i32,
    pub estimated_hours: f64,
    pub buffer_ratio: f64,
    pub scheduled_start: Option<String>,
    pub scheduled_deadline: Option<String>,
    pub due_date: Option<String>,
    pub completed_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    #[serde(default)]
    pub force_start_today: bool,
}

fn default_true() -> bool {
    true
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserSettings {
    pub work_start_time: String, // e.g., "10:00"
    pub work_end_time: String,   // e.g., "18:00"
    pub work_days: String,       // e.g., "1,2,3,4,5"
    pub default_buffer_ratio: f64, // e.g., 0.20
    pub context_switch_minutes: i32, // e.g., 15
    pub timezone_offset_minutes: i32, // e.g., 330
    #[serde(default = "default_true")]
    pub smart_rollover: bool,
}

impl Default for UserSettings {
    fn default() -> Self {
        Self {
            work_start_time: "10:00".to_string(),
            work_end_time: "18:00".to_string(),
            work_days: "1,2,3,4,5".to_string(),
            default_buffer_ratio: 0.20,
            context_switch_minutes: 15,
            timezone_offset_minutes: 0,
            smart_rollover: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateTaskInput {
    pub title: String,
    pub description: Option<String>,
    pub priority: String,
    pub estimated_hours: f64,
    pub buffer_ratio: Option<f64>,
    pub due_date: Option<String>,
    pub status: Option<String>,
    pub force_start_today: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateTaskInput {
    pub id: String,
    pub title: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
    pub priority: Option<String>,
    pub priority_index: Option<i32>,
    pub estimated_hours: Option<f64>,
    pub buffer_ratio: Option<f64>,
    pub due_date: Option<String>,
    pub force_start_today: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WhatIfRequest {
    pub candidate_title: String,
    pub candidate_estimated_hours: f64,
    pub candidate_priority: String,
    pub candidate_buffer_ratio: Option<f64>,
    pub candidate_due_date: Option<String>,
    pub existing_task_id: Option<String>,
    pub candidate_force_start_today: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskImpact {
    pub task_id: String,
    pub ticket_id: String,
    pub title: String,
    pub priority: String,
    pub original_deadline: Option<String>,
    pub simulated_deadline: Option<String>,
    pub delay_hours: f64,
    pub delay_days: f64,
    pub is_delayed: bool,
    pub hard_due_date: Option<String>,
    pub breaches_hard_due_date: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SimulationSummary {
    pub total_tasks_evaluated: usize,
    pub tasks_delayed_count: usize,
    pub total_delay_hours: f64,
    pub critical_breaches: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WhatIfResponse {
    pub candidate_scheduled_start: String,
    pub candidate_scheduled_deadline: String,
    pub candidate_effective_hours: f64,
    pub impacted_tasks: Vec<TaskImpact>,
    pub summary: SimulationSummary,
}
