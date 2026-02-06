# Sker CLI

[English](./README.md) | [中文](./README_CN.md)

## 概览
- 终端里的多 Agent 工作台，基于 `@sker/prompt-renderer`、`@sker/core`、`@sker/compiler`。
- 通过 `sker-cli chat` 启动会话：渲染 Markdown 界面，导航页面、调用工具、支持 Agent 之间互聊。
- 本地 JSON 存储位于 `~/.sker`，保存 agents、任务、消息、会话和插件。
- 可选 MCP 客户端，支持远程工具调用。

## 核心特性
- 交互式仪表盘，入口在 `apps/cli/src/router.tsx`，包含任务、插件、系统信息和聊天页面。
- Agent 注册与心跳，私信通道由 `SendMessageTool` 在 `/chat/:agentId` 提供。
- 任务系统：创建、依赖、认领、完成、取消、编辑、删除、子任务（`TaskListPage` / `TaskDetailPage`）。
- 插件全流程：创建、保存 TSX 页面、构建、安装、加载到 `/plugin/:id/*`。
- 系统信息页 `/base-info` 暴露运行环境给 Agent 使用。

## 架构（代码位置）
- CLI 入口：`apps/cli/src/index.ts`（Commander 定义 `chat` 命令，读取 Anthropic/MCP 配置，初始化存储和服务）。
- 应用模块：`apps/cli/src/cli.module.ts` 注册服务、工具执行器、MCP 客户端以及路由。
- 路由：`apps/cli/src/router.tsx`，包含 `/` 仪表盘（Agent 列表 + 我的任务）、`/base-info` 系统信息、`/chat/:agentId` 双向消息、`/tasks` 任务列表、`/tasks/:taskId` 任务操作、`/plugins` 插件管理、`/plugins/develop` 插件开发与安装、`/plugin/:id/*` 插件页面。
- 聊天循环：`apps/cli/src/core/chat-session.ts` 与 `handlers/input-handler.ts` 负责渲染 prompt、读取 stdin、调用 LLM 及工具。

## 环境要求
- Node.js 18+，pnpm 10.28.2。
- Anthropic Key：`ANTHROPIC_API_KEY` 或 `ANTHROPIC_AUTH_TOKEN`，可选 `ANTHROPIC_BASE_URL`。
- MCP：`MCP_API_URL`（默认 `https://mcp.sker.us`），`MCP_API_TIMEOUT` 可调，`--no-mcp` 可禁用。

## 安装
```bash
pnpm install
pnpm --filter @sker/cli build
```
在 `apps/cli/.env` 写入：
```bash
ANTHROPIC_API_KEY=sk-ant-...
MCP_API_URL=https://mcp.sker.us
MCP_API_TIMEOUT=30000
ANTHROPIC_BASE_URL=https://api.anthropic.com  # 可选
```

## 运行方式
- 开发态（TSX）：`pnpm --filter @sker/cli dev -- chat --id alice --api-key sk-ant-...`
- 编译后：`pnpm --filter @sker/cli exec node dist/index.js chat --id alice --api-key sk-ant-...`
- 主要参数：`--id <agentId>` 指定当前 Agent（默认自动生成 `agent-{n}`）；`--api-key <key>` Anthropic Key；`--mcp-url <url>` 覆盖 MCP 服务器；`--no-mcp` 关闭远程工具。

## 状态存储与规则
- 数据目录 `~/.sker`，存 agents、消息、任务、会话、插件。
- Agent 心跳维持在线列表；消息队列按 Agent 分组，聊天历史自动合并去重。
- 任务状态机：`PENDING`、`BLOCKED`、`IN_PROGRESS`、`COMPLETED`、`FAILED`、`CANCELLED`，操作前会校验状态与权限。

## 典型流程
1. 运行 `sker-cli chat`，进入渲染的主菜单。
2. 进 Tasks：创建任务 → 在 `/tasks/:id` 里认领/完成/取消/编辑/添加子任务。
3. 进 Chat：选择一个 Agent，用 `SendMessageTool` 互发消息；未读数量会在仪表盘展示。
4. 进 Plugin Develop：创建插件 → 保存页面代码 → 构建 → 安装，然后在 `/plugin/<id>/home` 查看。
5. 查看 `/base-info` 获取当前主机信息，为工具或 Agent 决策提供上下文。

## 测试与检查
- 单测：`pnpm --filter @sker/cli test`。
- Lint：`pnpm --filter @sker/cli lint`。
- 类型检查：`pnpm --filter @sker/cli check-types`。

## 许可证
私有项目。
