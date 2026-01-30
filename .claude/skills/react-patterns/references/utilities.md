# 工具包

React 生态系统中的实用工具包，用于类型检查、状态管理集成和外部数据订阅。

---

## react-is

检查 React 元素类型的工具包。

### 安装

```bash
npm install react-is
```

### 核心功能

#### 类型检查 API

```tsx
import * as ReactIs from 'react-is'

// 检查元素类型
ReactIs.isElement(value)           // 是否为 React 元素
ReactIs.isValidElementType(value)  // 是否为有效的元素类型

// 检查组件类型
ReactIs.isFragment(value)          // 是否为 Fragment
ReactIs.isPortal(value)            // 是否为 Portal
ReactIs.isContextConsumer(value)   // 是否为 Context Consumer
ReactIs.isContextProvider(value)   // 是否为 Context Provider
ReactIs.isSuspense(value)          // 是否为 Suspense
ReactIs.isLazy(value)              // 是否为 Lazy 组件
ReactIs.isMemo(value)              // 是否为 Memo 组件
ReactIs.isForwardRef(value)        // 是否为 ForwardRef
```

### 使用场景

#### 1. 组件库开发

**验证子组件类型**:
```tsx
import { isValidElement, Children } from 'react'
import { isFragment } from 'react-is'

function Tabs({ children }: { children: React.ReactNode }) {
  const tabs = Children.toArray(children).filter(child => {
    if (!isValidElement(child)) return false
    return child.type === Tab
  })

  return <div className="tabs">{tabs}</div>
}
```

#### 2. 高阶组件

**检查包装的组件类型**:
```tsx
import { isForwardRef, isMemo } from 'react-is'

function withLogging<P>(Component: React.ComponentType<P>) {
  // 检查是否为 ForwardRef
  if (isForwardRef(Component)) {
    console.log('Wrapping a ForwardRef component')
  }

  // 检查是否为 Memo 组件
  if (isMemo(Component)) {
    console.log('Wrapping a Memo component')
  }

  return (props: P) => {
    console.log('Rendering with props:', props)
    return <Component {...props} />
  }
}
```

#### 3. 调试工具

**分析组件树**:
```tsx
import { isElement, isFragment, isSuspense } from 'react-is'

function analyzeTree(node: React.ReactNode): string {
  if (isElement(node)) {
    if (isFragment(node)) return 'Fragment'
    if (isSuspense(node)) return 'Suspense'
    return typeof node.type === 'string' ? node.type : 'Component'
  }
  return 'Non-element'
}
```

---

## use-sync-external-store

订阅外部状态管理库的 Hook，用于集成 Redux、Zustand、MobX 等。

### 安装

```bash
npm install use-sync-external-store
```

### 核心功能

#### 基础 API

```tsx
import { useSyncExternalStore } from 'use-sync-external-store/shim'

const state = useSyncExternalStore(
  subscribe,      // 订阅函数
  getSnapshot,    // 获取快照函数
  getServerSnapshot? // 服务端快照函数（可选）
)
```

### 使用场景

#### 1. 集成 Redux

**订阅 Redux Store**:
```tsx
import { useSyncExternalStore } from 'use-sync-external-store/shim'
import { store } from './store'

function useReduxState<T>(selector: (state: RootState) => T): T {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState()),
    () => selector(store.getState()) // SSR
  )
}

// 使用
function Counter() {
  const count = useReduxState(state => state.counter.value)
  return <div>Count: {count}</div>
}
```

#### 2. 集成 Zustand

**自定义 Store Hook**:
```tsx
import { useSyncExternalStore } from 'use-sync-external-store/shim'

type Store<T> = {
  getState: () => T
  setState: (partial: Partial<T>) => void
  subscribe: (listener: () => void) => () => void
}

function createStore<T>(initialState: T): Store<T> {
  let state = initialState
  const listeners = new Set<() => void>()

  return {
    getState: () => state,
    setState: (partial) => {
      state = { ...state, ...partial }
      listeners.forEach(listener => listener())
    },
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    }
  }
}

// 创建 store
const counterStore = createStore({ count: 0 })

// 使用 hook
function useCounter() {
  return useSyncExternalStore(
    counterStore.subscribe,
    counterStore.getState
  )
}

function Counter() {
  const { count } = useCounter()
  return (
    <button onClick={() => counterStore.setState({ count: count + 1 })}>
      Count: {count}
    </button>
  )
}
```

#### 3. 订阅浏览器 API

**监听窗口大小**:
```tsx
import { useSyncExternalStore } from 'use-sync-external-store/shim'

function useWindowSize() {
  return useSyncExternalStore(
    (callback) => {
      window.addEventListener('resize', callback)
      return () => window.removeEventListener('resize', callback)
    },
    () => ({ width: window.innerWidth, height: window.innerHeight }),
    () => ({ width: 0, height: 0 }) // SSR fallback
  )
}

function WindowInfo() {
  const { width, height } = useWindowSize()
  return <div>Window: {width} x {height}</div>
}
```

