use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager, State};

mod db;
mod models;
mod scheduler;

use db::{DbState, create_task as db_create_task, delete_task as db_delete_task, get_all_tasks, get_settings as db_get_settings, update_settings as db_update_settings, update_task as db_update_task, update_task_schedule};
use models::{CreateTaskInput, Task, UpdateTaskInput, UserSettings, WhatIfRequest, WhatIfResponse};
use scheduler::{calculate_schedule, simulate_what_if_impact};
use chrono::Utc;

fn get_db_path(app: &AppHandle) -> PathBuf {
    if let Ok(mut dir) = app.path().app_data_dir() {
        let _ = fs::create_dir_all(&dir);
        dir.push("tempo.db");
        return dir;
    }
    PathBuf::from("tempo.db")
}

fn sync_recalculate_all(db_state: &DbState) -> Result<Vec<Task>, String> {
    let conn = db_state.conn.lock().map_err(|e| e.to_string())?;
    let settings = db_get_settings(&conn).map_err(|e| e.to_string())?;
    if !settings.smart_rollover {
        let _ = conn.execute("UPDATE tasks SET force_start_today = 0", []);
    }
    let raw_tasks = get_all_tasks(&conn).map_err(|e| e.to_string())?;
    let scheduled = calculate_schedule(&raw_tasks, &settings, Utc::now());

    // Update scheduled deadlines in SQLite
    for task in &scheduled {
        let _ = update_task_schedule(
            &conn,
            &task.id,
            task.scheduled_start.as_deref(),
            task.scheduled_deadline.as_deref(),
        );
    }

    Ok(scheduled)
}

#[tauri::command]
fn get_tasks(db_state: State<'_, DbState>) -> Result<Vec<Task>, String> {
    sync_recalculate_all(&db_state)
}

#[tauri::command]
fn create_task(db_state: State<'_, DbState>, input: CreateTaskInput) -> Result<Task, String> {
    {
        let conn = db_state.conn.lock().map_err(|e| e.to_string())?;
        db_create_task(&conn, input).map_err(|e| e.to_string())?;
    }
    let all = sync_recalculate_all(&db_state)?;
    all.into_iter()
        .last()
        .ok_or_else(|| "Failed to retrieve created task".to_string())
}

#[tauri::command]
fn update_task(db_state: State<'_, DbState>, input: UpdateTaskInput) -> Result<Task, String> {
    let updated_id = input.id.clone();
    {
        let conn = db_state.conn.lock().map_err(|e| e.to_string())?;
        db_update_task(&conn, input).map_err(|e| e.to_string())?;
    }
    let all = sync_recalculate_all(&db_state)?;
    all.into_iter()
        .find(|t| t.id == updated_id)
        .ok_or_else(|| "Failed to find updated task".to_string())
}

#[tauri::command]
fn delete_task(db_state: State<'_, DbState>, id: String) -> Result<(), String> {
    {
        let conn = db_state.conn.lock().map_err(|e| e.to_string())?;
        db_delete_task(&conn, &id).map_err(|e| e.to_string())?;
    }
    let _ = sync_recalculate_all(&db_state)?;
    Ok(())
}

#[tauri::command]
fn get_settings(db_state: State<'_, DbState>) -> Result<UserSettings, String> {
    let conn = db_state.conn.lock().map_err(|e| e.to_string())?;
    db_get_settings(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
fn update_settings(db_state: State<'_, DbState>, settings: UserSettings) -> Result<Vec<Task>, String> {
    {
        let conn = db_state.conn.lock().map_err(|e| e.to_string())?;
        db_update_settings(&conn, &settings).map_err(|e| e.to_string())?;
    }
    sync_recalculate_all(&db_state)
}

#[tauri::command]
fn recalculate_schedule(db_state: State<'_, DbState>) -> Result<Vec<Task>, String> {
    sync_recalculate_all(&db_state)
}

#[tauri::command]
fn simulate_impact(db_state: State<'_, DbState>, request: WhatIfRequest) -> Result<WhatIfResponse, String> {
    let conn = db_state.conn.lock().map_err(|e| e.to_string())?;
    let raw_tasks = get_all_tasks(&conn).map_err(|e| e.to_string())?;
    let settings = db_get_settings(&conn).map_err(|e| e.to_string())?;
    Ok(simulate_what_if_impact(&raw_tasks, &settings, &request))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let db_path = get_db_path(app.handle());
            let db = DbState::new(db_path).expect("Failed to initialize SQLite database");
            // Perform initial schedule recalculation
            let _ = sync_recalculate_all(&db);
            app.manage(db);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_tasks,
            create_task,
            update_task,
            delete_task,
            get_settings,
            update_settings,
            recalculate_schedule,
            simulate_impact
        ])
        .run(tauri::generate_context!())
        .expect("error while running tempo application");
}
