# 测试工具

React 生态系统中的测试工具，用于单元测试、快照测试和 Suspense 测试。

---

## react-test-renderer

React 快照测试和组件测试工具，不依赖 DOM 环境。

### 安装

```bash
npm install -D react-test-renderer
```

### 核心功能

#### 1. 快照测试

**基础快照测试**:
```tsx
import renderer from 'react-test-renderer'

function Link({ page, children }: { page: string; children: React.ReactNode }) {
  return <a href={page}>{children}</a>
}

test('Link renders correctly', () => {
  const tree = renderer
    .create(<Link page="https://example.com">Example</Link>)
    .toJSON()

  expect(tree).toMatchSnapshot()
})
```

**生成的快照文件**:
```js
// __snapshots__/Link.test.tsx.snap
exports[`Link renders correctly 1`] = `
<a
  href="https://example.com"
>
  Example
</a>
`
```

#### 2. 测试渲染器 API

**创建测试实例**:
```tsx
import renderer from 'react-test-renderer'

const testRenderer = renderer.create(<MyComponent />)
```

**获取 JSON 树**:
```tsx
const tree = testRenderer.toJSON()
// 返回组件的 JSON 表示
```

**获取实例**:
```tsx
const instance = testRenderer.root
// 返回根实例，可用于查询
```

**更新组件**:
```tsx
testRenderer.update(<MyComponent newProp="value" />)
```

**卸载组件**:
```tsx
testRenderer.unmount()
```

#### 3. 查询 API

**按类型查找**:
```tsx
const instance = testRenderer.root

// 查找单个元素
const button = instance.findByType('button')
const component = instance.findByType(MyComponent)

// 查找所有元素
const buttons = instance.findAllByType('button')
const components = instance.findAllByType(MyComponent)
```

**按 props 查找**:
```tsx
// 查找单个元素
const element = instance.findByProps({ className: 'active' })

// 查找所有元素
const elements = instance.findAllByProps({ type: 'submit' })
```

**自定义查询**:
```tsx
// 查找单个元素
const element = instance.find(node => node.props.id === 'submit')

// 查找所有元素
const elements = instance.findAll(node => node.type === 'button')
```

### 使用场景

#### 1. 组件快照测试

**测试组件渲染**:
```tsx
import renderer from 'react-test-renderer'

function UserCard({ name, email }: { name: string; email: string }) {
  return (
    <div className="user-card">
      <h2>{name}</h2>
      <p>{email}</p>
    </div>
  )
}

test('UserCard renders correctly', () => {
  const tree = renderer
    .create(<UserCard name="John" email="john@example.com" />)
    .toJSON()

  expect(tree).toMatchSnapshot()
})
```

#### 2. 测试组件交互

**测试按钮点击**:
```tsx
import renderer, { act } from 'react-test-renderer'

function Counter() {
  const [count, setCount] = React.useState(0)

  return (
    <button onClick={() => setCount(count + 1)}>
      Count: {count}
    </button>
  )
}

test('Counter increments on click', () => {
  const testRenderer = renderer.create(<Counter />)
  const button = testRenderer.root.findByType('button')

  // 初始状态
  expect(button.props.children).toEqual(['Count: ', 0])

  // 点击按钮
  act(() => {
    button.props.onClick()
  })

  // 验证更新
  expect(button.props.children).toEqual(['Count: ', 1])
})
```

#### 3. 测试条件渲染

**测试加载状态**:
```tsx
function DataComponent({ loading, data }: { loading: boolean; data?: string }) {
  if (loading) return <div>Loading...</div>
  return <div>{data}</div>
}

test('shows loading state', () => {
  const tree = renderer.create(<DataComponent loading={true} />).toJSON()
  expect(tree).toMatchSnapshot()
})

test('shows data when loaded', () => {
  const tree = renderer
    .create(<DataComponent loading={false} data="Hello" />)
    .toJSON()
  expect(tree).toMatchSnapshot()
})
```

#### 4. 测试 Context

**测试 Context 消费**:
```tsx
import { createContext } from 'react'

const ThemeContext = createContext('light')

function ThemedButton() {
  const theme = React.useContext(ThemeContext)
  return <button className={theme}>Button</button>
}

test('ThemedButton uses context', () => {
  const tree = renderer
    .create(
      <ThemeContext.Provider value="dark">
        <ThemedButton />
      </ThemeContext.Provider>
    )
    .toJSON()

  expect(tree).toMatchSnapshot()
})
```

#### 5. 测试 Hooks

**测试 useEffect**:
```tsx
function Timer() {
  const [seconds, setSeconds] = React.useState(0)

  React.useEffect(() => {
    const interval = setInterval(() => {
      setSeconds(s => s + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  return <div>Seconds: {seconds}</div>
}

test('Timer starts at 0', () => {
  const testRenderer = renderer.create(<Timer />)
  const div = testRenderer.root.findByType('div')

  expect(div.props.children).toEqual(['Seconds: ', 0])
})
```

### 浅渲染 (Shallow Rendering)

**仅渲染一层**:
```tsx
import renderer from 'react-test-renderer/shallow'

function Parent() {
  return (
    <div>
      <Child />
    </div>
  )
}

function Child() {
  return <span>Child</span>
}

test('Parent shallow renders', () => {
  const shallowRenderer = renderer.createRenderer()
  shallowRenderer.render(<Parent />)
  const result = shallowRenderer.getRenderOutput()

  expect(result.type).toBe('div')
  expect(result.props.children.type).toBe(Child)
})
```

---

## jest-react

Jest 的 React 测试工具（内部包，通常不直接使用）。

### 使用场景

通常通过 `@testing-library/react` 或 `react-test-renderer` 间接使用。

