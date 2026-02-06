# Sker CLI

[English](./README.md) | [中文](./README_CN.md)

## Overview
- Terminal-first multi-agent workspace built on `@sker/prompt-renderer`, `@sker/core`, and `@sker/compiler`.
- Ships a single command `sker-cli chat` that boots an Anthropic-powered session, renders a markdown UI, and lets agents navigate pages, call tools, and talk to each other.
- Uses local JSON storage under `~/.sker` to persist agents, tasks, messages, sessions, and plugins.
- Optional MCP client lets the CLI call remote tools alongside local ones.

## What You Get
- Interactive dashboard with links to tasks, plugins, system info, and agent chat (see `apps/cli/src/router.tsx`).
- Agent registry with heartbeat + inbox; send point-to-point messages via `SendMessageTool` on `/chat/:agentId`.
- Task board with dependencies, claiming, completion, cancellation, editing, and sub-tasks (see `TaskListPage` and `TaskDetailPage`).
- Plugin lifecycle in CLI: scaffold, save TSX pages, build, install, load routes at `/plugin/:id/*`.
- Base info page exposing host environment for agents.

## Architecture (code references)
- Entry + CLI wiring: `apps/cli/src/index.ts` (Commander command `chat`, Anthropic config, MCP config, storage bootstrap).
- Application module: `apps/cli/src/cli.module.ts` registers services, tool executors, MCP client, and prompt renderer routes.
- Routes/UI: `apps/cli/src/router.tsx`; paths include `/` dashboard (agent list + my tasks), `/base-info` host info, `/chat/:agentId` direct messaging, `/tasks` task list, `/tasks/:taskId` task actions, `/plugins` plugin manager, `/plugins/develop` plugin creation/build/install, `/plugin/:id/*` plugin pages.
- Chat loop: `apps/cli/src/core/chat-session.ts` + `handlers/input-handler.ts` render prompt, collect stdin, call LLM with tools, stream results.

## Requirements
- Node.js 18+ and pnpm 10.28.2 (repo uses workspace commands).
- Anthropic API key (`ANTHROPIC_API_KEY` or `ANTHROPIC_AUTH_TOKEN`). Optional `ANTHROPIC_BASE_URL`.
- Optional MCP endpoint (`MCP_API_URL`, default `https://mcp.sker.us`; timeout via `MCP_API_TIMEOUT`).

## Setup
```bash
pnpm install
# recommended: build all workspaces once
pnpm --filter @sker/cli build
```
Create `apps/cli/.env` (loaded by `apps/cli/src/index.ts`):
```bash
ANTHROPIC_API_KEY=sk-ant-...
MCP_API_URL=https://mcp.sker.us
MCP_API_TIMEOUT=30000
ANTHROPIC_BASE_URL=https://api.anthropic.com   # optional
```

## Run the CLI
- Development (TSX, hot-ish): `pnpm --filter @sker/cli dev -- chat --id alice --api-key sk-ant-...`
- From build output: `pnpm --filter @sker/cli exec node dist/index.js chat --id alice --api-key sk-ant-...`
- Options: `--id <agentId>` set current agent id (default `agent-{n}`); `--api-key <key>` Anthropic key with env fallback; `--mcp-url <url>` override MCP server; `--no-mcp` to disable.

## Data & State
- Storage root: `~/.sker` (JSON files for agents, messages, tasks, sessions, plugins).
- Agent heartbeat keeps online list fresh; message queues per agent for chat history.
- Task state machine includes `PENDING`, `BLOCKED`, `IN_PROGRESS`, `COMPLETED`, `FAILED`, `CANCELLED`; actions enforce ownership and status checks.

## Typical Flow
1. Run `sker-cli chat` with your key.
2. From the rendered menu pick Tasks → create a task → claim/complete/cancel/edit/add subtask in `/tasks/:id`.
3. Open Chat → pick an agent → use `SendMessageTool` to exchange messages; unread counts show on dashboard.
4. Open Plugin Develop → create plugin → save page code → build → install, then browse via `/plugin/<id>/home`.
5. Check `/base-info` for environment context when needed by agents/tools.

## Testing & Linting
- Unit tests: `pnpm --filter @sker/cli test` (Vitest).
- Lint: `pnpm --filter @sker/cli lint`.
- Type check: `pnpm --filter @sker/cli check-types`.

## License
Private project.
