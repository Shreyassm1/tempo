//! tempo-mcp: an MCP server (stdio) that lets AI agents add and update Tempo tickets.
//! Writes to the same SQLite file as the desktop app, which picks changes up when its window regains focus.

use chrono::{DateTime, Utc};
use rusqlite::Connection;
use serde_json::{json, Value};
use std::io::{BufRead, Write};
use std::path::PathBuf;
use tempo_lib::db::{self, DbState};
use tempo_lib::models::{CreateTaskInput, Task, UpdateTaskInput};
use tempo_lib::scheduler::calculate_schedule;

const PRIORITIES: [&str; 4] = ["urgent", "high", "medium", "low"];
const STATUSES: [&str; 5] = ["backlog", "todo", "in_progress", "done", "canceled"];

fn db_path() -> PathBuf {
    if let Some(p) = std::env::var_os("TEMPO_DB") {
        return p.into();
    }
    let home = || PathBuf::from(std::env::var_os("HOME").unwrap_or_default());
    // Mirrors Tauri's app_data_dir() for the "app.tempo.taskmanager" identifier.
    let base = if cfg!(target_os = "macos") {
        home().join("Library/Application Support")
    } else if cfg!(windows) {
        PathBuf::from(std::env::var_os("APPDATA").unwrap_or_default())
    } else {
        std::env::var_os("XDG_DATA_HOME").map(PathBuf::from).unwrap_or_else(|| home().join(".local/share"))
    };
    let dir = base.join("app.tempo.taskmanager");
    let _ = std::fs::create_dir_all(&dir);
    dir.join("tempo.db")
}

fn tools() -> Value {
    json!([
        {
            "name": "tempo_list",
            "description": "List Tempo tickets with their status, priority, estimate and scheduled deadline. Subtasks are indented under their parent.",
            "inputSchema": {
                "type": "object",
                "properties": { "include_closed": { "type": "boolean", "description": "Also show done and canceled tickets." } }
            }
        },
        {
            "name": "tempo_add",
            "description": "Create a Tempo ticket, or a subtask when parent is given. Returns the new ticket number, e.g. TEM-112.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "title": { "type": "string" },
                    "description": { "type": "string", "description": "One or two lines." },
                    "priority": { "type": "string", "enum": PRIORITIES, "default": "medium" },
                    "hours": { "type": "number", "exclusiveMinimum": 0, "default": 1, "description": "Real working time for the user, including review." },
                    "parent": { "type": "string", "description": "Parent ticket number, e.g. TEM-112. Only when the user asked for subtasks; one level deep." },
                    "status": { "type": "string", "enum": &STATUSES[..3], "default": "todo" }
                },
                "required": ["title"]
            }
        },
        {
            "name": "tempo_set_status",
            "description": "Change a Tempo ticket's status.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "ticket": { "type": "string", "description": "Ticket number, e.g. TEM-113." },
                    "status": { "type": "string", "enum": STATUSES }
                },
                "required": ["ticket", "status"]
            }
        }
    ])
}

fn one_of(value: &str, allowed: &[&str], what: &str) -> Result<(), String> {
    if allowed.contains(&value) {
        Ok(())
    } else {
        Err(format!("{what} must be one of {}, got '{value}'", allowed.join("|")))
    }
}

