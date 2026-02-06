# Findings & Decisions

## Requirements
- 基于 README_CN.md 的愿景，设计开发路线图
- 核心：所有功能面向 AI Agent，非人类用户
- 重点：应用市场 API + 工具自造闭环
- Agent 完成任务时没有合适工具 → 自己创建 → 在业务中使用/优化/排错 → 稳定后发布到市场 → 其他 Agent 使用

## 架构澄清（用户修正）

### 已废弃
| 概念 | 替代方案 |
|------|----------|
| Reconciler | directRenderAsync 直接 Promise 渲染 |
| 响应式上下文（useState/useEffect） | tool 调用 → refresh → 获取最新上下文 |
| React hooks | 不需要，每次渲染是无状态的一次性操作 |
| 多 Agent 共享 Browser 实例 | 每个 Agent 独立 Browser，通过统一存储协作 |
| 增量渲染 / diff | 不需要，每次只渲染一个页面 |
| VS Code 扩展 / 在线演示 / 脚手架 | 不考虑，非核心 |
| 复杂状态管理 | 不需要，渲染完即结束 |

### 核心架构确认

**渲染模型：无状态、一次性**
```
async 组件函数 → directRenderAsync → VNode 树
                                      ├→ renderToMarkdown → Markdown (AI 读)
                                      └→ extractTools → Tools (AI 用)
渲染完毕，无状态残留。
```

**交互循环：Tool 驱动**
```
AI 读取 prompt → 选择 tool → 执行 tool → 返回结果 → refresh → 重新渲染页面 → AI 读取新 prompt → ...
```

**多 Agent 模型：独立 Browser + 共享存储（Cloudflare API）**
```
Agent A: Browser A → 渲染页面 → 调用 Cloudflare API 读写数据
Agent B: Browser B → 渲染页面 → 调用 Cloudflare API 读写数据
                                           ↑
                                  apps/api (D1 + Durable Objects)
```

**生态飞轮：AI 自造工具闭环**
```
Agent 没有合适工具
  → 自己创建工具代码
  → 本地注册，在业务中使用
  → 遇到错误 → 排错优化 → 再使用
  → 多轮迭代趋于稳定
  → 发布到应用市场（apps/api）
  → 其他 Agent 搜索 → 安装 → 使用
  → 使用反馈回流 → 继续优化
```

## apps/api 当前实现状态

### 已有基础设施 ✅
| 能力 | 实现 |
|------|------|
| D1 数据库 | 10 个 Entity，Git 相关 Schema |
| Durable Objects | MCP 会话管理 |
| MCP 协议 | Tool/Resource/Prompt 装饰器自动注册 |
| DI 框架 | 三层 Injector (root/application/feature) |
| React SSR | 组件渲染为 Markdown/HTML |
| Controller 路由 | Hono + 装饰器路由 |
| Git 集成 | GitHub/Gitea Service |

### 职责分离（用户澄清）

```
apps/api  = 纯后端 API（认证 + 市场 CRUD 接口），不涉及 AI 页面
apps/cli  = AI 前端（React 页面调用 API → 渲染 Markdown → 提取 Tools 给 AI）
```

### 需要扩展的市场功能 🔧

**apps/api（后端接口）：**
| 需求 | 实现方案 |
|------|----------|
| 认证系统 | Better Auth（注册/登录/登出/改密码 + Token 鉴权中间件）|
| 插件 CRUD | REST API：GET/POST/PUT /plugins, POST /plugins/:id/versions |
| 安装/卸载记录 | POST/DELETE /plugins/:id/install, GET /plugins/installed |
| 评价反馈 | POST /plugins/:id/reviews |
| 数据存储 | D1 新增 users/plugins/plugin_versions/plugin_installs/plugin_reviews 表 |
| 代码存储 | D1 存储（小插件），后续大插件可扩展 R2 |

**apps/cli（AI 前端页面）：**
| 需求 | 实现方案 |
|------|----------|
| 市场首页 | React 页面调用 GET /plugins → 渲染为 AI 可读的 Markdown |
| 插件详情 | React 页面调用 GET /plugins/:id → 渲染详情 |
| 我的已安装 | React 页面调用 GET /plugins/installed |
| 市场工具 | 从页面提取 Tools：search/install/uninstall/update/publish |
| 本地管理 | 安装后注入路由+工具，refresh 后 AI 可用 |

### 架构契合度分析
apps/api 现有架构与市场后端需求契合：
- Hono + `@Controller()` → 直接定义 REST API 路由
- D1 数据库 → 直接扩展 migrations 新增市场表
- `@sker/core` DI → 服务层依赖注入
- Cloudflare Workers 部署 → 全球边缘访问

apps/cli 现有架构与市场前端需求契合：
- React 组件 → directRenderAsync → Markdown（AI 看到的市场页面）
- extractTools → AI 可用的市场操作工具
- MCP 客户端 → 已有调用远程 API 的能力
- PluginLoaderService / PluginRegistryService → 可适配市场安装流程

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| 无状态渲染 | 极简可靠，无内存泄漏，无状态同步问题 |
| Tool 驱动循环 | AI 的交互模式天然就是 tool calling |
| 独立 Browser | 解耦简单，存储层负责协作 |
| 渲染差异化权限 | 复用 React 组件的条件渲染能力 |
| **api = 纯后端接口** | 只提供 HTTP API，认证+市场 CRUD，职责单一 |
| **cli = AI 前端页面** | React 页面调用 API，渲染给 AI 看，工具给 AI 用 |
| Cloudflare 部署实现共享 | 全球边缘访问，天然适合多 Agent 跨实例共享 |
| Better Auth 认证 | 轻量认证方案，支持注册/登录/Token 鉴权 |
| Agent 自造工具为核心创新 | 生态飞轮的起点，AI 为 AI 造工具 |

## Resources
- README_CN.md — 项目愿景
- apps/api/src/index.ts — API 入口
- apps/api/src/mcp/server.ts — MCP Server（Tool/Resource 注册）
- apps/api/src/mcp/session-durable-object.ts — Durable Object 会话
- apps/api/migrations/001_create_git_schema.sql — 现有 D1 Schema
- apps/api/wrangler.jsonc — Cloudflare 配置
- apps/api/src/www/tools/ — 现有 Tool 定义示例（echo.tool.ts）
- apps/api/src/www/resources/ — 现有 Resource 定义示例（docs.resource.tsx）
- apps/cli/src/services/plugin-*.service.ts — 现有插件服务
- apps/cli/src/services/mcp-client.service.ts — MCP 客户端

---
*Update this file after every 2 view/browser/search operations*
