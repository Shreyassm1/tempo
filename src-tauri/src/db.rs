use rusqlite::{params, Connection, Result};
use std::path::PathBuf;
use std::sync::Mutex;
use uuid::Uuid;
use chrono::Utc;

use crate::models::{CreateTaskInput, Task, UpdateTaskInput, UserSettings};

pub struct DbState {
    pub conn: Mutex<Connection>,
}

impl DbState {
    pub fn new(db_path: PathBuf) -> Result<Self> {
        let conn = Connection::open(db_path)?;
        // The app and tempo-cli (used by AI agents) share this file, so wait out each other's writes.
        conn.busy_timeout(std::time::Duration::from_secs(5))?;
        conn.execute_batch("PRAGMA foreign_keys = ON")?;
        init_db(&conn)?;
        Ok(Self {
            conn: Mutex::new(conn),
        })
    }
}

fn init_db(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS settings (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            work_start_time TEXT NOT NULL DEFAULT '10:00',
            work_end_time TEXT NOT NULL DEFAULT '18:00',
            work_days TEXT NOT NULL DEFAULT '1,2,3,4,5',
            default_buffer_ratio REAL NOT NULL DEFAULT 0.20,
            context_switch_minutes INTEGER NOT NULL DEFAULT 15,
            timezone_offset_minutes INTEGER NOT NULL DEFAULT 0,
            smart_rollover INTEGER NOT NULL DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY,
            ticket_id TEXT UNIQUE NOT NULL,
            title TEXT NOT NULL,
            description TEXT NOT NULL DEFAULT '',
            status TEXT NOT NULL DEFAULT 'todo',
            priority TEXT NOT NULL DEFAULT 'medium',
            priority_index INTEGER NOT NULL DEFAULT 1,
            estimated_hours REAL NOT NULL DEFAULT 1.0,
            buffer_ratio REAL NOT NULL DEFAULT 0.20,
            scheduled_start TEXT,
            scheduled_deadline TEXT,
            due_date TEXT,
            completed_at TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            force_start_today INTEGER NOT NULL DEFAULT 0
        );
        "
    )?;

    // Migrations in case tables exist from prior runs
    let _ = conn.execute("ALTER TABLE settings ADD COLUMN smart_rollover INTEGER NOT NULL DEFAULT 1", []);
    let _ = conn.execute("ALTER TABLE tasks ADD COLUMN force_start_today INTEGER NOT NULL DEFAULT 0", []);
    let _ = conn.execute("ALTER TABLE tasks ADD COLUMN parent_ticket_id TEXT REFERENCES tasks(ticket_id) ON DELETE SET NULL", []);
    let _ = conn.execute("ALTER TABLE settings ADD COLUMN last_ticket_num INTEGER NOT NULL DEFAULT 100", []);

    // Seed default settings if not exists
    let settings_count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM settings WHERE id = 1",
        [],
        |row| row.get(0),
    )?;

    if settings_count == 0 {
        conn.execute(
            "INSERT INTO settings (id, work_start_time, work_end_time, work_days, default_buffer_ratio, context_switch_minutes, timezone_offset_minutes, smart_rollover)
             VALUES (1, '10:00', '18:00', '1,2,3,4,5', 0.20, 15, 0, 1)",
            [],
        )?;
    }

    Ok(())
}

pub fn get_all_tasks(conn: &Connection) -> Result<Vec<Task>> {
    let mut stmt = conn.prepare(
        "SELECT id, ticket_id, title, description, status, priority, priority_index, estimated_hours, buffer_ratio, scheduled_start, scheduled_deadline, due_date, completed_at, created_at, updated_at, force_start_today, parent_ticket_id
         FROM tasks ORDER BY 
            CASE status 
                WHEN 'in_progress' THEN 1 
                WHEN 'todo' THEN 2 
                WHEN 'backlog' THEN 3 
                WHEN 'done' THEN 4 
                ELSE 5 
            END,
            CASE priority 
                WHEN 'urgent' THEN 1 
                WHEN 'high' THEN 2 
                WHEN 'medium' THEN 3 
                WHEN 'low' THEN 4 
                ELSE 5 
            END,
            priority_index ASC,
            created_at ASC"
    )?;

    let task_iter = stmt.query_map([], |row| {
        Ok(Task {
            id: row.get(0)?,
            ticket_id: row.get(1)?,
            title: row.get(2)?,
            description: row.get(3)?,
            status: row.get(4)?,
            priority: row.get(5)?,
            priority_index: row.get(6)?,
            estimated_hours: row.get(7)?,
            buffer_ratio: row.get(8)?,
            scheduled_start: row.get(9)?,
            scheduled_deadline: row.get(10)?,
            due_date: row.get(11)?,
            completed_at: row.get(12)?,
            created_at: row.get(13)?,
            updated_at: row.get(14)?,
            force_start_today: row.get::<_, i32>(15).unwrap_or(0) == 1,
            parent_ticket_id: row.get(16)?,
        })
    })?;

    let mut tasks = Vec::new();
    for task in task_iter {
        tasks.push(task?);
    }
    Ok(tasks)
}

