use chrono::{DateTime, Datelike, Duration, FixedOffset, NaiveTime, Timelike, Utc};
use std::collections::HashSet;

use crate::models::{
    SimulationSummary, Task, TaskImpact, UserSettings, WhatIfRequest, WhatIfResponse,
};

#[derive(Debug, Clone)]
pub struct WorkTimeConfig {
    pub start_time: NaiveTime,
    pub end_time: NaiveTime,
    pub work_days: HashSet<u32>, // 1 = Monday, 7 = Sunday
    pub default_buffer_ratio: f64,
    pub context_switch_minutes: i64,
    pub timezone_offset: FixedOffset,
    pub smart_rollover: bool,
}

impl WorkTimeConfig {
    pub fn from_settings(settings: &UserSettings) -> Self {
        let start_time = NaiveTime::parse_from_str(&settings.work_start_time, "%H:%M")
            .unwrap_or_else(|_| NaiveTime::from_hms_opt(10, 0, 0).unwrap());
        let end_time = NaiveTime::parse_from_str(&settings.work_end_time, "%H:%M")
            .unwrap_or_else(|_| NaiveTime::from_hms_opt(18, 0, 0).unwrap());

        let mut work_days = HashSet::new();
        for s in settings.work_days.split(',') {
            if let Ok(d) = s.trim().parse::<u32>() {
                if (1..=7).contains(&d) {
                    work_days.insert(d);
                }
            }
        }
        if work_days.is_empty() {
            // Default Mon-Fri
            work_days.extend([1, 2, 3, 4, 5]);
        }

        let tz_secs = settings.timezone_offset_minutes * 60;
        let timezone_offset = FixedOffset::east_opt(tz_secs)
            .unwrap_or_else(|| FixedOffset::east_opt(0).unwrap());

        Self {
            start_time,
            end_time,
            work_days,
            default_buffer_ratio: settings.default_buffer_ratio.max(0.0),
            context_switch_minutes: settings.context_switch_minutes.max(0) as i64,
            timezone_offset,
            smart_rollover: settings.smart_rollover,
        }
    }

    pub fn daily_work_minutes(&self) -> i64 {
        let start_mins = (self.start_time.hour() * 60 + self.start_time.minute()) as i64;
        let end_mins = (self.end_time.hour() * 60 + self.end_time.minute()) as i64;
        (end_mins - start_mins).max(60) // at least 1 hour
    }
}

pub fn priority_score(priority: &str) -> i32 {
    match priority.to_lowercase().as_str() {
        "urgent" => 1,
        "high" => 2,
        "medium" => 3,
        "low" => 4,
        _ => 5,
    }
}

pub fn status_score(status: &str) -> i32 {
    match status.to_lowercase().as_str() {
        "in_progress" => 1,
        "todo" => 2,
        "backlog" => 3,
        _ => 4,
    }
}

/// Snaps a datetime into the nearest valid working window (same day if within hours, or next working day start).
pub fn snap_to_work_window(mut dt: DateTime<FixedOffset>, config: &WorkTimeConfig) -> DateTime<FixedOffset> {
    for _ in 0..14 {
        let weekday_num = dt.weekday().number_from_monday();
        let is_work_day = config.work_days.contains(&weekday_num);

        let cur_time = dt.time();

        if is_work_day {
            if cur_time < config.start_time {
                // Before work hours today -> snap to start of work today
                dt = dt
                    .with_hour(config.start_time.hour())
                    .unwrap()
                    .with_minute(config.start_time.minute())
                    .unwrap()
                    .with_second(0)
                    .unwrap()
                    .with_nanosecond(0)
                    .unwrap();
                return dt;
            } else if cur_time >= config.end_time {
                // After work hours today -> advance to next day at start_time
                dt = dt + Duration::days(1);
                dt = dt
                    .with_hour(config.start_time.hour())
                    .unwrap()
                    .with_minute(config.start_time.minute())
                    .unwrap()
                    .with_second(0)
                    .unwrap()
                    .with_nanosecond(0)
                    .unwrap();
                continue;
            } else {
                // In the middle of work hours
                return dt;
            }
        } else {
            // Weekend or non-workday -> advance to next day at start_time
            dt = dt + Duration::days(1);
            dt = dt
                .with_hour(config.start_time.hour())
                .unwrap()
                .with_minute(config.start_time.minute())
                .unwrap()
                .with_second(0)
                .unwrap()
                .with_nanosecond(0)
                .unwrap();
        }
    }
    dt
}

