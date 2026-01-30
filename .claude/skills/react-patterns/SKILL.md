---
name: react-patterns
description: React 包使用指南。面向使用 React 开发应用的开发者，涵盖核心包、工具包、测试工具的安装、使用场景和实际代码示例。包含状态管理集成、组件测试等常见使用场景。
---

# React 包使用指南

面向使用 React 开发应用的开发者的实用手册。涵盖 React 生态系统中各个包的用途、使用场景和代码示例。

## 包分类导航

### 1. 核心包
**[references/core-packages.md](references/core-packages.md)**

- `react` - React 核心库（组件、Hooks、Context）
- `react-dom` - DOM 渲染器（浏览器渲染、SSR、Portal）

**使用场景**: 所有 React 应用的基础

---

### 2. 工具包
**[references/utilities.md](references/utilities.md)**

- `react-is` - 检查 React 元素类型
- `use-sync-external-store` - 订阅外部状态管理库（Redux、Zustand）
- `use-subscription` - 订阅外部数据源（已废弃，推荐使用 use-sync-external-store）

**使用场景**: 类型检查、状态管理集成、外部数据订阅

---

### 3. 测试工具
**[references/testing.md](references/testing.md)**

- `react-test-renderer` - 快照测试和组件测试（不依赖 DOM）
- `jest-react` - Jest 测试工具
- `react-suspense-test-utils` - Suspense 测试工具

**使用场景**: 单元测试、快照测试、Suspense 测试

---

### 4. 开发工具
**[references/dev-tools.md](references/dev-tools.md)**

- `react-refresh` - 热模块替换（HMR）
- `eslint-plugin-react-hooks` - Hooks 规则检查
- `react-devtools` - React 开发者工具

**使用场景**: 开发环境配置、代码质量检查、调试

---

### 5. 高级/内部包
**[references/advanced.md](references/advanced.md)**

- `react-reconciler` - 自定义渲染器
- `scheduler` - 协作式调度器
- `react-server` - React Server Components
- `react-server-dom-*` - 服务端组件渲染（Webpack、Turbopack 等）

**使用场景**: 自定义渲染器、服务端组件、框架开发

---

## 快速查找

### 按使用场景查找

| 场景 | 推荐包 | 参考文档 |
|------|--------|----------|
| 创建 React 应用 | `react`, `react-dom` | [core-packages.md](references/core-packages.md) |
| 服务端渲染（SSR） | `react-dom/server` | [core-packages.md](references/core-packages.md) |
| 状态管理集成 | `use-sync-external-store` | [utilities.md](references/utilities.md) |
| 组件测试 | `react-test-renderer` | [testing.md](references/testing.md) |
| Hooks 规则检查 | `eslint-plugin-react-hooks` | [dev-tools.md](references/dev-tools.md) |
| 热模块替换 | `react-refresh` | [dev-tools.md](references/dev-tools.md) |
| 类型检查 | `react-is` | [utilities.md](references/utilities.md) |
| 自定义渲染器 | `react-reconciler` | [advanced.md](references/advanced.md) |
| Server Components | `react-server`, `react-server-dom-*` | [advanced.md](references/advanced.md) |

### 按包名查找

| 包名 | 用途 | 参考文档 |
|------|------|----------|
| `react` | React 核心库 | [core-packages.md](references/core-packages.md) |
| `react-dom` | DOM 渲染器 | [core-packages.md](references/core-packages.md) |
| `react-is` | 元素类型检查 | [utilities.md](references/utilities.md) |
| `use-sync-external-store` | 外部状态订阅 | [utilities.md](references/utilities.md) |
| `use-subscription` | 外部数据订阅（已废弃） | [utilities.md](references/utilities.md) |
| `react-test-renderer` | 快照测试 | [testing.md](references/testing.md) |
| `eslint-plugin-react-hooks` | Hooks 规则检查 | [dev-tools.md](references/dev-tools.md) |
| `react-refresh` | 热模块替换 | [dev-tools.md](references/dev-tools.md) |
| `react-reconciler` | 自定义渲染器 | [advanced.md](references/advanced.md) |
| `scheduler` | 协作式调度器 | [advanced.md](references/advanced.md) |

---

## 版本兼容性

当前文档基于 React 19.x 版本。

- React 19.x: 最新稳定版本
- React 18.x: 支持 Concurrent Features
- React 17.x: 过渡版本
- React 16.8+: 支持 Hooks

---

## 常见问题

### 我应该安装哪些包？

**最小化安装**（创建 React 应用）:
```bash
npm install react react-dom
```

**推荐安装**（包含开发工具）:
```bash
npm install react react-dom
npm install -D eslint-plugin-react-hooks react-test-renderer
```

### 如何选择状态管理方案？

- **内置方案**: `useState`, `useReducer`, `useContext`
- **外部库集成**: 使用 `use-sync-external-store` 集成 Redux、Zustand 等
- 详见 [utilities.md](references/utilities.md)

### 如何测试 React 组件？

- **快照测试**: 使用 `react-test-renderer`
- **DOM 测试**: 使用 `@testing-library/react`
- 详见 [testing.md](references/testing.md)

---

## 贡献指南

本文档基于 React 官方源码和文档整理。如有错误或遗漏，欢迎提交 PR。