**监听在线状态**:
```tsx
function useOnlineStatus() {
  return useSyncExternalStore(
    (callback) => {
      window.addEventListener('online', callback)
      window.addEventListener('offline', callback)
      return () => {
        window.removeEventListener('online', callback)
        window.removeEventListener('offline', callback)
      }
    },
    () => navigator.onLine,
    () => true // SSR 默认在线
  )
}

function OnlineIndicator() {
  const isOnline = useOnlineStatus()
  return <div>{isOnline ? '🟢 Online' : '🔴 Offline'}</div>
}
```

#### 4. 带选择器的订阅

**使用 with-selector**:
```tsx
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/with-selector'

function useReduxState<T>(selector: (state: RootState) => T): T {
  return useSyncExternalStoreWithSelector(
    store.subscribe,
    store.getState,
    store.getState,
    selector,
    (a, b) => a === b // 自定义比较函数
  )
}

// 只在 count 变化时重新渲染
function Counter() {
  const count = useReduxState(state => state.counter.value)
  return <div>Count: {count}</div>
}
```

### 导出路径

| 导出路径 | 用途 |
|---------|------|
| `use-sync-external-store/shim` | 兼容 React 16.8+ 的 shim |
| `use-sync-external-store/with-selector` | 带选择器的版本 |
| `use-sync-external-store/shim/with-selector` | 带选择器的 shim 版本 |

---

## use-subscription

订阅外部数据源的 Hook（已废弃，推荐使用 `use-sync-external-store`）。

### 安装

```bash
npm install use-subscription
```

### 核心功能

```tsx
import { useSubscription } from 'use-subscription'

const value = useSubscription({
  getCurrentValue: () => source.getValue(),
  subscribe: (callback) => {
    source.subscribe(callback)
    return () => source.unsubscribe(callback)
  }
})
```

### 迁移到 use-sync-external-store

**旧代码**:
```tsx
import { useSubscription } from 'use-subscription'

const subscription = useMemo(
  () => ({
    getCurrentValue: () => store.getState(),
    subscribe: store.subscribe
  }),
  [store]
)

const value = useSubscription(subscription)
```

**新代码**:
```tsx
import { useSyncExternalStore } from 'use-sync-external-store/shim'

const value = useSyncExternalStore(
  store.subscribe,
  store.getState
)
```

---

## 完整示例

### 自定义状态管理库

```tsx
import { useSyncExternalStore } from 'use-sync-external-store/shim'

// 创建简单的状态管理库
function createStore<T>(initialState: T) {
  let state = initialState
  const listeners = new Set<() => void>()

  return {
    getState: () => state,
    setState: (newState: T | ((prev: T) => T)) => {
      state = typeof newState === 'function'
        ? (newState as (prev: T) => T)(state)
        : newState
      listeners.forEach(listener => listener())
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    }
  }
}

// 创建 store
const todoStore = createStore<{ todos: string[] }>({ todos: [] })

// 创建 hook
function useTodos() {
  return useSyncExternalStore(
    todoStore.subscribe,
    () => todoStore.getState().todos
  )
}

// 使用
function TodoList() {
  const todos = useTodos()

  const addTodo = () => {
    const newTodo = prompt('Enter todo:')
    if (newTodo) {
      todoStore.setState(prev => ({
        todos: [...prev.todos, newTodo]
      }))
    }
  }

  return (
    <div>
      <button onClick={addTodo}>Add Todo</button>
      <ul>
        {todos.map((todo, i) => (
          <li key={i}>{todo}</li>
        ))}
      </ul>
    </div>
  )
}
```

---

## 常见问题

### 何时使用 react-is？

- 开发组件库时验证子组件类型
- 构建高阶组件时检查包装的组件
- 开发调试工具时分析组件树

### use-sync-external-store vs useState？

- **useState**: 组件内部状态
- **use-sync-external-store**: 外部状态（Redux、浏览器 API、WebSocket）

### 为什么需要 getServerSnapshot？

SSR 时服务端和客户端的状态可能不同（如 `window.innerWidth`）。提供 `getServerSnapshot` 避免 hydration 不匹配。

### use-subscription 为什么被废弃？

`use-sync-external-store` 是 React 18 内置的官方 API，性能更好且支持并发特性。

---

## 性能优化

### 避免不必要的重新渲染

**使用选择器**:
```tsx
// ❌ 每次 store 更新都重新渲染
const state = useSyncExternalStore(store.subscribe, store.getState)
const count = state.count

// ✅ 只在 count 变化时重新渲染
const count = useSyncExternalStoreWithSelector(
  store.subscribe,
  store.getState,
  store.getState,
  state => state.count
)
```

### 缓存订阅函数

```tsx
// ❌ 每次渲染创建新的订阅函数
const value = useSyncExternalStore(
  (callback) => store.subscribe(callback),
  store.getState
)

// ✅ 使用稳定的订阅函数
const value = useSyncExternalStore(
  store.subscribe,
  store.getState
)
```

---

## 相关资源

- [react-is GitHub](https://github.com/facebook/react/tree/main/packages/react-is)
- [useSyncExternalStore 文档](https://react.dev/reference/react/useSyncExternalStore)
- [use-sync-external-store GitHub](https://github.com/facebook/react/tree/main/packages/use-sync-external-store)
