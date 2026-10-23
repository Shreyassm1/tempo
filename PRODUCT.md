# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

Shipped as a Tauri desktop app (macOS window, 900×600 minimum) and an Android build from the same React UI.

## Users
For now, one person: the owner, planning their own working week. AI coding agents also add tickets through the `tempo-mcp` server. A public release is planned later; it does not change the product's look.

## Product Purpose
Tempo is a local task manager that turns tickets into a realistic schedule. Each ticket has an hour estimate, priority and status; Tempo adds a buffer, fits the work into the user's working hours and days, and shows when each ticket will really be done, flagging tickets that will miss their due date.

## Positioning
A to-do list that tells you the truth about when things will finish: deadlines come from your working hours and buffer, not from wishful due dates. Agents can file work into it directly.

## Operating Context
- Views: Board (Backlog / To Do / In Progress / Done columns with drag and drop), List, Timeline, and a What-if Simulator for testing a new ticket against the schedule.
- Settings: working hours, work days, buffer ratio, context-switch minutes, light / dark / system theme.
- Keyboard: C new task, 1–4 switch views, Cmd/Ctrl+R sync schedule, Cmd/Ctrl+, settings, Esc closes.
- Ticket numbers look like `TEM-108`; subtasks go one level deep.

## Capabilities and Constraints
- React 19 + Tailwind 3 + lucide-react icons; data through Tauri commands (`src/services/api.ts`).
- Both light and dark themes stay, plus a system option.
- Copy stays plain, quiet English.

## Brand Commitments
- Visual theme pinned by the owner: a minimal UI with subtle references to JoJo's Bizarre Adventure Part 7, Steel Ball Run (steel balls, horseshoes, the golden spiral, ゴゴゴ). The theme lives in the backdrop, icons and colour; the words stay plain.
- No reproduced character art, faces or official logos; all motifs are original drawings.

## Product Principles
- The schedule is the product: deadlines, at-risk tickets and hours must read before any decoration.
- Plain words, quiet world: the theme never renames a feature or a button.
- One tool, one keyboard: every action reachable without the mouse.
