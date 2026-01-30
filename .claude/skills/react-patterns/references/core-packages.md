# 核心包

React 应用的基础包，包含核心库和 DOM 渲染器。

---

## react

React 核心库，提供组件、Hooks、Context 等基础 API。

### 安装

```bash
npm install react
```

### 核心功能

#### 1. 组件开发

**函数组件**（推荐）:
```tsx
function Welcome({ name }: { name: string }) {
  return <h1>Hello, {name}</h1>
}
```

**类组件**（遗留）:
```tsx
class Welcome extends React.Component<{ name: string }> {
  render() {
    return <h1>Hello, {this.props.name}</h1>
  }
}
```

#### 2. Hooks

**状态管理**:
```tsx
import { useState } from 'react'

function Counter() {
  const [count, setCount] = useState(0)

  return (
    <button onClick={() => setCount(count + 1)}>
      Count: {count}
    </button>
  )
}
```

**副作用处理**:
```tsx
import { useEffect } from 'react'

function DataFetcher({ userId }: { userId: string }) {
  const [data, setData] = useState(null)

  useEffect(() => {
    fetch(`/api/users/${userId}`)
      .then(res => res.json())
      .then(setData)
  }, [userId])

  return <div>{data?.name}</div>
}
```

**复杂状态管理**:
```tsx
import { useReducer } from 'react'

type State = { count: number }
type Action = { type: 'increment' } | { type: 'decrement' }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'increment':
      return { count: state.count + 1 }
    case 'decrement':
      return { count: state.count - 1 }
    default:
      return state
  }
}

function Counter() {
  const [state, dispatch] = useReducer(reducer, { count: 0 })

  return (
    <>
      <p>Count: {state.count}</p>
      <button onClick={() => dispatch({ type: 'increment' })}>+</button>
      <button onClick={() => dispatch({ type: 'decrement' })}>-</button>
    </>
  )
}
```

**性能优化**:
```tsx
import { useMemo, useCallback } from 'react'

function ExpensiveComponent({ items }: { items: number[] }) {
  // 缓存计算结果
  const total = useMemo(() => {
    return items.reduce((sum, item) => sum + item, 0)
  }, [items])

  // 缓存回调函数
  const handleClick = useCallback(() => {
    console.log('Total:', total)
  }, [total])

  return <button onClick={handleClick}>Total: {total}</button>
}
```

**引用管理**:
```tsx
import { useRef } from 'react'

function TextInput() {
  const inputRef = useRef<HTMLInputElement>(null)

  const focusInput = () => {
    inputRef.current?.focus()
  }

  return (
    <>
      <input ref={inputRef} />
      <button onClick={focusInput}>Focus</button>
    </>
  )
}
```

#### 3. Context API

**跨组件状态共享**:
```tsx
import { createContext, useContext } from 'react'

const ThemeContext = createContext<'light' | 'dark'>('light')

function App() {
  return (
    <ThemeContext.Provider value="dark">
      <Toolbar />
    </ThemeContext.Provider>
  )
}

function Toolbar() {
  return <ThemedButton />
}

function ThemedButton() {
  const theme = useContext(ThemeContext)
  return <button className={theme}>Themed Button</button>
}
```

#### 4. JSX Runtime

**自动导入**（React 17+）:
```tsx
// 不需要手动导入 React
function App() {
  return <div>Hello</div>
}
```

**手动导入**（React 16）:
```tsx
import React from 'react'

function App() {
  return <div>Hello</div>
}
```

### 使用场景

| 场景 | API | 示例 |
|------|-----|------|
| 简单状态 | `useState` | 表单输入、开关状态 |
| 复杂状态 | `useReducer` | 购物车、多步骤表单 |
| 数据获取 | `useEffect` | API 调用、订阅 |
| 性能优化 | `useMemo`, `useCallback` | 昂贵计算、回调传递 |
| DOM 操作 | `useRef` | 焦点管理、动画 |
| 跨组件共享 | `Context` | 主题、用户信息、语言 |

---

## react-dom

React 的 DOM 渲染器，用于在浏览器中渲染 React 组件。

### 安装

```bash
npm install react-dom
```

### 核心功能

#### 1. 客户端渲染

**React 19+ (推荐)**:
```tsx
import { createRoot } from 'react-dom/client'

const root = createRoot(document.getElementById('root')!)
root.render(<App />)
```

**React 18-**:
```tsx
import ReactDOM from 'react-dom'

ReactDOM.render(<App />, document.getElementById('root'))
```

#### 2. 服务端渲染 (SSR)

**Node.js 环境**:
```tsx
import { renderToString } from 'react-dom/server'

const html = renderToString(<App />)
// 返回 HTML 字符串
```

