# Apps/CLI 项目发现记录

## 架构发现

### 1. 多层架构清晰
**发现时间**: 2026-02-09

**描述**: 项目采用清晰的分层架构
- `packages/compiler` - LLM 适配器与 AST 转换层
- `packages/prompt-renderer` - UI Renderer 与 VNode 系统
- `packages/core` - DI 容器与基础设施
- `apps/cli` - CLI 应用层

**影响**: 架构设计符合 DESIGN_RULE.md 原则，但运行时实现存在偏差

### 2. 页面驱动架构已实现
**发现时间**: 2026-02-09

**描述**:
- 路由系统完整：`src/router.tsx` 定义了所有页面路由
- 页面组件齐全：Dashboard/Tasks/Market/Plugins 等
- 工具抽取机制：`packages/prompt-renderer/src/reconciler/extractor.ts`
- VNode -> Markdown: `packages/prompt-renderer/src/reconciler/renderer.ts`

**影响**: 核心"页面即上下文、页面即能力"范式已建立

### 3. Agent 独立性机制完备
**发现时间**: 2026-02-09

**描述**:
- Agent 注册服务：`src/services/agent-registry.service.ts`
- 消息队列隔离：`src/services/message-broker.service.ts`
- 任务管理系统：`src/services/task-manager.service.ts`
- 任务恢复服务：`src/services/task-recovery.service.ts`

**影响**: Agent 个体独立性在进程身份、消息队列、任务归属层面已具备

## 关键偏差发现

### 4. 单一 Provider 硬编码
**发现时间**: 2026-02-09

**位置**:
- `apps/cli/src/index.ts:102` - 仅注入 `LLM_ANTHROPIC_CONFIG`
- `apps/cli/src/config/constants.ts:6` - `DEFAULT_MODEL = 'claude-sonnet-4-5-20250929'`

**代码片段**:
```typescript
// src/index.ts:102
const providers: Provider[] = [
  { provide: LLM_ANTHROPIC_CONFIG, useValue: { apiKey, baseUrl } },
  // 缺少其他 Provider 配置
]
```

**影响**:
- 框架层支持多厂商，但产品运行态不支持
- 违反 DESIGN_RULE.md 原则1（Provider 能力隔离）

### 5. Plugin 通配路由未实现
**发现时间**: 2026-02-09

**位置**:
- `apps/cli/src/router.tsx:82` - 声明了 `/plugin/:id/*`
- `packages/prompt-renderer/src/browser/browser.ts` - `matchPath` 不支持 `*`

**代码片段**:
```typescript
// router.tsx:82
{ path: '/plugin/:id/*', component: PluginContainerPage as any, params: {} }
```

**影响**:
- 插件子页面路由匹配失败
- 插件能力无法稳定进入主链路
- 违反 DESIGN_RULE.md 原则4（页面驱动能力暴露）

### 6. SystemPrompt 过于简单
**发现时间**: 2026-02-09

**位置**: `apps/cli/src/components/SystemPrompt.tsx:3-6`

**代码片段**:
```typescript
export const SystemPrompt = () => {
    return (
        <div>you are a helpful ai assistant!</div>
    );
};
```

**影响**:
- 无法体现 Agent 身份、任务态、Provider 能力
- 无法支持多 Agent 协作规则
- 违反 DESIGN_RULE.md 原则2（Agent 个体独立）

### 7. 工具执行作用域泄漏
**发现时间**: 2026-02-09

**位置**: `packages/compiler/src/unified/tool-builder.ts`

**描述**: `buildUnifiedTool` 使用 `root.get(tool)` 获取工具实例

**影响**:
- 工具执行上下文可能偏离当前会话/页面
- 削弱 Agent 隔离性
- 违反 DESIGN_RULE.md 原则B（Agent 个体隔离）

## 技术栈发现

### 8. 存储后端多样化
**发现时间**: 2026-02-09

**描述**: 支持三种存储后端
- JSON 文件存储：`src/storage/json-file-storage.ts`
- SQLite 存储：`src/storage/sqlite-storage.ts`
- 双写模式：`src/storage/dual-storage.ts`

**配置**: 通过 `--storage-backend` 参数选择

**影响**: 存储层设计灵活，支持不同场景需求

### 9. 插件系统完整
**发现时间**: 2026-02-09

**描述**:
- 插件加载：`src/services/plugin-loader.service.ts`
- 插件编译：`src/services/plugin-compiler.service.ts`
- 插件注册：`src/services/plugin-registry.service.ts`
- 插件开发：`src/services/plugin-develop.service.ts`

**影响**: 插件系统架构完整，但需确保符合 DESIGN_RULE.md 原则F

### 10. 应用市场功能齐全
**发现时间**: 2026-02-09

**描述**:
- 市场 API 服务：`src/services/marketplace-api.service.ts`
- 市场页面：`src/pages/MarketPage.tsx`
- 市场工具：`src/tools/SearchPluginsTool.ts` 等
- 认证会话：`src/services/auth-session.service.ts`

**影响**: 应用市场功能完整，支持搜索/安装/发布插件

## 测试覆盖发现

### 11. 测试文件分布
**发现时间**: 2026-02-09

**描述**:
- 单元测试：`.test.ts` 文件（如 `agent-registry.service.test.ts`）
- 集成测试：`.integration.test.ts` 文件
- E2E 测试：`.e2e.spec.ts` 文件
- 红绿测试：`.red.test.ts` 文件（TDD 风格）

**影响**: 测试策略完整，符合 TDD 最佳实践

### 12. 无 TODO/FIXME 标记
**发现时间**: 2026-02-09

**描述**: Grep 搜索 `TODO|FIXME|XXX|HACK` 无结果

**影响**: 代码质量较高，无明显技术债务标记

## Git 历史发现

### 13. 最近开发重点
**发现时间**: 2026-02-09

**最近提交**:
- `9dc49d8` - 修复 SQLite 句柄关闭问题
- `cc7df33` - 添加 SQLite/Dual 存储后端
- `057125e` - 添加任务恢复服务
- `c8e852e` - 添加任务乐观并发控制

**影响**: 最近开发聚焦于存储层优化和任务管理增强

## 依赖发现

### 14. 核心依赖
**发现时间**: 2026-02-09

**关键依赖**:
- `@modelcontextprotocol/sdk` - MCP 协议支持
- `commander` - CLI 参数解析
- `better-sqlite3` - SQLite 数据库
- `chokidar` - 文件监听
- `esbuild` - 插件编译
- `react` - UI 组件（VNode）
- `zod` - 参数验证

**影响**: 依赖选择合理，支持核心功能需求

## 配置发现

### 15. 环境变量配置
**发现时间**: 2026-02-09

**支持的环境变量**:
- `ANTHROPIC_API_KEY` / `ANTHROPIC_AUTH_TOKEN` - API 密钥
- `ANTHROPIC_BASE_URL` - API 基础 URL
- `MCP_API_URL` - MCP 服务器 URL
- `MCP_API_TIMEOUT` - MCP 超时时间
- `STORAGE_BACKEND` - 存储后端选择
- `SKER_STORAGE_DIR` - 存储目录

**影响**: 配置灵活，支持多种部署场景
