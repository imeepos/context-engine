# 开发工具

React 生态系统中的开发工具，用于热模块替换、代码质量检查和调试。

---

## react-refresh

React 热模块替换（HMR）运行时，支持在不丢失状态的情况下更新组件。

### 安装

```bash
npm install -D react-refresh
```

### 核心功能

React Refresh 允许在开发时实时更新组件而不丢失状态。

#### 运行时 API

```tsx
import * as RefreshRuntime from 'react-refresh/runtime'

// 初始化
RefreshRuntime.injectIntoGlobalHook(window)

// 注册组件
RefreshRuntime.register(Component, 'ComponentName')

// 执行刷新
RefreshRuntime.performReactRefresh()
```

### 使用场景

#### 1. Webpack 集成

**安装插件**:
```bash
npm install -D @pmmmwh/react-refresh-webpack-plugin react-refresh
```

**webpack.config.js**:
```js
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin')

module.exports = {
  mode: 'development',
  module: {
    rules: [
      {
        test: /\.[jt]sx?$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              plugins: ['react-refresh/babel']
            }
          }
        ]
      }
    ]
  },
  plugins: [
    new ReactRefreshWebpackPlugin()
  ]
}
```

#### 2. Vite 集成

**vite.config.ts**:
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react({
      // React Refresh 默认启用
      fastRefresh: true
    })
  ]
})
```

#### 3. Next.js 集成

Next.js 默认启用 React Refresh，无需额外配置。

#### 4. 自定义集成

**Babel 配置**:
```json
{
  "plugins": ["react-refresh/babel"]
}
```

**运行时初始化**:
```tsx
// 仅在开发环境
if (process.env.NODE_ENV === 'development') {
  const RefreshRuntime = require('react-refresh/runtime')
  RefreshRuntime.injectIntoGlobalHook(window)
  window.$RefreshReg$ = () => {}
  window.$RefreshSig$ = () => (type) => type
}
```

### 限制

React Refresh 无法保留以下情况的状态：
- 类组件
- 高阶组件（HOC）
- 匿名函数组件
- 导出的非组件值

**示例**:
```tsx
// ❌ 无法保留状态（匿名函数）
export default () => <div>Hello</div>

// ✅ 可以保留状态（命名函数）
export default function App() {
  return <div>Hello</div>
}

// ❌ 无法保留状态（类组件）
export default class App extends React.Component {
  render() {
    return <div>Hello</div>
  }
}
```

---

## eslint-plugin-react-hooks

ESLint 插件，用于检查 React Hooks 使用规则。

### 安装

```bash
npm install -D eslint eslint-plugin-react-hooks
```

### 配置

**.eslintrc.json**:
```json
{
  "plugins": ["react-hooks"],
  "rules": {
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn"
  }
}
```

**ESLint 9+ (Flat Config)**:
```js
import reactHooks from 'eslint-plugin-react-hooks'

export default [
  {
    plugins: {
      'react-hooks': reactHooks
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn'
    }
  }
]
```

### 规则说明

#### 1. rules-of-hooks

检查 Hooks 调用规则：
- 只在顶层调用 Hooks
- 只在 React 函数中调用 Hooks

**错误示例**:
```tsx
// ❌ 在条件语句中调用
function Component({ condition }) {
  if (condition) {
    const [state, setState] = useState(0) // 错误
  }
}

// ❌ 在循环中调用
function Component({ items }) {
  items.forEach(item => {
    const [state, setState] = useState(0) // 错误
  })
}

// ❌ 在普通函数中调用
function helper() {
  const [state, setState] = useState(0) // 错误
}
```

**正确示例**:
```tsx
// ✅ 在顶层调用
function Component({ condition }) {
  const [state, setState] = useState(0)

  if (condition) {
    setState(1)
  }
}

// ✅ 在自定义 Hook 中调用
function useCustomHook() {
  const [state, setState] = useState(0)
  return [state, setState]
}
```

#### 2. exhaustive-deps

检查 useEffect、useCallback、useMemo 的依赖数组。

**错误示例**:
```tsx
// ❌ 缺少依赖
function Component({ userId }) {
  useEffect(() => {
    fetchUser(userId)
  }, []) // 警告：缺少 userId
}

// ❌ 不必要的依赖
function Component() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    console.log('mounted')
  }, [count]) // 警告：count 未使用
}
```

**正确示例**:
```tsx
// ✅ 包含所有依赖
function Component({ userId }) {
  useEffect(() => {
    fetchUser(userId)
  }, [userId])
}

// ✅ 使用 useCallback 稳定函数引用
function Component({ onUpdate }) {
  const [count, setCount] = useState(0)

  const handleClick = useCallback(() => {
    onUpdate(count)
  }, [count, onUpdate])

  useEffect(() => {
    // handleClick 是稳定的引用
  }, [handleClick])
}
```

### 使用场景

#### 1. 项目初始化

**package.json**:
```json
{
  "scripts": {
    "lint": "eslint src --ext .js,.jsx,.ts,.tsx",
    "lint:fix": "eslint src --ext .js,.jsx,.ts,.tsx --fix"
  }
}
```

#### 2. CI/CD 集成

**GitHub Actions**:
```yaml
name: Lint
on: [push, pull_request]
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run lint
```

#### 3. 编辑器集成

**VS Code (.vscode/settings.json)**:
```json
{
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ],
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

