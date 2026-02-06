# Task Plan: context-engine 开发路线图

## Goal
将 context-engine 打造为生产可用的 **AI Agent 上下文管理框架**——以应用市场为核心驱动力，实现 AI Agent **自主创造工具、迭代优化、发布共享**的完整生态闭环。

## 核心设计哲学

```
所有的开发、所有的功能、所有的设计 —— 都是给 AI 用的，不是给人类用的。
```

**架构原则：**
- **无状态渲染**：每次渲染一个页面，渲染完即结束，无 hook/state/响应式
- **Tool 驱动循环**：tool 调用 → 返回结果 → refresh → 获取最新上下文
- **独立 Browser**：每个 Agent 一个 Browser 实例，通过统一数据持久化协作
- **角色即渲染**：不同 Agent 进同一个页面，渲染出不同内容 = 权限系统
- **文档即页面**：文档通过 React 渲染为 Markdown，AI 自行导航查看

**核心创新——AI 自造工具闭环：**
```
Agent 遇到没有合适工具的任务
  → 自己创建工具
  → 在业务中使用
  → 不断优化、排错
  → 稳定后发布到应用市场
  → 其他 Agent 搜索、安装、使用
```

## Current Phase
Phase 0 (规划阶段)

## 开发阶段总览

```
Phase 1: 稳固基础             → 现有代码质量保障和端到端验证
Phase 2: 应用市场后端         → apps/api 提供认证 + 市场 HTTP 接口
Phase 3: 应用市场前端         → apps/cli 设计市场页面调用 API，渲染给 AI
Phase 4: 工具自造闭环         → Agent 创建 → 使用 → 优化 → 发布的完整循环
Phase 5: 多 Agent 协作        → 独立 Browser + 共享存储 + 角色渲染
Phase 6: 生产化              → 安全、可观测性、CI/CD
```

---

## 功能架构划分 — CLI 内置 vs 插件

### 划分原则

| 原则 | CLI 内置 | 插件 |
|------|---------|------|
| **必要性** | 系统运行的必需品 | 可选的增强功能 |
| **依赖性** | 其他功能依赖它 | 独立功能，不被依赖 |
| **通用性** | 所有 Agent 都需要 | 特定场景才需要 |
| **稳定性** | 核心稳定，很少变化 | 频繁更新迭代 |
| **启动时机** | 必须在启动时加载 | 可以延迟加载 |
| **悖论性** | 插件系统本身 | 使用插件系统的功能 |

### 🔧 CLI 内置功能（Core）

#### 1. 核心基础设施
**功能清单：**
- 渲染引擎（`@sker/prompt-renderer`）
- 路由系统（`router.tsx`）
- 工具提取机制（`extractTools`）
- Markdown 渲染（`renderToMarkdown`）
- Browser 实例管理
- 无状态渲染循环（directRenderAsync）

**理由：** 整个系统运行的基础，所有页面和工具都依赖这些能力，无法通过插件替代，必须在启动时就绪，性能敏感需要深度集成。

#### 2. 插件系统本身
**功能清单：**
- PluginLoaderService（加载插件）
- PluginRegistryService（注册插件）
- PluginCompilerService（编译插件）
- PluginDevelopService（开发插件）
- 插件生命周期管理
- 插件路由注入
- 插件工具注入

**理由：** 插件系统是实现"工具自造闭环"的核心，必须内置才能支持动态加载其他插件，鸡生蛋问题：不能用插件来加载插件。

#### 3. 应用市场客户端
**功能清单：**
- 市场页面（搜索、浏览、详情、已安装、已发布）
- 市场工具（search/install/uninstall/update/publish）
- 本地安装记录管理（~/.sker/plugins.json）
- 版本更新检查
- 插件包下载和解压
- 与 apps/api 的 HTTP 通信

**理由：** 应用市场是生态飞轮的起点，必须开箱即用。Agent 需要通过市场获取第一批工具。如果市场本身是插件，会陷入"如何安装第一个插件"的悖论。