/// Advances datetime by a given number of working minutes, accounting for working hours and non-working days.
pub fn advance_work_minutes(
    mut dt: DateTime<FixedOffset>,
    mut minutes: i64,
    config: &WorkTimeConfig,
) -> DateTime<FixedOffset> {
    while minutes > 0 {
        dt = snap_to_work_window(dt, config);

        let end_of_day = dt
            .with_hour(config.end_time.hour())
            .unwrap()
            .with_minute(config.end_time.minute())
            .unwrap()
            .with_second(0)
            .unwrap()
            .with_nanosecond(0)
            .unwrap();

        let avail_mins = (end_of_day - dt).num_minutes();
        if minutes <= avail_mins {
            dt = dt + Duration::minutes(minutes);
            minutes = 0;
        } else {
            let remaining_after_today = minutes - avail_mins;
            // Overtime rule: if smart_rollover is enabled and under 60 minutes remain to complete the task,
            // finish today itself with up to 1 hr overtime!
            if config.smart_rollover && remaining_after_today < 60 {
                dt = end_of_day + Duration::minutes(remaining_after_today);
                minutes = 0;
            } else {
                minutes -= avail_mins;
                // Advance cursor to next day start
                dt = end_of_day + Duration::minutes(1);
                dt = snap_to_work_window(dt, config);
            }
        }
    }
    dt
}

/// Calculates the realistic schedule for a list of tasks.
pub fn calculate_schedule(
    tasks: &[Task],
    settings: &UserSettings,
    anchor_time: DateTime<Utc>,
) -> Vec<Task> {
    let config = WorkTimeConfig::from_settings(settings);

    // Filter active tasks
    let mut active_tasks: Vec<Task> = tasks
        .iter()
        .filter(|t| t.status == "in_progress" || t.status == "todo" || t.status == "backlog")
        .cloned()
        .collect();

    // Sort by status rank, then priority rank, then priority_index, then created_at
    active_tasks.sort_by(|a, b| {
        let status_cmp = status_score(&a.status).cmp(&status_score(&b.status));
        if status_cmp != std::cmp::Ordering::Equal {
            return status_cmp;
        }

        let prio_cmp = priority_score(&a.priority).cmp(&priority_score(&b.priority));
        if prio_cmp != std::cmp::Ordering::Equal {
            return prio_cmp;
        }

        let idx_cmp = a.priority_index.cmp(&b.priority_index);
        if idx_cmp != std::cmp::Ordering::Equal {
            return idx_cmp;
        }

        a.created_at.cmp(&b.created_at)
    });

    // A ticket with open subtasks is a container: the subtasks carry the effort, and the
    // container spans from its first subtask's start to its last subtask's deadline.
    let parent_ids: HashSet<String> = active_tasks
        .iter()
        .filter_map(|t| t.parent_ticket_id.clone())
        .collect();
    let (mut containers, mut active_tasks): (Vec<Task>, Vec<Task>) = active_tasks
        .into_iter()
        .partition(|t| parent_ids.contains(&t.ticket_id));

    let local_anchor: DateTime<FixedOffset> = anchor_time.with_timezone(&config.timezone_offset);
    let mut cursor = snap_to_work_window(local_anchor, &config);

    for task in active_tasks.iter_mut() {
        let buffer = if task.buffer_ratio > 0.0 {
            task.buffer_ratio
        } else {
            config.default_buffer_ratio
        };

        // Real-world effective minutes: effort * (1 + buffer) + context switch penalty
        let raw_work_minutes = (task.estimated_hours * 60.0).max(15.0);
        let buffered_minutes = (raw_work_minutes * (1.0 + buffer)).round() as i64;
        let total_minutes = buffered_minutes + config.context_switch_minutes;

        cursor = snap_to_work_window(cursor, &config);

        // Smart rollover: If < 1 hr remains in workday and task cannot finish today,
        // postpone starting this task until next business day (unless task.force_start_today).
        if config.smart_rollover && !task.force_start_today {
            let end_of_day = cursor
                .with_hour(config.end_time.hour())
                .unwrap()
                .with_minute(config.end_time.minute())
                .unwrap()
                .with_second(0)
                .unwrap()
                .with_nanosecond(0)
                .unwrap();

            let avail_mins_today = (end_of_day - cursor).num_minutes();
            let max_today_finishable = avail_mins_today + 59;
            if avail_mins_today < 60 && total_minutes > max_today_finishable {
                cursor = snap_to_work_window(end_of_day + Duration::minutes(1), &config);
            }
        }

        task.scheduled_start = Some(cursor.to_rfc3339());
        let deadline = advance_work_minutes(cursor, total_minutes, &config);
        task.scheduled_deadline = Some(deadline.to_rfc3339());

        // Advance cursor for next item
        cursor = deadline;
    }

    for container in containers.iter_mut() {
        let subtasks: Vec<&Task> = active_tasks
            .iter()
            .filter(|t| t.parent_ticket_id.as_deref() == Some(container.ticket_id.as_str()))
            .collect();
        // Same offset and format throughout, so RFC 3339 strings order chronologically.
        container.scheduled_start = subtasks.iter().filter_map(|t| t.scheduled_start.clone()).min();
        container.scheduled_deadline = subtasks.iter().filter_map(|t| t.scheduled_deadline.clone()).max();
    }
    active_tasks.append(&mut containers);

    // Merge scheduled active tasks with untouched completed/canceled tasks
    let active_map: std::collections::HashMap<String, Task> =
        active_tasks.into_iter().map(|t| (t.id.clone(), t)).collect();

    tasks
        .iter()
        .map(|t| {
            if let Some(scheduled) = active_map.get(&t.id) {
                scheduled.clone()
            } else {
                t.clone()
            }
        })
        .collect()
}