---

## react-devtools

React 开发者工具，用于调试 React 应用。

### 安装

#### 浏览器扩展

- [Chrome](https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi)
- [Firefox](https://addons.mozilla.org/en-US/firefox/addon/react-devtools/)
- [Edge](https://microsoftedge.microsoft.com/addons/detail/react-developer-tools/gpphkfbcpidddadnkolkpfckpihlkkil)

#### 独立应用

```bash
npm install -g react-devtools
react-devtools
```

#### 嵌入式（用于 React Native���

```bash
npm install -D react-devtools-core
```

### 核心功能

#### 1. 组件树查看

- 查看组件层级结构
- 查看组件 props 和 state
- 编辑 props 和 state
- 查看 Hooks 状态

#### 2. Profiler

- 记录组件渲染性能
- 查看渲染时间
- 识别性能瓶颈
- 分析渲染原因

#### 3. 高亮更新

- 高亮重新渲染的组件
- 识别不必要的渲染

### 使用场景

#### 1. 调试组件状态

```tsx
function Counter() {
  const [count, setCount] = useState(0)

  // 在 DevTools 中可以：
  // 1. 查看 count 的当前值
  // 2. 直接修改 count 的值
  // 3. 查看 setCount 的调用栈

  return <button onClick={() => setCount(count + 1)}>{count}</button>
}
```

#### 2. 性能分析

```tsx
import { Profiler } from 'react'

function App() {
  return (
    <Profiler
      id="App"
      onRender={(id, phase, actualDuration) => {
        console.log(`${id} (${phase}) took ${actualDuration}ms`)
      }}
    >
      <ExpensiveComponent />
    </Profiler>
  )
}
```

#### 3. React Native 调试

```tsx
// index.js
import { AppRegistry } from 'react-native'
import { connectToDevTools } from 'react-devtools-core'

if (__DEV__) {
  connectToDevTools({
    host: 'localhost',
    port: 8097
  })
}

AppRegistry.registerComponent('App', () => App)
```

---

## 完整示例

### 开发环境配置

**package.json**:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint src --ext .js,.jsx,.ts,.tsx",
    "lint:fix": "eslint src --ext .js,.jsx,.ts,.tsx --fix"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.0.0",
    "eslint": "^8.0.0",
    "eslint-plugin-react-hooks": "^7.0.0",
    "react-refresh": "^0.19.0",
    "vite": "^5.0.0"
  }
}
```

**vite.config.ts**:
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react({
      // React Refresh 配置
      fastRefresh: true,
      // Babel 插件
      babel: {
        plugins: ['react-refresh/babel']
      }
    })
  ]
})
```

**.eslintrc.json**:
```json
{
  "extends": [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended"
  ],
  "plugins": ["react", "react-hooks"],
  "rules": {
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn"
  },
  "settings": {
    "react": {
      "version": "detect"
    }
  }
}
```

---

## 常见问题

### React Refresh 不工作？

检查以下几点：
1. 组件是否为命名函数（不是匿名函数）
2. 是否正确配置 Babel 插件
3. 是否在开发模式下运行
4. 是否有语法错误

### 如何禁用 exhaustive-deps 警告？

```tsx
// 单行禁用
useEffect(() => {
  // ...
}, []) // eslint-disable-line react-hooks/exhaustive-deps

// 整个文件禁用（不推荐）
/* eslint-disable react-hooks/exhaustive-deps */
```

### React DevTools 无法连接？

1. 确保安装了浏览器扩展
2. 检查是否在开发模式下运行
3. 清除浏览器缓存
4. 重启浏览器

### 如何在生产环境禁用 DevTools？

React 会自动在生产构建中禁用 DevTools。确保使用生产构建：

```bash
# Vite
npm run build

# Next.js
npm run build

# Create React App
npm run build
```

---

## 最佳实践

### 1. 始终启用 Hooks 规则检查

```json
{
  "rules": {
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn"
  }
}
```

### 2. 使用命名函数组件

```tsx
// ✅ 支持 React Refresh
export default function App() {
  return <div>Hello</div>
}

// ❌ 不支持 React Refresh
export default () => <div>Hello</div>
```

### 3. 定期使用 Profiler

在开发过程中定期使用 Profiler 检查性能：
1. 打开 React DevTools
2. 切换到 Profiler 标签
3. 点击录制按钮
4. 执行操作
5. 停止录制并分析结果

### 4. 修复所有 ESLint 警告

不要忽略 `exhaustive-deps` 警告，它们通常指示潜在的 bug。

---

## 相关资源

- [React Refresh 文档](https://github.com/facebook/react/tree/main/packages/react-refresh)
- [eslint-plugin-react-hooks](https://www.npmjs.com/package/eslint-plugin-react-hooks)
- [React DevTools](https://react.dev/learn/react-developer-tools)