#### 4. Agent 管理
**功能清单：**
- AgentRegistryService（注册、心跳、在线列表）
- Agent 身份管理（agent_id 生成和持久化）
- Agent 间通信基础设施（MessageBrokerService）
- SendMessageTool（Agent 间私信）
- Agent 在线状态维护

**理由：** 多 Agent 协作是核心特性，需要在系统层面统一管理 Agent 生命周期，身份认证和权限控制的基础。

#### 5. 任务系统
**功能清单：**
- TaskManagerService（创建、认领、完成、取消、编辑、删除）
- TaskDependencyResolverService（依赖解析、状态流转）
- 任务状态机（PENDING/BLOCKED/IN_PROGRESS/COMPLETED/FAILED/CANCELLED）
- 任务页面（/tasks 列表、/tasks/:id 详情）
- 子任务支持

**理由：** 任务系统是 Agent 协作的核心机制，需��全局统一的任务状态管理，多 Agent 需要通过任务系统协调工作。

#### 6. 基础工具
**功能清单：**
- NavigateTool（页面导航）
- RefreshTool（刷新当前页面）
- SendMessageTool（Agent 间消息）
- 系统信息查询（/base-info 页面）

**理由：** ���些是 AI 操作界面的基本能力，必须在任何插件加载前就可用，频繁使用且性能敏感。

#### 7. 存储层
**功能清单：**
- JsonFileStorage（~/.sker 本地存储）
- 存储接口抽象（IStorage）
- 数据持久化（agents/messages/tasks/sessions/plugins）
- 数据一致性保证

**理由：** 所有功能都依赖存储，需要统一的数据访问层，保证数据一致性。

#### 8. MCP 客户端
**功能清单：**
- McpClientService（远程工具调用）
- MCP ��议实现（Tool/Resource/Prompt）
- 连接管理和超时控制
- 错误处理和重试机制

**理由：** 连接 apps/api 的桥梁，市场功能依赖 MCP 调用后端 API，核心通信机制。

#### 9. 聊天循环
**功能清单：**
- ChatSession（会话管理）
- InputHandler（stdin 读取、LLM 调用、工具执行）
- LLM 集成（Anthropic API）
- 工具执行器（ToolExecutor）
- 上下文管理

**理由：** CLI 的核心交互循环，所有功能都通过聊天循环驱动，必须内置。

---

### 🔌 插件功能（Plugins）

#### 1. 特定领域工具
**功能清单：**
- **Git 操作**：clone/commit/push/pull/branch/merge/rebase/stash
- **文件操作**：read/write/delete/move/copy/rename（超出基础需求的高级操作）
- **数据库工具**：query/migrate/backup/restore（PostgreSQL/MySQL/MongoDB）
- **HTTP 客户端**：request/webhook/GraphQL/REST API 测试
- **代码分析**：lint/format/test/coverage/complexity 分析
- **构建工具**：webpack/vite/rollup/esbuild 集成
- **包管理**：npm/pnpm/yarn 操作（install/update/publish）

**理由：** 不是所有 Agent 都需要这些工具，可以按需安装减少核心体积，不同项目需要不同的工具集，社区可以贡献更多领域工具。

#### 2. 第三方服务集成
**功能清单：**
- **代码托管**：GitHub/GitLab/Bitbucket API 集成
- **项目管理**：Jira/Linear/Asana/Trello 集成
- **通信工具**：Slack/Discord/Teams 通知和机器人
- **CI/CD**：GitHub Actions/GitLab CI/Jenkins 触发器
- **云服务**：AWS/GCP/Azure SDK（S3/Lambda/EC2/RDS 等）
- **监控告警**：Sentry/Datadog/New Relic 集成
- **文档平台**：Notion/Confluence API

**理由：** 高度定制化，不同团队需求不同，需要外部认证和配置，更新频率高不应绑定 CLI 版本，社区可以自由扩展。

#### 3. 业务特定工具
**功能清单：**
- **项目模板**：React/Vue/Next.js/Express 脚手架生成器
- **代码生成器**：ORM 模型生成、API 路由生成、组件生成
- **自定义工作流**：发布流程、部署流程、测试流程
- **框架辅助**：特定框架的调试、性能分析、迁移工具
- **领域特定**：电商/金融/医疗等行业特定工具

