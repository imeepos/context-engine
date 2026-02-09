# DESIGN_RULE

## 目标
本文档将当前系统源码与以下核心原则对齐，并将其固化为可执行的设计规则：
1. 每个 LLM 有自己的厂商、训练背景与能力边界。
2. 每个 LLM/Agent 都是独立个体。
3. 通过 CLI 的 UI Renderer 获取上下文与可执行工具/能力。
4. 所有功能实现围绕“构建上下文 + 工具”的 React VNode 页面展开。

## 一、源码现状与原则映射

### 原则1：LLM 多厂商与能力差异
- 已实现：
  - 统一 Provider 抽象：`packages/compiler/src/llm/adapter.ts`
  - 多厂商适配器：
    - Anthropic：`packages/compiler/src/llm/adapters/anthropic.adapter.ts`
    - OpenAI：`packages/compiler/src/llm/adapters/openai.adapter.ts`
    - Google：`packages/compiler/src/llm/adapters/google.adapter.ts`
  - 统一 AST 与跨厂商请求/响应转换：
    - `packages/compiler/src/ast.ts`
    - `packages/compiler/src/unified/request-transformer.ts`
- 当前偏差：
  - CLI 入口仅注入 `LLM_ANTHROPIC_CONFIG`，且默认模型固定为 Claude：
    - `apps/cli/src/index.ts`
    - `apps/cli/src/config/constants.ts`
  - 结果是“框架支持多厂商”，但“CLI 运行时策略仍偏单厂商”。

### 原则2：LLM/Agent 独立个体
- 已实现：
  - 每个 CLI 实例注册独立 agent identity（含心跳、在线状态）：`apps/cli/src/services/agent-registry.service.ts`
  - 消息按 agent 队列隔离、读写分离：`apps/cli/src/services/message-broker.service.ts`
  - 当前 Agent ID 注入到运行上下文：`apps/cli/src/index.ts`（`CURRENT_AGENT_ID`）
- 设计结论：
  - “个体独立性”在进程身份、消息队列、任务归属层面已具备。

### 原则3：上下文与可执行能力来自 UI Renderer
- 已实现（主链路）：
  - 会话输入前刷新页面：`apps/cli/src/handlers/input-handler.ts`
  - 页面渲染得到 `prompt + tools`：`packages/prompt-renderer/src/browser/browser.ts`（`Page.render`）
  - 工具由 VNode 抽取：`packages/prompt-renderer/src/reconciler/extractor.ts`
  - Tool Loop 执行后可刷新 prompt/tools（环境再采样）：`packages/compiler/src/llm/tool-loop.ts`
- 设计结论：
  - 当前系统核心运行方式是“页面即上下文、页面即能力清单”。

### 原则4：功能围绕 React VNode 页面构建
- 已实现：
  - 路由 + 页面组件：`apps/cli/src/router.tsx`
  - 页面中通过 `<Tool>` / `<ToolUse>` / `<Link>` 声明能力：
    - `packages/prompt-renderer/src/components/Tool.tsx`
    - `packages/prompt-renderer/src/components/Link.tsx`
  - VNode -> Markdown prompt：`packages/prompt-renderer/src/reconciler/renderer.ts`
- 设计结论：
  - UI、上下文、工具暴露形成统一“页面驱动”范式，这是系统最核心资产。

## 二、强制设计规则（Design Rules）

### Rule A：Provider 能力隔离（MUST）
- 任何 LLM 调用必须显式绑定 Provider 与模型，不允许隐式依赖单一厂商默认值。
- 新增厂商能力时，必须走统一 AST/Transformer/Adapter 三层，不允许页面层直接耦合 SDK。
- 必须保留 provider-specific 限制（如不支持的内容类型）并向上层透明暴露错误。

### Rule B：Agent 个体隔离（MUST）
- Agent 的身份、任务、消息、心跳必须可独立演进，禁止跨 Agent 共享可变运行态。
- 与 Agent 有关的存储键必须按 agent 维度分区（如 `messages/{agentId}`）。
- 页面或工具内不得假设“只有一个全局 Agent”。

