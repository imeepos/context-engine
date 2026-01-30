# 高级/内部包

React 生态系统中的高级包，用于自定义渲染器、协作式调度和服务端组件。

---

## react-reconciler

用于创建自定义 React 渲染器的包。

### 安装

```bash
npm install react-reconciler
```

### 核心概念

React Reconciler 是 React 的核心协调算法，负责：
- 管理组件树
- 处理更新和副作用
- 调度渲染工作

### 使用场景

#### 1. 自定义渲染器

**创建渲染器**:
```tsx
import Reconciler from 'react-reconciler'

const reconciler = Reconciler({
  // 主机配置
  supportsMutation: true,
  supportsPersistence: false,
  supportsHydration: false,

  // 创建实例
  createInstance(type, props, rootContainer, hostContext, internalHandle) {
    // 创建自定义元素
    return { type, props, children: [] }
  },

  // 创建文本实例
  createTextInstance(text, rootContainer, hostContext, internalHandle) {
    return { text }
  },

  // 添加子节点
  appendInitialChild(parent, child) {
    parent.children.push(child)
  },

  // 完成初始化
  finalizeInitialChildren(instance, type, props, rootContainer, hostContext) {
    return false
  },

  // 准备更新
  prepareUpdate(instance, type, oldProps, newProps, rootContainer, hostContext) {
    return true
  },

  // 提交更新
  commitUpdate(instance, updatePayload, type, prevProps, nextProps, internalHandle) {
    instance.props = nextProps
  },

  // 提交文本更新
  commitTextUpdate(textInstance, oldText, newText) {
    textInstance.text = newText
  },

  // 添加子节点（提交阶段）
  appendChild(parent, child) {
    parent.children.push(child)
  },

  // 插入子节点
  insertBefore(parent, child, beforeChild) {
    const index = parent.children.indexOf(beforeChild)
    parent.children.splice(index, 0, child)
  },

  // 移除子节点
  removeChild(parent, child) {
    const index = parent.children.indexOf(child)
    parent.children.splice(index, 1)
  },

  // 获取根容器上下文
  getRootHostContext(rootContainer) {
    return {}
  },

  // 获取子节点上下文
  getChildHostContext(parentHostContext, type, rootContainer) {
    return parentHostContext
  },

  // 准备提交
  prepareForCommit(containerInfo) {
    return null
  },

  // 重置提交后状态
  resetAfterCommit(containerInfo) {
    // 渲染完成后的清理工作
  },

  // 获取当前时间
  now: Date.now,

  // 调度延迟回调
  scheduleTimeout: setTimeout,
  cancelTimeout: clearTimeout,
  noTimeout: -1,

  // 是否为主渲染器
  isPrimaryRenderer: true,

  // 支持的特性
  supportsHydration: false
})
```

**使用渲染器**:
```tsx
function render(element, container) {
  const root = reconciler.createContainer(
    container,
    0,  // tag
    null, // hydrationCallbacks
    false, // isStrictMode
    null, // concurrentUpdatesByDefaultOverride
    '', // identifierPrefix
    () => {}, // onRecoverableError
    null // transitionCallbacks
  )

  reconciler.updateContainer(element, root, null, () => {
    console.log('Render complete')
  })

  return root
}

// 使用
const container = { children: [] }
render(<App />, container)
```

#### 2. React Native 风格渲染器

**Canvas 渲染器示例**:
```tsx
import Reconciler from 'react-reconciler'

const CanvasReconciler = Reconciler({
  supportsMutation: true,

  createInstance(type, props) {
    switch (type) {
      case 'rect':
        return { type: 'rect', x: props.x, y: props.y, width: props.width, height: props.height, fill: props.fill }
      case 'circle':
        return { type: 'circle', x: props.x, y: props.y, radius: props.radius, fill: props.fill }
      case 'text':
        return { type: 'text', x: props.x, y: props.y, text: props.children, fill: props.fill }
      default:
        throw new Error(`Unknown type: ${type}`)
    }
  },

  createTextInstance(text) {
    return { type: 'text', text }
  },

  appendInitialChild(parent, child) {
    if (!parent.children) parent.children = []
    parent.children.push(child)
  },

  appendChild(parent, child) {
    if (!parent.children) parent.children = []
    parent.children.push(child)
  },

  removeChild(parent, child) {
    const index = parent.children.indexOf(child)
    parent.children.splice(index, 1)
  },

  commitUpdate(instance, updatePayload, type, prevProps, nextProps) {
    Object.assign(instance, nextProps)
  },

  finalizeInitialChildren() {
    return false
  },

  prepareUpdate() {
    return true
  },

  getRootHostContext() {
    return {}
  },

  getChildHostContext(parentContext) {
    return parentContext
  },

  prepareForCommit() {
    return null
  },

  resetAfterCommit(container) {
    // 重新绘制 canvas
    drawCanvas(container.canvas, container.root)
  },

  now: Date.now,
  scheduleTimeout: setTimeout,
  cancelTimeout: clearTimeout,
  noTimeout: -1,
  isPrimaryRenderer: true
})

function drawCanvas(canvas, tree) {
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  function draw(node) {
    if (!node) return

    switch (node.type) {
      case 'rect':
        ctx.fillStyle = node.fill
        ctx.fillRect(node.x, node.y, node.width, node.height)
        break
      case 'circle':
        ctx.fillStyle = node.fill
        ctx.beginPath()
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2)
        ctx.fill()
        break
      case 'text':
        ctx.fillStyle = node.fill
        ctx.fillText(node.text, node.x, node.y)
        break
    }

    if (node.children) {
      node.children.forEach(draw)
    }
  }

  draw(tree)
}
```