**理由：** 高度业务相关，不同项目需求完全不同，这正是"Agent 自造工具"的目标场景，应该由 Agent 根据需求创建。

#### 4. 增强功能
**功能清单：**
- **高级搜索**：全文搜索、语义搜索、代码搜索引擎
- **数据可视化**：图表生成、依赖关系图、架构图
- **性能分析**：性能监控、内存分析、CPU profiling
- **调试辅助**：断点调试、日志分析、错误追踪
- **代码质量**：技术债务分析、代码异味检测、重复代码检测
- **文档生成**：API 文档、架构文档、变更日志

**理由：** 非必需功能，可选的增强体验，不影响核心功能运行，可以逐步完善。

#### 5. 实验性功能
**功能清单：**
- **新 AI 模型**：OpenAI/Gemini/Llama 集成
- **实验性 UI**：新的渲染组件、交互模式
- **Beta 功能**：新特性的早期测试版本
- **性能优化**：缓存策略、并发优化、内存优化尝试
- **新协议支持**：WebSocket/gRPC/GraphQL 订阅

**理由：** 不稳定不应进入核心，需要快速迭代，失败了可以直接卸载，不影响主系统稳定性。

---

### 关键决策说明

#### 为什么应用市场必须内置？
- 如果市场是插件，Agent 如何安装第一个插件？（悖论）
- 市场是生态飞轮的起点，必须开箱即用
- 但市场的**后端 API**（apps/api）是独立部署的服务，通过 MCP 调用

#### 为什么任务系统必须内置？
- 多 Agent 协作的核心机制
- 需要全局统一的状态管理
- 插件可以创建任务，但不能替代任务系统本身

#### 为什么 Git 工具应该是插件？
- 不是所有 Agent 都需要 Git（例如纯数据分析 Agent）
- Git 操作可能需要特定配置（SSH key、token、用户信息）
- 可以有多个 Git 插件（GitHub 专用、GitLab 专用、企业版等）
- 不同项目可能需要不同的 Git 工作流

#### 插件系统的自举问题
CLI 内置的插件系统提供：
1. 插件加载和注册能力
2. 应用市场客户端（搜索、安装、更新）
3. 本地插件开发工具（/plugins/develop）

Agent 的第一批工具来源：
1. CLI 内置的基础工具（导航、刷新、消息）
2. 通过市场安装的插件工具
3. 自己创建的本地插件

---

### 实现路径

**Phase 1-3：** 完善 CLI 内置功能
- 稳固核心基础设施
- 实现应用市场后端 API
- 实现应用市场前端页面和工具

**Phase 4：** 启动插件生态
- 实现工具自造闭环
- Agent 创建第一批插件（Git/文件/HTTP 等）
- 发布到市场供其他 Agent 使用

**Phase 5-6：** 生态繁荣
- 多 Agent 协作创造更多插件
- 社区贡献第三方服务集成
- 形成正向飞轮：更多工具 → 更强能力 → 更多 Agent → 更多工具

---

### Phase 1: 稳固基础 — 质量保障与端到端验证
> 确保现有架构可靠运行

- [x] 全量 check-types / lint / test 通过
- [x] 验证核心循环：渲染页面 → AI 读取 prompt → 调用 tool → refresh → 获取新上下文
- [x] 清理已废弃代码（React hooks 相关、响应式状态相关、Reconciler 残留）
- [x] 补齐 prompt-renderer 边界测试
- [x] 补齐 compiler LLM 适配器测试
- [x] 验证包间依赖和导出一致性
- **Status:** pending

### Phase 2: 应用市场后端 — apps/api（Cloudflare Workers）
> 纯后端 API 服务，只提供 HTTP 接口，不涉及 AI 页面渲染

**认证接口（Better Auth）：**
- [ ] `POST /auth/register` — 注册
- [ ] `POST /auth/login` — 登录
- [ ] `POST /auth/logout` — 登出
- [ ] `PUT /auth/password` — 修改密码
- [ ] Token 鉴权中间件（保护市场 API）

