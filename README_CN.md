# claude-templates

### 基于 React 的 AI Agent 动态上下文管理框架

将 Web UI 范式应用到 AI Agent 上下文管理的创新框架 - 通过"虚拟网页"实现多 agent 共享上下文、动态渲染和智能隔离。

## 核心创新

### 给 AI Agent 看的"虚拟网页"

传统 AI Agent 使用静态文本作为上下文。本框架创造性地将 **Web UI 范式应用到 AI 上下文管理**：

- 使用 React 组件构建"虚拟网页"，渲染成 markdown prompt 给 AI Agent 看
- 页面中的 UI 元素（按钮、表单等）映射为 **Agent Tools**
- Agent 通过"点击"按钮（调用 tool）来操作和改变上下文
- 完全兼容 React 生态：响应式、hooks、状态管理等

**这不是给人看的网页，而是给 AI Agent 看的可交互上下文界面。**

### 多 Agent 共享上下文

通过 `@sker/prompt-renderer`，多个 agent 可以共享同一个上下文界面：

```typescript
// 创建共享的上下文"浏览器"
const browser = createBrowser({
  routes: [
    { path: '/dashboard', component: DashboardPage },
    { path: '/settings', component: SettingsPage }
  ]
});

// Agent A 打开页面
const page = browser.open('prompt://app/dashboard');

// Agent B 可以访问同一个上下文
// Agent 通过调用页面中的 tools 来改变共享上下文
```

### 路由驱动的上下文隔离

使用 Router 路由系统实现上下文隔离，防止上下文污染：

- **不同页面 = 不同上下文空间**
- 导航到新页面 = 切换上下文
- 每个路由可以有独立的 tools 和状态
- 通过编程方式动态控制上下文切换

```typescript
// 从 dashboard 导航到 settings，实现上下文隔离
browser.navigate('/settings');
```

### 动态上下文渲染

使用 React 的响应式特性实现动态上下文管理：

```typescript
function DynamicContextPage() {
  const [data, setData] = useState([]);

  // 响应式更新上下文
  useEffect(() => {
    // 数据变化时，上下文自动重新渲染
  }, [data]);

  return (
    <Page>
      <Button tool="refresh">刷新数据</Button>
      <DataList items={data} />
    </Page>
  );
}
```

- **响应式更新**：状态变化自动触发上下文重新渲染
- **Hooks 支持**：使用 useState、useEffect 等管理上下文状态
- **组件化**：复用 React 组件构建复杂上下文
- **完全可编程**：通过代码动态控制上下文内容和行为

## 架构设计

### 三层架构

```
┌─────────────────────────────────────┐
│   AI Agent (多个 agent 共享)        │
│   - 读取 markdown prompt            │
│   - 调用 tools (点击按钮)           │
│   - 改变共享上下文                  │
└─────────────────────────────────────┘
              ↕
┌─────────────────────────────────────┐
│   @sker/prompt-renderer             │
│   - React 组件 → Markdown           │
│   - UI 元素 → Agent Tools           │
│   - Router 路由系统                 │
│   - 虚拟 DOM 协调                   │
└─────────────────────────────────────┘
              ↕
┌─────────────────────────────────────┐
│   React 生态                        │
│   - 组件、Hooks、响应式             │
│   - 状态管理                        │
│   - 完整的 Web 开发范式             │
└─────────────────────────────────────┘
```

### 工作流程

1. **定义页面**：使用 React 组件定义上下文页面
2. **渲染 Prompt**：组件渲染成 markdown prompt
3. **提取 Tools**：UI 元素自动转换为 Agent Tools
4. **Agent 交互**：Agent 调用 tools 改变上下文
5. **响应式更新**：状态变化触发上下文重新渲染
6. **路由导航**：切换页面实现上下文隔离

## 核心包

### @sker/prompt-renderer

React 到 Markdown 的渲染引擎，为 AI Agent 提供可交互的上下文界面。

**核心功能：**
- **Reconciler**：虚拟 DOM 协调器，将 React 组件渲染为 markdown
- **Router**：路由系统，支持动态参数、历史记录、上下文隔离
- **Browser**：页面管理器，处理路由、渲染和 tool 执行
- **Tool 提取**：自动从 UI 元素提取 Agent Tools

**使用示例：**