pub fn get_settings(conn: &Connection) -> Result<UserSettings> {
    conn.query_row(
        "SELECT work_start_time, work_end_time, work_days, default_buffer_ratio, context_switch_minutes, timezone_offset_minutes, smart_rollover
         FROM settings WHERE id = 1",
        [],
        |row| {
            Ok(UserSettings {
                work_start_time: row.get(0)?,
                work_end_time: row.get(1)?,
                work_days: row.get(2)?,
                default_buffer_ratio: row.get(3)?,
                context_switch_minutes: row.get(4)?,
                timezone_offset_minutes: row.get(5)?,
                smart_rollover: row.get::<_, i32>(6).unwrap_or(1) == 1,
            })
        },
    )
}

pub fn update_settings(conn: &Connection, settings: &UserSettings) -> Result<()> {
    conn.execute(
        "UPDATE settings SET 
            work_start_time = ?1, 
            work_end_time = ?2, 
            work_days = ?3, 
            default_buffer_ratio = ?4, 
            context_switch_minutes = ?5, 
            timezone_offset_minutes = ?6,
            smart_rollover = ?7
         WHERE id = 1",
        params![
            settings.work_start_time,
            settings.work_end_time,
            settings.work_days,
            settings.default_buffer_ratio,
            settings.context_switch_minutes,
            settings.timezone_offset_minutes,
            if settings.smart_rollover { 1 } else { 0 },
        ],
    )?;
    if !settings.smart_rollover {
        let _ = conn.execute("UPDATE tasks SET force_start_today = 0", []);
    }
    Ok(())
}

fn next_ticket_id(conn: &Connection) -> Result<String> {
    // Persistent counter so deleting the newest task never frees its number for reuse.
    // MAX against existing tickets covers databases created before the counter existed.
    let next_num: i64 = conn.query_row(
        "UPDATE settings SET last_ticket_num = MAX(last_ticket_num,
            (SELECT COALESCE(MAX(CAST(SUBSTR(ticket_id, 5) AS INTEGER)), 100) FROM tasks WHERE ticket_id LIKE 'TEM-%')) + 1
         WHERE id = 1 RETURNING last_ticket_num",
        [],
        |row| row.get(0),
    )?;

    Ok(format!("TEM-{}", next_num))
}

pub fn create_task(conn: &Connection, input: CreateTaskInput) -> Result<Task> {
    let id = Uuid::new_v4().to_string();
    let ticket_id = next_ticket_id(conn)?;
    let now = Utc::now().to_rfc3339();
    let status = input.status.unwrap_or_else(|| "todo".to_string());
    let buffer_ratio = input.buffer_ratio.unwrap_or(0.20);
    let desc = input.description.unwrap_or_default();

    // Default priority index: calculate max + 1
    let max_index: i32 = conn.query_row(
        "SELECT COALESCE(MAX(priority_index), 0) FROM tasks",
        [],
        |row| row.get(0),
    ).unwrap_or(0);

    conn.execute(
        "INSERT INTO tasks (id, ticket_id, title, description, status, priority, priority_index, estimated_hours, buffer_ratio, due_date, created_at, updated_at, force_start_today, parent_ticket_id)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)",
        params![
            id,
            ticket_id,
            input.title,
            desc,
            status,
            input.priority,
            max_index + 1,
            input.estimated_hours,
            buffer_ratio,
            input.due_date,
            now,
            now,
            if input.force_start_today.unwrap_or(false) { 1 } else { 0 },
            input.parent_ticket_id,
        ],
    )?;

    get_task_by_id(conn, &id)
}