/// Simulates the impact of adding a candidate task or altering a task's priority on the entire schedule.
pub fn simulate_what_if_impact(
    current_tasks: &[Task],
    settings: &UserSettings,
    request: &WhatIfRequest,
) -> WhatIfResponse {
    let now = Utc::now();
    let config = WorkTimeConfig::from_settings(settings);

    // Compute baseline schedule
    let baseline_scheduled = calculate_schedule(current_tasks, settings, now);
    let baseline_map: std::collections::HashMap<String, Task> = baseline_scheduled
        .into_iter()
        .map(|t| (t.id.clone(), t))
        .collect();

    // Prepare simulated task list
    let mut simulated_tasks = current_tasks.to_vec();
    let candidate_id = "candidate-simulated-task-id";
    let buffer_ratio = request
        .candidate_buffer_ratio
        .unwrap_or(config.default_buffer_ratio);

    if let Some(ref existing_id) = request.existing_task_id {
        // Modifying existing task priority
        if let Some(task) = simulated_tasks.iter_mut().find(|t| &t.id == existing_id) {
            task.priority = request.candidate_priority.clone();
            task.estimated_hours = request.candidate_estimated_hours;
            task.buffer_ratio = buffer_ratio;
            if request.candidate_due_date.is_some() {
                task.due_date = request.candidate_due_date.clone();
            }
            if let Some(force) = request.candidate_force_start_today {
                task.force_start_today = force;
            }
        }
    } else {
        // Brand new candidate task
        let candidate_task = Task {
            id: candidate_id.to_string(),
            ticket_id: "SIM-CANDIDATE".to_string(),
            title: request.candidate_title.clone(),
            description: "What-If Candidate Task".to_string(),
            status: "todo".to_string(),
            priority: request.candidate_priority.clone(),
            priority_index: 0, // top of its priority tier
            estimated_hours: request.candidate_estimated_hours,
            buffer_ratio,
            scheduled_start: None,
            scheduled_deadline: None,
            due_date: request.candidate_due_date.clone(),
            completed_at: None,
            created_at: now.to_rfc3339(),
            updated_at: now.to_rfc3339(),
            force_start_today: request.candidate_force_start_today.unwrap_or(false),
            parent_ticket_id: None,
        };
        simulated_tasks.push(candidate_task);
    }

    // Calculate simulated schedule
    let simulated_scheduled = calculate_schedule(&simulated_tasks, settings, now);
    let simulated_map: std::collections::HashMap<String, Task> = simulated_scheduled
        .into_iter()
        .map(|t| (t.id.clone(), t))
        .collect();

    // Candidate stats
    let lookup_id = request
        .existing_task_id
        .as_deref()
        .unwrap_or(candidate_id);

    let (cand_start, cand_deadline) = if let Some(cand) = simulated_map.get(lookup_id) {
        (
            cand.scheduled_start
                .clone()
                .unwrap_or_else(|| now.to_rfc3339()),
            cand.scheduled_deadline
                .clone()
                .unwrap_or_else(|| now.to_rfc3339()),
        )
    } else {
        (now.to_rfc3339(), now.to_rfc3339())
    };

    let raw_minutes = request.candidate_estimated_hours * 60.0;
    let cand_effective_hours =
        (raw_minutes * (1.0 + buffer_ratio) + config.context_switch_minutes as f64) / 60.0;

    // Analyze impacts on all existing items
    let mut impacted_tasks = Vec::new();
    let mut tasks_delayed_count = 0;
    let mut total_delay_hours = 0.0;
    let mut critical_breaches = 0;

    for task in current_tasks {
        if task.status == "done" || task.status == "canceled" {
            continue;
        }
        if Some(&task.id) == request.existing_task_id.as_ref() {
            continue;
        }

        let orig = baseline_map.get(&task.id);
        let sim = simulated_map.get(&task.id);

        let orig_deadline_dt = orig
            .and_then(|t| t.scheduled_deadline.as_ref())
            .and_then(|s| DateTime::parse_from_rfc3339(s).ok())
            .map(|dt| dt.with_timezone(&Utc));

        let sim_deadline_dt = sim
            .and_then(|t| t.scheduled_deadline.as_ref())
            .and_then(|s| DateTime::parse_from_rfc3339(s).ok())
            .map(|dt| dt.with_timezone(&Utc));

        let mut delay_hours = 0.0;
        let mut delay_days = 0.0;
        let mut is_delayed = false;
        let mut breaches_hard_due_date = false;

        if let (Some(o_dt), Some(s_dt)) = (orig_deadline_dt, sim_deadline_dt) {
            let diff_mins = (s_dt - o_dt).num_minutes();
            if diff_mins > 5 {
                // Noticeable delay
                is_delayed = true;
                tasks_delayed_count += 1;
                // Convert work minutes to delay hours
                let daily_work_mins = config.daily_work_minutes();
                delay_hours = ((diff_mins as f64) / 60.0).max(0.1);
                delay_days = (delay_hours / (daily_work_mins as f64 / 60.0)).max(0.1);
                total_delay_hours += delay_hours;
            }

            // Check hard due date breach
            if let Some(ref hard_due_str) = task.due_date {
                if let Ok(hard_dt) = DateTime::parse_from_rfc3339(hard_due_str) {
                    let hard_utc = hard_dt.with_timezone(&Utc);
                    if s_dt > hard_utc && o_dt <= hard_utc {
                        breaches_hard_due_date = true;
                        critical_breaches += 1;
                    }
                }
            }
        }

        impacted_tasks.push(TaskImpact {
            task_id: task.id.clone(),
            ticket_id: task.ticket_id.clone(),
            title: task.title.clone(),
            priority: task.priority.clone(),
            original_deadline: orig.and_then(|t| t.scheduled_deadline.clone()),
            simulated_deadline: sim.and_then(|t| t.scheduled_deadline.clone()),
            delay_hours: (delay_hours * 10.0).round() / 10.0,
            delay_days: (delay_days * 10.0).round() / 10.0,
            is_delayed,
            hard_due_date: task.due_date.clone(),
            breaches_hard_due_date,
        });
    }

    // Sort impacted tasks so delayed & critical items show first
    impacted_tasks.sort_by(|a, b| {
        b.breaches_hard_due_date
            .cmp(&a.breaches_hard_due_date)
            .then_with(|| b.is_delayed.cmp(&a.is_delayed))
            .then_with(|| b.delay_hours.partial_cmp(&a.delay_hours).unwrap_or(std::cmp::Ordering::Equal))
    });

    let total_tasks_evaluated = impacted_tasks.len();

    WhatIfResponse {
        candidate_scheduled_start: cand_start,
        candidate_scheduled_deadline: cand_deadline,
        candidate_effective_hours: (cand_effective_hours * 10.0).round() / 10.0,
        impacted_tasks,
        summary: SimulationSummary {
            total_tasks_evaluated,
            tasks_delayed_count,
            total_delay_hours: (total_delay_hours * 10.0).round() / 10.0,
            critical_breaches,
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::TimeZone;

    #[test]
    fn test_working_hours_snapping() {
        let settings = UserSettings {
            work_start_time: "10:00".to_string(),
            work_end_time: "18:00".to_string(),
            work_days: "1,2,3,4,5".to_string(),
            default_buffer_ratio: 0.20,
            context_switch_minutes: 15,
            timezone_offset_minutes: 0,
            smart_rollover: true,
        };
        let config = WorkTimeConfig::from_settings(&settings);

        // Monday at 08:30 -> should snap to Monday 10:00
        let monday_early = Utc.with_ymd_and_hms(2026, 10, 19, 8, 30, 0).unwrap().with_timezone(&config.timezone_offset);
        let snapped = snap_to_work_window(monday_early, &config);
        assert_eq!(snapped.time(), NaiveTime::from_hms_opt(10, 0, 0).unwrap());
        assert_eq!(snapped.date_naive(), monday_early.date_naive());

        // Monday at 19:00 -> should advance to Tuesday 10:00
        let monday_late = Utc.with_ymd_and_hms(2026, 10, 19, 19, 0, 0).unwrap().with_timezone(&config.timezone_offset);
        let snapped_next = snap_to_work_window(monday_late, &config);
        assert_eq!(snapped_next.time(), NaiveTime::from_hms_opt(10, 0, 0).unwrap());
        assert_eq!(snapped_next.date_naive(), Utc.with_ymd_and_hms(2026, 10, 20, 10, 0, 0).unwrap().date_naive());
    }

    #[test]
    fn test_advance_work_minutes_across_days() {
        let settings = UserSettings::default();
        let config = WorkTimeConfig::from_settings(&settings);

        // Monday 16:00, add 4 hours (240 minutes) of work
        // Mon 16:00 to 18:00 = 2 hours spent. Remaining 2 hours resumes Tue 10:00 -> completes Tue 12:00!
        let monday_4pm = Utc.with_ymd_and_hms(2026, 10, 19, 16, 0, 0).unwrap().with_timezone(&config.timezone_offset);
        let completion = advance_work_minutes(monday_4pm, 240, &config);

        assert_eq!(completion.time(), NaiveTime::from_hms_opt(12, 0, 0).unwrap());
        assert_eq!(completion.date_naive(), Utc.with_ymd_and_hms(2026, 10, 20, 12, 0, 0).unwrap().date_naive());
    }

    #[test]
    fn test_smart_rollover_finish_today_if_under_1h() {
        let settings = UserSettings::default();
        let config = WorkTimeConfig::from_settings(&settings);

        // Monday 16:00, add 150 minutes (2.5 hours)
        // 16:00 to 18:00 = 120 minutes. Remaining 30 minutes (< 60m) finishes today at 18:30!
        let monday_4pm = Utc.with_ymd_and_hms(2026, 10, 19, 16, 0, 0).unwrap().with_timezone(&config.timezone_offset);
        let completion = advance_work_minutes(monday_4pm, 150, &config);

        assert_eq!(completion.time(), NaiveTime::from_hms_opt(18, 30, 0).unwrap());
        assert_eq!(completion.date_naive(), Utc.with_ymd_and_hms(2026, 10, 19, 18, 30, 0).unwrap().date_naive());
    }

    #[test]
    fn test_smart_rollover_postpone_and_force_start_override() {
        let settings = UserSettings {
            work_start_time: "10:00".to_string(),
            work_end_time: "18:00".to_string(),
            work_days: "1,2,3,4,5".to_string(),
            default_buffer_ratio: 0.0,
            context_switch_minutes: 0,
            timezone_offset_minutes: 0,
            smart_rollover: true,
        };

        // Anchor at 17:45 Monday (15 mins left in workday)
        let monday_evening = Utc.with_ymd_and_hms(2026, 10, 19, 17, 45, 0).unwrap();

        // Task 1: 3 hours, force_start_today = false -> should postpone to Tuesday 10:00
        let postponed_task = Task {
            id: "t1".to_string(),
            ticket_id: "TEM-1".to_string(),
            title: "Long Task".to_string(),
            description: "".to_string(),
            status: "todo".to_string(),
            priority: "high".to_string(),
            priority_index: 1,
            estimated_hours: 3.0,
            buffer_ratio: 0.0,
            scheduled_start: None,
            scheduled_deadline: None,
            due_date: None,
            completed_at: None,
            created_at: monday_evening.to_rfc3339(),
            updated_at: monday_evening.to_rfc3339(),
            force_start_today: false,
            parent_ticket_id: None,
        };

        let sched = calculate_schedule(&[postponed_task], &settings, monday_evening);
        let start_dt = DateTime::parse_from_rfc3339(sched[0].scheduled_start.as_ref().unwrap()).unwrap();
        assert_eq!(start_dt.date_naive(), Utc.with_ymd_and_hms(2026, 10, 20, 10, 0, 0).unwrap().date_naive());
        assert_eq!(start_dt.time(), NaiveTime::from_hms_opt(10, 0, 0).unwrap());

        // Task 2: 3 hours, force_start_today = true -> should start Monday 17:45!
        let forced_task = Task {
            id: "t2".to_string(),
            ticket_id: "TEM-2".to_string(),
            title: "Forced Task".to_string(),
            description: "".to_string(),
            status: "todo".to_string(),
            priority: "high".to_string(),
            priority_index: 1,
            estimated_hours: 3.0,
            buffer_ratio: 0.0,
            scheduled_start: None,
            scheduled_deadline: None,
            due_date: None,
            completed_at: None,
            created_at: monday_evening.to_rfc3339(),
            updated_at: monday_evening.to_rfc3339(),
            force_start_today: true,
            parent_ticket_id: None,
        };

        let sched_forced = calculate_schedule(&[forced_task], &settings, monday_evening);
        let forced_start = DateTime::parse_from_rfc3339(sched_forced[0].scheduled_start.as_ref().unwrap()).unwrap();
        assert_eq!(forced_start.date_naive(), Utc.with_ymd_and_hms(2026, 10, 19, 17, 45, 0).unwrap().date_naive());
        assert_eq!(forced_start.time(), NaiveTime::from_hms_opt(17, 45, 0).unwrap());
    }

    #[test]
    fn test_timezone_offset_scheduling() {
        let settings = UserSettings {
            work_start_time: "10:00".to_string(),
            work_end_time: "18:00".to_string(),
            work_days: "1,2,3,4,5".to_string(),
            default_buffer_ratio: 0.20,
            context_switch_minutes: 15,
            timezone_offset_minutes: 330, // IST (+5:30)
            smart_rollover: true,
        };
        let config = WorkTimeConfig::from_settings(&settings);

        // When it is 1:30 AM IST (20:00 UTC previous day), before work hours
        let sunday_utc = Utc.with_ymd_and_hms(2026, 10, 18, 20, 0, 0).unwrap();
        let local_anchor = sunday_utc.with_timezone(&config.timezone_offset);
        assert_eq!(local_anchor.weekday().number_from_monday(), 1);
        assert_eq!(local_anchor.hour(), 1);
        assert_eq!(local_anchor.minute(), 30);

        let snapped = snap_to_work_window(local_anchor, &config);
        assert_eq!(snapped.time(), NaiveTime::from_hms_opt(10, 0, 0).unwrap());
        assert_eq!(snapped.date_naive(), local_anchor.date_naive());
    }

    #[test]
    fn test_what_if_simulation_delays() {
        let settings = UserSettings::default();
        let now = Utc.with_ymd_and_hms(2026, 10, 19, 10, 0, 0).unwrap();

        let tasks = vec![
            Task {
                id: "t1".to_string(),
                ticket_id: "TEM-1".to_string(),
                title: "Existing High Task".to_string(),
                description: "".to_string(),
                status: "todo".to_string(),
                priority: "high".to_string(),
                priority_index: 1,
                estimated_hours: 4.0,
                buffer_ratio: 0.20,
                scheduled_start: None,
                scheduled_deadline: None,
                due_date: None,
                completed_at: None,
                created_at: now.to_rfc3339(),
                updated_at: now.to_rfc3339(),
                force_start_today: false,
                parent_ticket_id: None,
            }
        ];

        let req = WhatIfRequest {
            candidate_title: "Urgent Hotfix".to_string(),
            candidate_estimated_hours: 3.0,
            candidate_priority: "urgent".to_string(),
            candidate_buffer_ratio: Some(0.20),
            candidate_due_date: None,
            existing_task_id: None,
            candidate_force_start_today: None,
        };

        let response = simulate_what_if_impact(&tasks, &settings, &req);
        assert_eq!(response.summary.tasks_delayed_count, 1);
        assert!(response.summary.total_delay_hours > 0.0);
        assert_eq!(response.impacted_tasks[0].task_id, "t1");
        assert!(response.impacted_tasks[0].is_delayed);
    }

    #[test]
    fn test_parent_spans_its_subtasks_instead_of_adding_effort() {
        let settings = UserSettings { default_buffer_ratio: 0.0, context_switch_minutes: 0, ..UserSettings::default() };
        let monday_10am = Utc.with_ymd_and_hms(2026, 10, 19, 10, 0, 0).unwrap();
        let task = |ticket: &str, hours: f64, idx: i32, parent: Option<&str>| Task {
            id: ticket.to_string(),
            ticket_id: ticket.to_string(),
            title: ticket.to_string(),
            description: "".to_string(),
            status: "todo".to_string(),
            priority: "medium".to_string(),
            priority_index: idx,
            estimated_hours: hours,
            buffer_ratio: 0.0,
            scheduled_start: None,
            scheduled_deadline: None,
            due_date: None,
            completed_at: None,
            created_at: monday_10am.to_rfc3339(),
            updated_at: monday_10am.to_rfc3339(),
            force_start_today: false,
            parent_ticket_id: parent.map(str::to_string),
        };
        let tasks = vec![
            task("TEM-1", 8.0, 1, None),
            task("TEM-2", 1.0, 2, Some("TEM-1")),
            task("TEM-3", 2.0, 3, Some("TEM-1")),
            task("TEM-4", 1.0, 4, None),
        ];

        let sched = calculate_schedule(&tasks, &settings, monday_10am);
        let time = |id: &str, deadline: bool| {
            let t = sched.iter().find(|t| t.ticket_id == id).unwrap();
            let s = if deadline { &t.scheduled_deadline } else { &t.scheduled_start };
            DateTime::parse_from_rfc3339(s.as_ref().unwrap()).unwrap().time()
        };
        let at = |h| NaiveTime::from_hms_opt(h, 0, 0).unwrap();

        assert_eq!((time("TEM-1", false), time("TEM-1", true)), (at(10), at(13)));
        assert_eq!((time("TEM-3", false), time("TEM-3", true)), (at(11), at(13)));
        // the parent's own 8h is not booked, so the next ticket starts right after the subtasks
        assert_eq!((time("TEM-4", false), time("TEM-4", true)), (at(13), at(14)));
    }
}