fn call_tool(conn: &Connection, name: &str, args: &Value) -> Result<String, String> {
    let str_arg = |key: &str| args.get(key).and_then(Value::as_str).map(str::to_string);
    match name {
        "tempo_add" => {
            let title = str_arg("title").filter(|t| !t.trim().is_empty()).ok_or("title is required")?;
            let priority = str_arg("priority").unwrap_or_else(|| "medium".into());
            one_of(&priority, &PRIORITIES, "priority")?;
            let status = str_arg("status");
            if let Some(s) = &status {
                one_of(s, &STATUSES[..3], "status")?;
            }
            let hours = match args.get("hours") {
                Some(h) => h.as_f64().filter(|h| *h > 0.0).ok_or(format!("hours must be a positive number, got {h}"))?,
                None => 1.0,
            };
            let parent = str_arg("parent");
            if let Some(p) = &parent {
                let grandparent: Option<String> = conn
                    .query_row("SELECT parent_ticket_id FROM tasks WHERE ticket_id = ?1", [p], |r| r.get(0))
                    .map_err(|_| format!("no ticket {p}"))?;
                if let Some(g) = grandparent {
                    return Err(format!("{p} is a subtask of {g}; subtasks only go one level deep, use parent {g}"));
                }
            }
            let task = db::create_task(
                conn,
                CreateTaskInput {
                    title,
                    description: str_arg("description"),
                    priority,
                    estimated_hours: hours,
                    buffer_ratio: None,
                    due_date: None,
                    status,
                    force_start_today: None,
                    parent_ticket_id: parent,
                },
            )
            .map_err(|e| e.to_string())?;
            Ok(task.ticket_id)
        }
        "tempo_set_status" => {
            let ticket = str_arg("ticket").ok_or("ticket is required")?;
            let status = str_arg("status").ok_or("status is required")?;
            one_of(&status, &STATUSES, "status")?;
            let id: String = conn
                .query_row("SELECT id FROM tasks WHERE ticket_id = ?1", [&ticket], |r| r.get(0))
                .map_err(|_| format!("no ticket {ticket}"))?;
            db::update_task(
                conn,
                UpdateTaskInput {
                    id,
                    title: None,
                    description: None,
                    status: Some(status.clone()),
                    priority: None,
                    priority_index: None,
                    estimated_hours: None,
                    buffer_ratio: None,
                    due_date: None,
                    force_start_today: None,
                },
            )
            .map_err(|e| e.to_string())?;
            Ok(format!("{ticket} -> {status}"))
        }
        "tempo_list" => {
            let show_all = args.get("include_closed").and_then(Value::as_bool).unwrap_or(false);
            let settings = db::get_settings(conn).map_err(|e| e.to_string())?;
            let tasks = calculate_schedule(&db::get_all_tasks(conn).map_err(|e| e.to_string())?, &settings, Utc::now());
            let shown: Vec<&Task> = tasks.iter().filter(|t| show_all || !["done", "canceled"].contains(&t.status.as_str())).collect();
            let line = |t: &Task, indent: &str| {
                let deadline = t
                    .scheduled_deadline
                    .as_deref()
                    .and_then(|d| DateTime::parse_from_rfc3339(d).ok())
                    .map(|d| format!("due {}", d.format("%a %d %b %H:%M")))
                    .unwrap_or_default();
                format!("{indent}{:<8} {:<11} {:<6} {:>4}h  {:<20} {}\n", t.ticket_id, t.status, t.priority, t.estimated_hours, deadline, t.title)
            };
            let is_shown = |ticket: &str| shown.iter().any(|t| t.ticket_id == ticket);
            let mut out = String::new();
            // Top-level tickets (and subtasks whose parent is hidden), each followed by its subtasks.
            for t in shown.iter().filter(|t| !t.parent_ticket_id.as_deref().is_some_and(is_shown)) {
                out += &line(t, "");
                for sub in shown.iter().filter(|s| s.parent_ticket_id.as_deref() == Some(t.ticket_id.as_str())) {
                    out += &line(sub, "  ↳ ");
                }
            }
            Ok(if out.is_empty() { "No open tickets.".into() } else { out })
        }
        _ => Err(format!("unknown tool {name}")),
    }
}

fn handle(db: &DbState, method: &str, params: &Value) -> Result<Value, (i64, String)> {
    match method {
        // The protocol surface used here is the same across MCP versions, so accept whichever the client speaks.
        "initialize" => Ok(json!({
            "protocolVersion": params.get("protocolVersion").cloned().unwrap_or(json!("2025-06-18")),
            "capabilities": { "tools": {} },
            "serverInfo": { "name": "tempo", "version": env!("CARGO_PKG_VERSION") },
            "instructions": include_str!("../../../TEMPO_AGENT.md"),
        })),
        "ping" => Ok(json!({})),
        "tools/list" => Ok(json!({ "tools": tools() })),
        "tools/call" => {
            let name = params.get("name").and_then(Value::as_str).unwrap_or_default();
            let args = params.get("arguments").cloned().unwrap_or(json!({}));
            let conn = db.conn.lock().map_err(|e| (-32603, e.to_string()))?;
            let (text, is_error) = match call_tool(&conn, name, &args) {
                Ok(text) => (text, false),
                Err(e) => (e, true),
            };
            Ok(json!({ "content": [{ "type": "text", "text": text }], "isError": is_error }))
        }
        _ => Err((-32601, format!("method not found: {method}"))),
    }
}

fn main() {
    let db = DbState::new(db_path()).unwrap_or_else(|e| {
        eprintln!("tempo-mcp: can't open the Tempo database: {e}");
        std::process::exit(1);
    });
    let mut out = std::io::stdout().lock();
    for line in std::io::stdin().lock().lines() {
        let Ok(line) = line else { break };
        let Ok(msg) = serde_json::from_str::<Value>(&line) else {
            let _ = writeln!(out, "{}", json!({ "jsonrpc": "2.0", "id": null, "error": { "code": -32700, "message": "parse error" } }));
            continue;
        };
        // Notifications (no id) need no reply.
        let Some(id) = msg.get("id").cloned() else { continue };
        let method = msg.get("method").and_then(Value::as_str).unwrap_or_default();
        let reply = match handle(&db, method, msg.get("params").unwrap_or(&Value::Null)) {
            Ok(result) => json!({ "jsonrpc": "2.0", "id": id, "result": result }),
            Err((code, message)) => json!({ "jsonrpc": "2.0", "id": id, "error": { "code": code, "message": message } }),
        };
        let _ = writeln!(out, "{reply}");
        let _ = out.flush();
    }
}