### Rule C：UI Renderer 是唯一上下文入口（MUST）
- 发送给 LLM 的系统上下文，必须来自 `UIRenderer.render/refresh` 的结果。
- 可执行工具清单必须来自当前页面 VNode 抽取结果，不得旁路拼装隐藏工具。
- 工具执行后若状态变更，必须通过 `refreshPrompt` 重新采样上下文和工具。

### Rule D：页面驱动能力暴露（MUST）
- 新功能先定义页面语义（展示什么、能做什么），再定义服务实现。
- 对 LLM 可见的操作必须通过页面声明（`<Tool>` / `<ToolUse>` / `<Link>`）。
- 若功能无法映射为页面能力，不应直接接入主会话链路。

### Rule E：工具定义可验证（MUST）
- 每个工具必须具备稳定名称、清晰描述、参数 schema（zod/json schema）。
- 工具执行必须返回结构化结果（至少含 success/error 语义），便于 tool-loop 判定。
- 禁止在工具内吞错，必须将错误显式回传到模型循环。

### Rule F：插件能力并入同一范式（SHOULD）
- 插件页面输出也必须进入同一 VNode -> prompt/tools 链路。
- 插件能力注入需要可追踪（来源插件、作用域、权限边界）。
- 插件不应绕过 `UIRenderer` 直接向 LLM 注入隐式上下文。

## 三、当前关键偏差（建议优先整改）

### P0：CLI 的多 Provider 策略未完成
- 现状：运行入口只注入 Anthropic 配置，默认模型固定为 Claude。
- 影响：原则1在“框架层成立”，在“产品运行态不成立”。
- 建议：
  - 在 `apps/cli/src/index.ts` 增加 `--provider`、`--model`、各厂商配置注入策略。
  - 在页面上下文中暴露当前 provider/model，避免模型误判自身能力。

### P0：Plugin 路由通配匹配与页面中心原则冲突
- 现状：`/plugin/:id/*` 已在路由声明，但 `Browser.matchPath` 目前不支持 `*` 通配。
- 文件：
  - 路由声明：`apps/cli/src/router.tsx`
  - 路由匹配：`packages/prompt-renderer/src/browser/browser.ts`
- 影响：插件子页面能力可能无法稳定进入“页面即上下文/工具”主链路。

### P1：`ToolUse` 执行默认走全局 root，而非当前页面注入器
- 现状：`buildUnifiedTool` 使用 `root.get(tool)` 获取实例。
- 文件：`packages/compiler/src/unified/tool-builder.ts`
- 影响：工具执行上下文可能偏离当前会话/页面作用域，削弱“个体隔离 + 页面上下文一致性”。

### P1：SystemPrompt 过于弱语义
- 现状：`apps/cli/src/components/SystemPrompt.tsx` 仅固定文案。
- 影响：无法体现“多 Agent 协作规则、能力边界、当前页面目标”。
- 建议：将 SystemPrompt 改为页面状态驱动组件，纳入 Agent 身份、任务态、provider 能力提示。

## 四、后续实现准则（落地顺序）
1. 先修正运行时入口与路由匹配（Provider 参数化 + plugin 通配路由）。
2. 再收敛工具执行作用域（避免 root 级泄漏）。
3. 最后增强页面语义层（SystemPrompt 与页面级能力叙事）。

## 五、最终判定标准（Definition of Done）
- 任意一次 LLM 请求都能追溯到：
  1) 当前页面 VNode 生成的 prompt；
  2) 当前页面暴露的工具集合；
  3) 当前 agent/provider/model 的显式身份。
- 新功能在代码评审中可被回答：
  - “它在哪个页面暴露？”
  - “它如何进入 tools 列表？”
  - “它是否破坏 agent/provider 隔离？”

核心理念：面向 AI

**为什么面向 AI？**
- AI 擅长生成结构化的类型定义
- 类型系统比文件路径更容易被 AI 理解
- multi 注入允许 AI 逐步添加 
- 无需文件系统操作，更简单、更安全
- 依赖注入类的的构建复杂度

以上规则作为本项目的长期设计约束，优先级高于局部实现便利性。
