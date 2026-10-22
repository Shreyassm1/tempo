# tempo
## AI agents

`tempo-mcp` is an MCP server that lets any AI agent add tickets and subtasks to Tempo. Install it with
`cargo install --path src-tauri --bin tempo-mcp`, then register it with each agent, e.g.
`claude mcp add tempo -s user -- ~/.cargo/bin/tempo-mcp` (Codex: `[mcp_servers.tempo]` in `~/.codex/config.toml`;
Gemini: `mcpServers` in `~/.gemini/settings.json`; opencode: `mcp` in `opencode.jsonc`).

The server's instructions (`TEMPO_AGENT.md`) tell the agent to ask once per session whether the work should
become a Tempo ticket. Agents follow that more reliably with a one-line reminder in their global rules file.