**应用市场接口：**
- [ ] `GET /plugins` — 搜索/列表（关键词、标签、分类、排序）
- [ ] `GET /plugins/:id` — 插件详情（元数据、版本列表、下载量、评价）
- [ ] `POST /plugins` — 发布新插件（上传代码+元数据+schema）
- [ ] `PUT /plugins/:id` — 更新插件信息
- [ ] `POST /plugins/:id/versions` — 发布新版本
- [ ] `POST /plugins/:id/install` — 记录安装（返回插件包）
- [ ] `DELETE /plugins/:id/install` — 记录卸载
- [ ] `GET /plugins/installed` — 当前 Agent 已安装列表
- [ ] `GET /plugins/published` — 当前 Agent 已发布列表
- [ ] `GET /plugins/updates` — 检查已安装插件的可用更新
- [ ] `POST /plugins/:id/reviews` — 提交评价/反馈

**D1 数据模型（新增表）：**
- [ ] `users` — 用户/Agent 账户（Better Auth 管理）
- [ ] `plugins` — 插件元数据（name, description, author_id, tags, downloads, status）
- [ ] `plugin_versions` — 版本历史（version, source_code, schema, changelog）
- [ ] `plugin_installs` — 安装记录（plugin_id, user_id, installed_version）
- [ ] `plugin_reviews` — 评价反馈（plugin_id, user_id, rating, feedback）

**基础设施：**
- [ ] Better Auth 集成（或同类轻量认证方案）
- [ ] 插件代码存储（D1 元数据+代码，大型插件后续可扩展 R2）
- [ ] 版本号规范（semver）
- **Status:** pending

### Phase 3: 应用市场前端 — apps/cli 页面 + 工具
> CLI 侧设计 React 页面调用 Phase 2 的 API，渲染为 AI 可读的 Markdown，提取为 AI 可用的 Tools

**市场页面（React 组件，渲染给 AI 看）：**
- [ ] 市场首页 — 热门插件、最新发布、分类浏览（调用 GET /plugins）
- [ ] 插件详情页 — 描述、版本、评价、安装量（调用 GET /plugins/:id）
- [ ] 我的已安装 — 已安装列表+版本+可用更新（调用 GET /plugins/installed）
- [ ] 我的已发布 — 自己发布的插件管理（调用 GET /plugins/published）

**市场工具（从页面提取，AI 通过 tool 操作）：**
- [ ] search-plugins — 搜索插件（调用 GET /plugins）
- [ ] install-plugin — 安装插件（调用 POST /plugins/:id/install → 本地注册 → 注入路由和工具）
- [ ] uninstall-plugin — 卸载插件（清理本地 → 调用 DELETE /plugins/:id/install）
- [ ] update-plugin — 更新插件（调用 POST /plugins/:id/install 最新版 → 本地替换）
- [ ] publish-plugin — 发布插件（打包 → 调用 POST /plugins）
- [ ] publish-version — 发布新版本（调用 POST /plugins/:id/versions）

**本地管理：**
- [ ] 已安装插件的本地持久化（JSON 记录插件 ID、版本、安装时间）
- [ ] 安装后插件注入：新路由 + 新工具注入到 Browser，refresh 后 AI 可用
- [ ] 现有 PluginLoaderService / PluginRegistryService 适配市场流程
- **Status:** pending

### Phase 4: 工具自造闭环 — Agent 创建 → 使用 → 优化 → 发布
> **核心创新**：Agent 在没有合适工具时自主创建，迭代稳定后发布

- [ ] 工具创建 tool：Agent 描述需求 → 生成工具代码模板 → 本地注册
- [ ] 工具调试 tool：Agent 在业务中使用新工具 → 捕获错误 → 记录日志
- [ ] 工具优化 tool：Agent 根据使用反馈修改工具代码 → 重新注册
- [ ] 工具测试 tool：Agent 运行工具的验证用例 → 确认稳定性
- [ ] 工具发布 tool：工具通过稳定性检查 → 打包 → 调用 marketplace-publish
- [ ] 版本迭代：发布后继续优化 → marketplace-update 发布新版本
- [ ] 使用统计和反馈回收（其他 Agent 安装使用后的评价回流）
- **Status:** pending