pub fn get_task_by_id(conn: &Connection, id: &str) -> Result<Task> {
    conn.query_row(
        "SELECT id, ticket_id, title, description, status, priority, priority_index, estimated_hours, buffer_ratio, scheduled_start, scheduled_deadline, due_date, completed_at, created_at, updated_at, force_start_today, parent_ticket_id
         FROM tasks WHERE id = ?1",
        params![id],
        |row| {
            Ok(Task {
                id: row.get(0)?,
                ticket_id: row.get(1)?,
                title: row.get(2)?,
                description: row.get(3)?,
                status: row.get(4)?,
                priority: row.get(5)?,
                priority_index: row.get(6)?,
                estimated_hours: row.get(7)?,
                buffer_ratio: row.get(8)?,
                scheduled_start: row.get(9)?,
                scheduled_deadline: row.get(10)?,
                due_date: row.get(11)?,
                completed_at: row.get(12)?,
                created_at: row.get(13)?,
                updated_at: row.get(14)?,
                force_start_today: row.get::<_, i32>(15).unwrap_or(0) == 1,
                parent_ticket_id: row.get(16)?,
            })
        },
    )
}

pub fn update_task(conn: &Connection, input: UpdateTaskInput) -> Result<Task> {
    let now = Utc::now().to_rfc3339();
    let current = get_task_by_id(conn, &input.id)?;

    let title = input.title.unwrap_or(current.title);
    let desc = input.description.unwrap_or(current.description);
    let status = input.status.unwrap_or(current.status);
    let priority = input.priority.unwrap_or(current.priority);
    let priority_index = input.priority_index.unwrap_or(current.priority_index);
    let est_hours = input.estimated_hours.unwrap_or(current.estimated_hours);
    let buffer = input.buffer_ratio.unwrap_or(current.buffer_ratio);
    let due_date = match input.due_date {
        Some(ref s) if s.trim().is_empty() => None,
        Some(s) => Some(s),
        None => current.due_date,
    };
    let force_start = input.force_start_today.unwrap_or(current.force_start_today);

    let completed_at = if status == "done" && current.completed_at.is_none() {
        Some(now.clone())
    } else if status != "done" {
        None
    } else {
        current.completed_at
    };

    conn.execute(
        "UPDATE tasks SET
            title = ?1,
            description = ?2,
            status = ?3,
            priority = ?4,
            priority_index = ?5,
            estimated_hours = ?6,
            buffer_ratio = ?7,
            due_date = ?8,
            completed_at = ?9,
            updated_at = ?10,
            force_start_today = ?11
         WHERE id = ?12",
        params![
            title,
            desc,
            status,
            priority,
            priority_index,
            est_hours,
            buffer,
            due_date,
            completed_at,
            now,
            if force_start { 1 } else { 0 },
            input.id
        ],
    )?;

    get_task_by_id(conn, &input.id)
}

pub fn delete_task(conn: &Connection, id: &str) -> Result<()> {
    conn.execute("DELETE FROM tasks WHERE id = ?1", params![id])?;
    Ok(())
}

pub fn update_task_schedule(
    conn: &Connection,
    id: &str,
    start: Option<&str>,
    deadline: Option<&str>,
) -> Result<()> {
    conn.execute(
        "UPDATE tasks SET scheduled_start = ?1, scheduled_deadline = ?2 WHERE id = ?3",
        params![start, deadline, id],
    )?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn input(title: &str) -> CreateTaskInput {
        CreateTaskInput { title: title.into(), description: None, priority: "medium".into(), estimated_hours: 1.0,
            buffer_ratio: None, due_date: None, status: None, force_start_today: None, parent_ticket_id: None }
    }

    #[test]
    fn ticket_numbers_are_never_reused() {
        let conn = Connection::open_in_memory().unwrap();
        init_db(&conn).unwrap();
        create_task(&conn, input("a")).unwrap();
        let b = create_task(&conn, input("b")).unwrap();
        assert_eq!(b.ticket_id, "TEM-102");
        delete_task(&conn, &b.id).unwrap();
        assert_eq!(create_task(&conn, input("c")).unwrap().ticket_id, "TEM-103");
    }
}