**流式渲染**（React 18+）:
```tsx
import { renderToPipeableStream } from 'react-dom/server'

const { pipe } = renderToPipeableStream(<App />, {
  onShellReady() {
    response.setHeader('content-type', 'text/html')
    pipe(response)
  }
})
```

**Edge 环境**（Cloudflare Workers、Vercel Edge）:
```tsx
import { renderToReadableStream } from 'react-dom/server.edge'

const stream = await renderToReadableStream(<App />)
return new Response(stream, {
  headers: { 'content-type': 'text/html' }
})
```

**静态生成**:
```tsx
import { renderToStaticMarkup } from 'react-dom/server'

const html = renderToStaticMarkup(<App />)
// 不包含 React 运行时属性
```

#### 3. Portal

**渲染到 DOM 树外部**:
```tsx
import { createPortal } from 'react-dom'

function Modal({ children }: { children: React.ReactNode }) {
  return createPortal(
    <div className="modal">{children}</div>,
    document.body
  )
}

function App() {
  return (
    <div>
      <h1>App</h1>
      <Modal>
        <p>Modal content</p>
      </Modal>
    </div>
  )
}
```

#### 4. Hydration

**客户端激活 SSR 内容**:
```tsx
import { hydrateRoot } from 'react-dom/client'

const root = hydrateRoot(
  document.getElementById('root')!,
  <App />
)
```

#### 5. 测试工具

**模拟用户交互**:
```tsx
import { act } from 'react-dom/test-utils'

await act(async () => {
  root.render(<App />)
})
```

### 导出路径

React DOM 提供多个导出路径用于不同环境：

| 导出路径 | 用途 | 环境 |
|---------|------|------|
| `react-dom/client` | 客户端渲染 | 浏览器 |
| `react-dom/server` | 服务端渲染 | Node.js |
| `react-dom/server.edge` | Edge 渲染 | Cloudflare Workers, Vercel Edge |
| `react-dom/server.browser` | 浏览器 SSR | Web Workers |
| `react-dom/test-utils` | 测试工具 | 测试环境 |

### 使用场景

| 场景 | API | 示例 |
|------|-----|------|
| 单页应用 | `createRoot` | Create React App, Vite |
| 服务端渲染 | `renderToString` | Next.js, Remix |
| 流式 SSR | `renderToPipeableStream` | Next.js App Router |
| Edge 渲染 | `renderToReadableStream` | Vercel Edge Functions |
| 静态生成 | `renderToStaticMarkup` | 邮件模板、静态 HTML |
| 模态框 | `createPortal` | 对话框、提示框、下拉菜单 |
| SSR 激活 | `hydrateRoot` | 所有 SSR 应用 |

---

## 完整示例

### 创建 React 应用

**package.json**:
```json
{
  "dependencies": {
    "react": "^19.3.0",
    "react-dom": "^19.3.0"
  }
}
```

**index.tsx**:
```tsx
import { createRoot } from 'react-dom/client'
import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div>
      <h1>Counter: {count}</h1>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  )
}

const root = createRoot(document.getElementById('root')!)
root.render(<App />)
```

### Next.js SSR 示例

**app/page.tsx**:
```tsx
import { Suspense } from 'react'

async function getData() {
  const res = await fetch('https://api.example.com/data')
  return res.json()
}

export default async function Page() {
  const data = await getData()

  return (
    <div>
      <h1>{data.title}</h1>
      <Suspense fallback={<div>Loading...</div>}>
        <AsyncComponent />
      </Suspense>
    </div>
  )
}
```

---

## 常见问题

### 为什么需要同时安装 react 和 react-dom？

- `react`: 提供核心 API（组件、Hooks、Context）
- `react-dom`: 提供 DOM 渲染能力

React 核心与渲染器分离，允许使用不同渲染器（react-native、react-three-fiber 等）。

### createRoot vs render 的区别？

- `createRoot` (React 18+): 支持并发特性（Suspense、Transitions）
- `render` (React 17-): 遗留 API，不支持并发特性

推荐使用 `createRoot`。

### 何时使用 Portal？

当需要渲染到父组件 DOM 层级之外时：
- 模态框（避免 z-index 问题）
- 提示框（需要固定定位）
- 下拉菜单（避免 overflow 裁剪）

### SSR vs 静态生成？

- **SSR** (`renderToString`): 每次请求时渲染，适合动态内容
- **静态生成** (`renderToStaticMarkup`): 构建时渲染，适合静态内容

---

## 版本兼容性

- React 19.x: 最新稳定版本，支持 Server Components
- React 18.x: 支持并发特性（Suspense、Transitions）
- React 17.x: 过渡版本，新 JSX Transform
- React 16.8+: 支持 Hooks

---

## 相关资源

- [React 官方文档](https://react.dev/)
- [React DOM API 参考](https://react.dev/reference/react-dom)
- [Hooks API 参考](https://react.dev/reference/react)
