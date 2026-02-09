# Apps/CLI 开发计划

## 目标
分析 apps/cli 项目的开发进度，识别与 DESIGN_RULE.md 核心原则的偏差，并制定优先级明确的开发计划。

## 核心原则（来自 DESIGN_RULE.md）
1. **Provider 能力隔离** - 每个 LLM 有自己的厂商、训练背景与能力边界
2. **Agent 个体独立** - 每个 LLM/Agent 都是独立个体
3. **UI Renderer 上下文入口** - 通过 CLI 的 UI Renderer 获取上下文与可执行工具/能力
4. **页面驱动能力暴露** - 所有功能实现围绕"构建上下文 + 工具"的 React VNode 页面展开

## 当前状态分析

### ✅ 已完成的核心功能
- [x] 多厂商 LLM 适配器架构（Anthropic/OpenAI/Google）
- [x] Agent 注册与身份管理系统
- [x] 消息队列与任务管理系统
- [x] UI Renderer 页面驱动架构
- [x] 路由系统与页面组件（Dashboard/Tasks/Market/Plugins）
- [x] 工具抽取与执行机制
- [x] 存储后端（JSON/SQLite/Dual）
- [x] 任务恢复服务（离线 Agent 支持）
- [x] 插件系统（加载/编译/开发）
- [x] 应用市场功能（搜索/安装/发布）

### ❌ 关键偏差（P0 优先级）

#### P0-1: CLI 多 Provider 策略未完成
**现状**:
- `src/index.ts` 仅注入 `LLM_ANTHROPIC_CONFIG`
- `src/config/constants.ts` 默认模型固定为 `claude-sonnet-4-5-20250929`
- 框架支持多厂商，但运行时策略偏单厂商

**影响**: 违反原则1 - Provider 能力隔离

**文件位置**:
- `apps/cli/src/index.ts:102`
- `apps/cli/src/config/constants.ts:6`

#### P0-2: Plugin 路由通配匹配未实现
**现状**:
- `src/router.tsx:82` 声明了 `/plugin/:id/*` 路由
- `packages/prompt-renderer` 的 `Browser.matchPath` 不支持 `*` 通配符

**影响**: 违反原则4 - 插件子页面能力无法稳定进入主链路

**文件位置**:
- `apps/cli/src/router.tsx:82`
- `packages/prompt-renderer/src/browser/browser.ts`

### ⚠️ 次要偏差（P1 优先级）

#### P1-1: ToolUse 执行作用域泄漏
**现状**: `buildUnifiedTool` 使用 `root.get(tool)` 获取实例

**影响**: 工具执行上下文可能偏离当前会话/页面作用域

**文件位置**: `packages/compiler/src/unified/tool-builder.ts`

#### P1-2: SystemPrompt 语义过弱
**现状**: `src/components/SystemPrompt.tsx` 仅固定文案 "you are a helpful ai assistant!"

**影响**: 无法体现多 Agent 协作规则、能力边界、当前页面目标

**文件位置**: `apps/cli/src/components/SystemPrompt.tsx:3-6`

## 开发阶段

### 阶段 1: Provider 参数化与多厂商支持 [P0-1] ✅ completed
**目标**: 使 CLI 运行时支持多 Provider 配置

**任务**:
1. 在 `src/index.ts` 增加 CLI 参数：
   - `--provider <name>` (anthropic/openai/google)
   - `--model <model-id>`
   - 各厂商 API Key 配置策略
2. 动态注入对应 Provider 配置（而非硬编码 Anthropic）
3. 在页面上下文中暴露当前 provider/model 信息
4. 更新 `src/config/constants.ts` 移除硬编码默认模型

**验收标准**:
- CLI 可通过 `--provider openai --model gpt-4` 启动
- 页面 prompt 中包含当前使用的 provider/model 信息
- 不同 provider 的能力限制能正确向上层暴露

**预计文件修改**:
- `apps/cli/src/index.ts`
- `apps/cli/src/config/constants.ts`
- `apps/cli/src/components/SystemPrompt.tsx`

### 阶段 2: Plugin 通配路由支持 [P0-2] ✅ completed
**目标**: 修复插件子页面路由匹配问题

**任务**:
1. 在 `packages/prompt-renderer/src/browser/browser.ts` 增强 `matchPath` 函数
2. 支持 `*` 通配符匹配（如 `/plugin/:id/*`）
3. 确保插件子页面能正确进入 VNode -> prompt/tools 链路
4. 添加路由匹配单元测试

**验收标准**:
- `/plugin/foo/bar/baz` 能正确匹配 `/plugin/:id/*` 路由
- 插件子页面的工具能被正确抽取
- 路由参数正确传递给���件页面组件

**预计文件修改**:
- `packages/prompt-renderer/src/browser/browser.ts`
- 新增测试文件

### 阶段 3: 工具执行作用域修正 [P1-1] ✅ completed
**目标**: 避免工具执行时使用 root 级注入器

**任��**:
1. 修改 `packages/compiler/src/unified/tool-builder.ts`
2. 将 `root.get(tool)` 改为使用当前页面/会话的注入器
3. 确保工具执行上下文与页面上下文一致
4. 验证 Agent 隔离性未被破坏

**验收标准**:
- 工具执行时使用正确的作用域注入器
- 不同 Agent 的工具执行互不干扰
- 页面级依赖能正确注入到工具中

**预计文件修改**:
- `packages/compiler/src/unified/tool-builder.ts`
- 相关工具执行测试

### 阶段 4: SystemPrompt 增强 [P1-2] ✅ completed
**目标**: 将 SystemPrompt 改为页面状态驱动组件

**任务**:
1. 重构 `src/components/SystemPrompt.tsx` 为动态组件
2. 注入以下信息：
   - 当前 Agent 身份与角色
   - 当前任务状态
   - Provider 能力边界提示
   - 当前页面目标与可用工具概览
3. 支持多 Agent 协作规则描述

**验收标准**:
- SystemPrompt 根据当前页面/Agent/Provider 动态生成
- 包含清晰的能力边界说明
- 多 Agent 场景下能体现协作规则

**预计文件修改**:
- `apps/cli/src/components/SystemPrompt.tsx`
- 可能需要新增状态管理逻辑

## 错误记录
| 错误 | 尝试次数 | 解决方案 |
|------|---------|----------|
| - | - | - |

## 进度追踪
- 阶段 1: 未开始
- 阶段 2: 未开始
- 阶段 3: 未开始
- 阶段 4: 未开始

## 最终判定标准（Definition of Done）
根据 DESIGN_RULE.md，任意一次 LLM 请求都能追溯到：
1. 当前页面 VNode 生成的 prompt
2. 当前页面暴露的工具集合
3. 当前 agent/provider/model 的显式身份

新功能在代码评审中可被回答：
- "它在哪个页面暴露？"
- "它如何进入 tools 列表？"
- "它是否破坏 agent/provider 隔离？"