---

## react-suspense-test-utils

测试 Suspense 组件的工具。

### 核心功能

**测试 Suspense 边界**:
```tsx
import { Suspense } from 'react'

function AsyncComponent() {
  const data = use(fetchData()) // React 19+ use hook
  return <div>{data}</div>
}

test('shows fallback while loading', () => {
  const tree = renderer
    .create(
      <Suspense fallback={<div>Loading...</div>}>
        <AsyncComponent />
      </Suspense>
    )
    .toJSON()

  expect(tree).toMatchSnapshot()
})
```

---

## 完整示例

### 测试表单组件

```tsx
import renderer, { act } from 'react-test-renderer'

function LoginForm({ onSubmit }: { onSubmit: (data: any) => void }) {
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({ email, password })
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="Email"
      />
      <input
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        placeholder="Password"
      />
      <button type="submit">Login</button>
    </form>
  )
}

describe('LoginForm', () => {
  test('renders correctly', () => {
    const tree = renderer
      .create(<LoginForm onSubmit={() => {}} />)
      .toJSON()

    expect(tree).toMatchSnapshot()
  })

  test('handles input changes', () => {
    const testRenderer = renderer.create(<LoginForm onSubmit={() => {}} />)
    const [emailInput, passwordInput] = testRenderer.root.findAllByType('input')

    // 输入邮箱
    act(() => {
      emailInput.props.onChange({ target: { value: 'test@example.com' } })
    })

    expect(emailInput.props.value).toBe('test@example.com')

    // 输入密码
    act(() => {
      passwordInput.props.onChange({ target: { value: 'password123' } })
    })

    expect(passwordInput.props.value).toBe('password123')
  })

  test('calls onSubmit with form data', () => {
    const mockSubmit = jest.fn()
    const testRenderer = renderer.create(<LoginForm onSubmit={mockSubmit} />)
    const form = testRenderer.root.findByType('form')
    const [emailInput, passwordInput] = testRenderer.root.findAllByType('input')

    // 填写表单
    act(() => {
      emailInput.props.onChange({ target: { value: 'test@example.com' } })
      passwordInput.props.onChange({ target: { value: 'password123' } })
    })

    // 提交表单
    act(() => {
      form.props.onSubmit({ preventDefault: () => {} })
    })

    expect(mockSubmit).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123'
    })
  })
})
```

### 测试异步组件

```tsx
import renderer, { act } from 'react-test-renderer'

function DataFetcher({ userId }: { userId: string }) {
  const [data, setData] = React.useState(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    fetch(`/api/users/${userId}`)
      .then(res => res.json())
      .then(data => {
        setData(data)
        setLoading(false)
      })
  }, [userId])

  if (loading) return <div>Loading...</div>
  return <div>{data?.name}</div>
}

test('shows loading state initially', () => {
  const tree = renderer.create(<DataFetcher userId="123" />).toJSON()
  expect(tree).toMatchSnapshot()
})

test('shows data after loading', async () => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      json: () => Promise.resolve({ name: 'John' })
    })
  ) as jest.Mock

  let testRenderer: renderer.ReactTestRenderer

  await act(async () => {
    testRenderer = renderer.create(<DataFetcher userId="123" />)
  })

  const tree = testRenderer!.toJSON()
  expect(tree).toMatchSnapshot()
})
```

---

## 常见问题

### react-test-renderer vs @testing-library/react？

- **react-test-renderer**: 快照测试、不依赖 DOM、轻量级
- **@testing-library/react**: DOM 测试、用户行为测试、更接近真实环境

推荐组合使用：
- 快照测试用 `react-test-renderer`
- 交互测试用 `@testing-library/react`

### 何时使用快照测试？

适合场景：
- UI 组件（按钮、卡片、表单）
- 静态内容（文档、帮助页面）
- 样式回归测试

不适合场景：
- 动态内容（时间戳、随机数）
- 复杂交互逻辑
- 业务逻辑测试

### 如何更新快照？

```bash
# 更新所有快照
npm test -- -u

# 更新特定文件的快照
npm test -- -u MyComponent.test.tsx
```

### act() 是什么？

`act()` 确保所有更新（状态、副作用）在断言前完成：

```tsx
// ❌ 可能导致警告
button.props.onClick()
expect(button.props.children).toBe('Clicked')

// ✅ 正确用法
act(() => {
  button.props.onClick()
})
expect(button.props.children).toBe('Clicked')
```

---

## 最佳实践

### 1. 组织测试文件

```
src/
  components/
    Button/
      Button.tsx
      Button.test.tsx
      __snapshots__/
        Button.test.tsx.snap
```

### 2. 描述性测试名称

```tsx
// ❌ 不清晰
test('works', () => {})

// ✅ 清晰
test('Button renders with correct text', () => {})
test('Button calls onClick when clicked', () => {})
```

### 3. 避免过度快照

```tsx
// ❌ 快照整个页面
test('Page renders', () => {
  const tree = renderer.create(<Page />).toJSON()
  expect(tree).toMatchSnapshot()
})

// ✅ 快照关键组件
test('Header renders correctly', () => {
  const tree = renderer.create(<Header />).toJSON()
  expect(tree).toMatchSnapshot()
})
```

### 4. 使用 act() 包装更新

```tsx
// ✅ 包装所有状态更新
act(() => {
  button.props.onClick()
})

// ✅ 包装异步操作
await act(async () => {
  await fetchData()
})
```

---

## 相关资源

- [react-test-renderer 文档](https://react.dev/reference/react-dom/test-utils)
- [Jest 快照测试](https://jestjs.io/docs/snapshot-testing)
- [Testing Library](https://testing-library.com/react)