**使用 Canvas 渲染器**:
```tsx
function App() {
  const [x, setX] = React.useState(50)

  return (
    <>
      <rect x={x} y={50} width={100} height={100} fill="blue" />
      <circle x={200} y={100} radius={50} fill="red" />
      <text x={50} y={200} fill="black">Hello Canvas</text>
    </>
  )
}

const canvas = document.getElementById('canvas')
const container = { canvas, root: null, children: [] }
const root = CanvasReconciler.createContainer(container, 0, null, false, null, '', () => {}, null)

CanvasReconciler.updateContainer(<App />, root, null, () => {
  container.root = root
})
```

---

## scheduler

React 的协作式调度器，用于优先级调度和时间切片。

### 安装

```bash
npm install scheduler
```

### 核心概念

Scheduler 提供：
- 任务优先级管理
- 时间切片
- 空闲时间调度
- 任务取消

### API

```tsx
import {
  unstable_scheduleCallback,
  unstable_cancelCallback,
  unstable_shouldYield,
  unstable_requestPaint,
  unstable_now,
  unstable_IdlePriority,
  unstable_ImmediatePriority,
  unstable_NormalPriority,
  unstable_UserBlockingPriority,
  unstable_LowPriority
} from 'scheduler'
```

### 使用场景

#### 1. 任务调度

**按优先级调度任务**:
```tsx
import { unstable_scheduleCallback, unstable_ImmediatePriority, unstable_NormalPriority } from 'scheduler'

// 高优先级任务（立即执行）
const task1 = unstable_scheduleCallback(
  unstable_ImmediatePriority,
  () => {
    console.log('High priority task')
  }
)

// 普通优先级任务
const task2 = unstable_scheduleCallback(
  unstable_NormalPriority,
  () => {
    console.log('Normal priority task')
  }
)
```

#### 2. 时间切片

**长任务分片**:
```tsx
import { unstable_scheduleCallback, unstable_shouldYield, unstable_NormalPriority } from 'scheduler'

function processLargeArray(items) {
  let index = 0

  function processChunk() {
    const startTime = performance.now()

    // 处理一批数据
    while (index < items.length) {
      processItem(items[index])
      index++

      // 检查是否应该让出控制权
      if (unstable_shouldYield()) {
        // 调度下一批
        unstable_scheduleCallback(unstable_NormalPriority, processChunk)
        return
      }

      // 避免单次执行时间过长
      if (performance.now() - startTime > 5) {
        unstable_scheduleCallback(unstable_NormalPriority, processChunk)
        return
      }
    }

    console.log('Processing complete')
  }

  unstable_scheduleCallback(unstable_NormalPriority, processChunk)
}
```

#### 3. 空闲时间调度

**在空闲时执行低优先级任务**:
```tsx
import { unstable_scheduleCallback, unstable_IdlePriority } from 'scheduler'

function scheduleIdleWork(callback) {
  return unstable_scheduleCallback(unstable_IdlePriority, callback)
}

// 使用
scheduleIdleWork(() => {
  console.log('Running during idle time')
  // 预加载、分析等低优先级任务
})
```

#### 4. 取消任务

```tsx
import { unstable_scheduleCallback, unstable_cancelCallback, unstable_NormalPriority } from 'scheduler'

const task = unstable_scheduleCallback(
  unstable_NormalPriority,
  () => {
    console.log('This may not run')
  }
)

// 取消任务
unstable_cancelCallback(task)
```

---

## react-server

React Server Components 的服务端运行时。

### 核心概念

Server Components 允许：
- 在服务端渲染组件
- 零客户端 JavaScript
- 直接访问后端资源
- 自动代码分割

### 使用场景

#### 1. Server Components

**服务端组件**:
```tsx
// app/ServerComponent.tsx
async function ServerComponent() {
  // 直接访问数据库
  const data = await db.query('SELECT * FROM users')

  return (
    <div>
      {data.map(user => (
        <div key={user.id}>{user.name}</div>
      ))}
    </div>
  )
}
```

**客户端组件**:
```tsx
'use client'

// app/ClientComponent.tsx
import { useState } from 'react'

export function ClientComponent() {
  const [count, setCount] = useState(0)

  return (
    <button onClick={() => setCount(count + 1)}>
      Count: {count}
    </button>
  )
}
```

#### 2. 混合使用

