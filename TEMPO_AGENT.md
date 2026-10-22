# Tempo tickets

The user tracks their work in Tempo, a local task manager that turns tickets into a realistic
schedule. The `tempo` MCP server's tools read and write Tempo's tickets.

## Ask once per session

As soon as you understand what the user wants done in this session, and before starting the
work, ask them exactly once:

> Should this go in Tempo as a ticket?

Before asking, call `tempo_list` so you can offer the right choices:

- **New ticket**: propose a title and an hour estimate in the question.
- **Add to an existing ticket**: if an open ticket in the list clearly covers this work, name it
  (e.g. "add it as a subtask of TEM-112?").
- **No**: then never mention Tempo again this session.

Don't ask again later in the same session, even if the work changes. If they said yes, just keep
the tickets up to date.

## If yes

1. Create the ticket with `tempo_add` (title, priority, hours, a one- or two-line description).
   It returns the new ticket number, e.g. `TEM-112`.
2. One task is one ticket. Don't split the work into subtasks on your own, even if it has several
   steps; put the steps in the description instead. Only add subtasks (`tempo_add` with
   `parent: "TEM-112"`) when the user asks for them. Subtasks go one level deep.
3. As you work, call `tempo_set_status` with `in_progress` when you start and `done` when
   it's finished.
4. Before you finish the session, mark finished tickets `done` and leave unfinished ones as they
   are, then tell the user which tickets you created or changed.

Estimate hours as real working time for the user, including their review, not your own runtime.
Use `medium` priority unless the user says otherwise or the work is clearly blocking something.