```typescript
import { createBrowser, Page, Button } from '@sker/prompt-renderer';

// 定义上下文页面
function DashboardPage() {
  return (
    <Page>
      <h1>Dashboard</h1>
      <Button tool="refresh">刷新数据</Button>
      <Button tool="export">导出报告</Button>
    </Page>
  );
}

// 创建浏览器实例
const browser = createBrowser({
  routes: [
    {
      path: '/dashboard',
      component: DashboardPage,
      tools: [
        {
          name: 'refresh',
          handler: async () => { /* 刷新逻辑 */ },
          description: '刷新 dashboard 数据'
        },
        {
          name: 'export',
          handler: async () => { /* 导出逻辑 */ },
          description: '导出报告'
        }
      ]
    }
  ]
});

// 打开页面，获取 prompt 和 tools
const page = browser.open('prompt://app/dashboard');
const { prompt, tools } = page.render();

// prompt 是 markdown 格式的上下文
// tools 是可供 Agent 调用的工具列表
```

### @sker/core

轻量级依赖注入框架，为整个系统提供模块化架构基础。

**核心特性：**
- 4 层注入器层次结构（root → platform → application → feature）
- 7 种提供者类型，支持延迟加载
- 循环依赖检测和解决
- 生命周期钩子（OnInit、OnDestroy）
- APP_INITIALIZER 异步初始化

### 配置包

- `@sker/eslint-config` - 共享 ESLint 配置（扁平配置格式）
- `@sker/typescript-config` - TypeScript 配置

## 项目结构

```
claude-templates/
├── apps/
│   └── cli/                # CLI 应用（多 agent 通信系统）
├── packages/
│   ├── core/               # @sker/core - DI 框架
│   ├── prompt-renderer/    # @sker/prompt-renderer - 核心渲染引擎
│   ├── eslint-config/      # ESLint 配置
│   └── typescript-config/  # TypeScript 配置
├── .claude/                # Claude Code 配置
│   ├── agents/            # 12 个专业智能体
│   ├── commands/          # 23 个自定义命令
│   ├── contexts/          # 上下文配置
│   ├── rules/             # 编码标准和工作流
│   └── skills/            # 21 个领域技能
└── turbo.json             # Turborepo 配置
```

## 技术栈

- **包管理器**: pnpm 10.28.2
- **构建系统**: Turborepo 2.3.3
- **TypeScript**: 5.9.2
- **测试**: Vitest
- **核心技术**: React + 虚拟 DOM + Router

## 快速开始

### 安装

```bash
# 安装依赖
pnpm install

# 构建所有包
pnpm build
```

### 基础使用

```bash
# 开发模式
pnpm dev

# 运行测试
pnpm test

# 代码检查
pnpm lint
```

## 使用场景

### 1. 多 Agent 协作

多个 agent 共享同一个上下文界面，通过操作 UI 元素协同工作：

```typescript
// Agent A: 数据收集 agent
await callTool('collect-data');  // 点击"收集数据"按钮

// Agent B: 数据分析 agent（共享同一上下文）
await callTool('analyze');       // 点击"分析"按钮

// Agent C: 报告生成 agent
await callTool('generate-report'); // 点击"生成报告"按钮
```

### 2. 上下文隔离

使用路由在不同任务间切换，避免上下文污染：

```typescript
// 任务 1: 代码审查
browser.navigate('/code-review');
// 上下文: 代码文件、审查工具、问题列表

// 任务 2: 文档生成（完全隔离的上下文）
browser.navigate('/doc-generation');
// 上下文: 文档模板、生成工具、预览
```

### 3. 动态上下文

根据任务进展动态更新上下文：

```typescript
function TaskPage() {
  const [progress, setProgress] = useState(0);
  const [issues, setIssues] = useState([]);

  return (
    <Page>
      <Progress value={progress} />
      <IssueList items={issues} />
      <Button tool="next-step">下一步</Button>
    </Page>
  );
}
```

## 设计优势

### 1. 直观的交互模型
将熟悉的 Web UI 交互模式应用到 AI Agent，降低理解和使用门槛。

### 2. 强大的表达能力
React 组件的组合能力让复杂上下文的构建变得简单和可维护。

### 3. 完全可编程
通过代码精确控制上下文的内容、结构和行为，实现真正的动态上下文管理。

### 4. 上下文隔离
路由系统提供天然的上下文边界，防止不同任务间的上下文污染。

### 5. 生态兼容
完全兼容 React 生态系统，可以使用现有的组件库、状态管理方案和开发工具。

## 许可证

私有项目
