# Tempo

> Deterministic, calendar-aware task planner and personal execution scheduler.

Tempo turns tasks into realistic delivery timelines. Unlike conventional agile boards that treat deadlines as wishful thinking, Tempo computes deterministic completion dates mapped against real working hours, customizable buffer ratios, and context-switching penalties—alerting you the moment a commitment becomes mathematically impossible.

---

## Key Features

- **Deterministic Calendar Engine**: Schedules work sequentially based on configured working hours (e.g. 10:00–18:00), active workdays, and timezone offsets.
- **Buffer & Context Friction Multipliers**: Automatically calculates safety buffers (e.g. +20%) and context-switching penalties (e.g. 15m) between tasks.
- **Visual Breach Detection**: Proactively flags when projected completion (`scheduled_deadline`) will exceed a hard due date (`due_date`).
- **What-If Scenario Simulator**: Test the downstream schedule impact of inserting or reprioritizing candidate tasks before accepting commitments.
- **Multi-View Workspace**:
  - **Board**: Intuitive drag-and-drop Kanban workflow.
  - **List**: High-density tabular tracking with inline editing.
  - **Timeline**: Visual Gantt projection over real working hours.
  - **Simulator**: Real-time scenario impact analysis.
- **Keyboard-First Navigation**:
  - `C`: Create task
  - `1` / `2` / `3` / `4`: Switch between Board, List, Timeline, Simulator
  - `Cmd/Ctrl + ,`: Open settings
  - `Cmd/Ctrl + R`: Recalculate schedule
  - `Esc`: Close open modal
- **AI Agent Integration (`tempo-mcp`)**: Native Model Context Protocol (MCP) server allowing AI assistants (Claude, Gemini, Cursor, Codex, OpenCode) to read and manage Tempo tickets directly.

---

## AI Agent Integration (MCP)

`tempo-mcp` is an MCP server written in Rust that exposes Tempo's SQLite database directly to AI coding agents.

### Installation

```bash
cargo install --path src-tauri --bin tempo-mcp
```

### Agent Configuration

- **Claude Desktop / Claude CLI**:
  ```bash
  claude mcp add tempo -s user -- ~/.cargo/bin/tempo-mcp
  ```
- **Gemini (`~/.gemini/settings.json`)**:
  ```json
  {
    "mcpServers": {
      "tempo": {
        "command": "tempo-mcp"
      }
    }
  }
  ```
- **Codex (`~/.codex/config.toml`)**:
  ```toml
  [mcp_servers.tempo]
  command = "tempo-mcp"
  ```
- **OpenCode (`opencode.jsonc`)**:
  ```jsonc
  {
    "mcp": {
      "tempo": {
        "command": "tempo-mcp"
      }
    }
  }
  ```

See [`TEMPO_AGENT.md`](TEMPO_AGENT.md) for agent interaction rules and prompt templates.

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, date-fns
- **Desktop Runtime**: Tauri v2 (Rust backend, local SQLite database via `rusqlite`)
- **MCP Server**: Rust CLI utilizing `rmcp` for tool declarations and SQLite IPC

---

## Development & Build

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://www.rust-lang.org/) (1.78+)
- Platform build dependencies for [Tauri v2](https://v2.tauri.app/start/prerequisites/)

### Web Development (with in-memory fallback)

```bash
npm install
npm run dev
```

### Desktop Development (Tauri)

```bash
npm run tauri dev
```

### Production Build

```bash
# Build web frontend
npm run build

# Build desktop installer (Native executable)
npm run build:desktop

# Build MCP server binary
cargo build --release --manifest-path src-tauri/Cargo.toml --bin tempo-mcp
```

---

## License

MIT