```tsx
// app/page.tsx (Server Component)
import { ClientComponent } from './ClientComponent'

async function getData() {
  const res = await fetch('https://api.example.com/data')
  return res.json()
}

export default async function Page() {
  const data = await getData()

  return (
    <div>
      <h1>{data.title}</h1>
      <ClientComponent />
    </div>
  )
}
```

---

## react-server-dom-webpack

React Server Components 的 Webpack 集成。

### 使用场景

用于 Next.js App Router 等框架，通常不直接使用。

### 配置示例

**next.config.js**:
```js
module.exports = {
  experimental: {
    serverComponents: true
  }
}
```

---

## react-server-dom-turbopack

React Server Components 的 Turbopack 集成。

### 使用场景

用于 Next.js 15+ 的 Turbopack 模式。

---

## 完整示例

### 自定义终端渲染器

```tsx
import Reconciler from 'react-reconciler'

// 终端渲染器
const TerminalReconciler = Reconciler({
  supportsMutation: true,

  createInstance(type, props) {
    return {
      type,
      props,
      children: [],
      output: ''
    }
  },

  createTextInstance(text) {
    return { type: 'text', text }
  },

  appendInitialChild(parent, child) {
    parent.children.push(child)
  },

  appendChild(parent, child) {
    parent.children.push(child)
  },

  removeChild(parent, child) {
    const index = parent.children.indexOf(child)
    parent.children.splice(index, 1)
  },

  commitUpdate(instance, updatePayload, type, prevProps, nextProps) {
    instance.props = nextProps
  },

  commitTextUpdate(textInstance, oldText, newText) {
    textInstance.text = newText
  },

  finalizeInitialChildren() {
    return false
  },

  prepareUpdate() {
    return true
  },

  getRootHostContext() {
    return {}
  },

  getChildHostContext(parentContext) {
    return parentContext
  },

  prepareForCommit() {
    return null
  },

  resetAfterCommit(container) {
    // 渲染到终端
    const output = renderToTerminal(container.root)
    console.clear()
    console.log(output)
  },

  now: Date.now,
  scheduleTimeout: setTimeout,
  cancelTimeout: clearTimeout,
  noTimeout: -1,
  isPrimaryRenderer: true
})

function renderToTerminal(node) {
  if (!node) return ''

  if (node.type === 'text') {
    return node.text
  }

  let output = ''

  if (node.type === 'box') {
    output += `┌${'─'.repeat(node.props.width - 2)}┐\n`
    node.children.forEach(child => {
      const content = renderToTerminal(child)
      output += `│ ${content.padEnd(node.props.width - 4)} │\n`
    })
    output += `└${'─'.repeat(node.props.width - 2)}┘\n`
  } else {
    node.children.forEach(child => {
      output += renderToTerminal(child)
    })
  }

  return output
}

// 使用
function App() {
  const [count, setCount] = React.useState(0)

  React.useEffect(() => {
    const interval = setInterval(() => {
      setCount(c => c + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  return (
    <box width={30}>
      <text>Counter: {count}</text>
    </box>
  )
}

const container = { root: null }
const root = TerminalReconciler.createContainer(container, 0, null, false, null, '', () => {}, null)

TerminalReconciler.updateContainer(<App />, root, null, () => {
  container.root = root
})
```

---

## 常见问题

### 何时使用 react-reconciler？

- 创建自定义渲染目标（Canvas、终端、PDF 等）
- 构建类似 React Native 的平台
- 开发框架（如 Ink、React Three Fiber）

### scheduler 是否稳定？

Scheduler API 标记为 `unstable_`，但被 React 内部广泛使用。不推荐在应用代码中直接使用，除非构建框架。

### Server Components vs SSR？

- **SSR**: 在服务端渲染 HTML，客户端激活（hydration）
- **Server Components**: 在服务端渲染，零客户端 JavaScript，可与客户端组件混合

### 如何调试自定义渲染器？

1. 使用 `console.log` 跟踪生命周期
2. 检查 `createInstance` 和 `commitUpdate` 调用
3. 验证 `appendChild` 和 `removeChild` 逻辑
4. 使用 React DevTools（需要配置）

---

## 最佳实践

### 1. 自定义渲染器

- 实现所有必需的方法
- 正确处理子节点添加/移除
- 在 `resetAfterCommit` 中执行实际渲染
- 使用 TypeScript 确保类型安全

### 2. Scheduler 使用

- 仅在框架层使用
- 优先使用 React 内置的并发特性
- 正确处理任务取消
- 避免在应用代码中直接使用

### 3. Server Components

- 服务端组件用于数据获取
- 客户端组件用于交互
- 避免在服务端组件中使用 Hooks
- 正确标记 `'use client'`

---

## 相关资源

- [react-reconciler 文档](https://github.com/facebook/react/tree/main/packages/react-reconciler)
- [Scheduler 源码](https://github.com/facebook/react/tree/main/packages/scheduler)
- [Server Components RFC](https://github.com/reactjs/rfcs/blob/main/text/0188-server-components.md)
- [Next.js App Router](https://nextjs.org/docs/app)