### Phase 5: 多 Agent 协作 — 独立 Browser + 共享存储 + 角色渲染
> 每个 Agent 独立 Browser，通过 Cloudflare API 共享数据，渲染差异化实现权限

- [ ] Agent 身份传入渲染上下文（组件根据 Agent 角色渲染不同内容）
- [ ] 协作工作流：Agent A 写入数据 → Agent B 渲染时通过 API 读到最新数据
- [ ] 任务分配和状态流转（通过持久化存储协调）
- [ ] Agent 活动日志（渲染为 AI 可查看的页面）
- [ ] 协作模板：Pipeline / 并行执行 / 审批链
- **Status:** pending

### Phase 6: 生产化 — 安全与可观测性
> 面向真实生产环境

- [ ] 安全审计：插件代码审查机制、权限边界、注入防护
- [ ] 可观测性：日志、metrics（渲染为 AI 可读的监控页面）
- [ ] 错误恢复和优雅降级
- [ ] CI/CD 流水线完善
- **Status:** pending

---

## Key Questions
1. ~~插件市场的后端存储方案？~~ → **已确定：apps/api + Cloudflare D1**
2. 插件代码大小限制？（D1 单行上限 vs R2 存储大文件）
3. Agent 身份如何跨实例传递？（API key / JWT / agent_id?）
4. 工具自造时的代码安全审查策略？
5. 版本发布是否需要审核流程，还是直接发布？

## Decisions Made
| Decision                                  | Rationale                                                      |
| ----------------------------------------- | -------------------------------------------------------------- |
| 废弃响应式上下文                          | 无状态渲染更简单可靠：tool → refresh → 新上下文                |
| 废弃 React hooks                          | 每次渲染即结束，不需要状态管理                                 |
| 每个 Agent 独立 Browser                   | 不需要共享实例，通过持久化存储协作更简单                       |
| 角色权限 = 渲染差异化                     | 同一页面对不同 Agent 渲染不同内容，天然的权限系统              |
| 文档即渲染页面                            | AI 通过导航查看文档页面，与使用工具体验一致                    |
| 不考虑边缘场景                            | 不做 VS Code 扩展、在线演示、脚手架等人类工具                  |
| 不需要增量渲染/diff                       | 多页面架构，每次只渲染一个页面，无内存问题                     |
| **api = 纯后端接口**                      | 只提供认证 + 市场 CRUD 的 HTTP API，职责单一                   |
| **cli = AI 前端页面**                     | React 页面调用 API → 渲染 Markdown 给 AI → 提取 Tools 给 AI 用 |
| **Better Auth 认证**                      | 轻量认证方案，注册/登录/改密码/Token 鉴权                      |
| **Agent 自造工具为核心创新**              | Agent 遇到没有工具 → 自建 → 迭代 → 发布，形成生态飞轮          |
| **通过 Cloudflare 部署实现跨 Agent 共享** | 全球边缘访问，天然适合多 Agent 场景                            |

## Errors Encountered
| Error  | Attempt | Resolution |
| ------ | ------- | ---------- |
| (暂无) | -       | -          |

## Notes
- **一切为 AI 服务**：页面是给 AI 看的，工具是给 AI 用的，文档是给 AI 读的
- **生态飞轮**：Agent 造工具 → 自用迭代 → 发布市场 → 其他 Agent 安装使用 → 反馈优化 → 更好的工具
- **职责分离**：api = 纯后端接口（认证+市场CRUD），cli = AI 前端页面（React 调用 API → Markdown + Tools）
- apps/api 当前已有：D1 数据库、Durable Objects、Hono Controller 路由、DI 框架——扩展市场接口零成本
- apps/cli 当前已有：React 渲染 + Tool 提取 + MCP 客户端 + 插件服务——扩展市场页面水到渠成
