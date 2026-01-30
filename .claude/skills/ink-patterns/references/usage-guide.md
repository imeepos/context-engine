# Ink 使用指南 (Usage Guide)

## 基础组件使用 (Basic Component Usage)

### 1. 渲染基础应用 (Rendering Basic App)

```tsx
import React from 'react';
import {render, Text, Box} from 'ink';

const App = () => (
  <Box flexDirection="column">
    <Text color="green">Hello Ink!</Text>
  </Box>
);

render(<App />);
```

**核心模式:**
- 使用 `render()` 挂载 React 组件到终端
- 所有文本必须包裹在 `<Text>` 组件中
- `<Box>` 是布局容器，类似浏览器的 `<div style="display: flex">`

### 2. Flexbox 布局 (Flexbox Layout)

```tsx
// 水平布局
<Box>
  <Text>Left</Text>
  <Spacer />
  <Text>Right</Text>
</Box>

// 垂直布局
<Box flexDirection="column" height={10}>
  <Text>Top</Text>
  <Spacer />
  <Text>Bottom</Text>
</Box>

// 居中对齐
<Box justifyContent="center" alignItems="center">
  <Text>Centered</Text>
</Box>
```

### 3. 用户输入处理 (User Input)

```tsx
import {useInput} from 'ink';

const UserInput = () => {
  useInput((input, key) => {
    if (input === 'q') process.exit(0);
    if (key.leftArrow) { /* handle */ }
    if (key.ctrl && input === 'c') { /* handle */ }
  });

  return <Text>Press 'q' to quit</Text>;
};
```

### 4. 静态输出 (Static Output)

```tsx
import {Static} from 'ink';

const LogViewer = () => {
  const [logs, setLogs] = useState([]);

  return (
    <>
      <Static items={logs}>
        {(log, index) => (
          <Box key={index}>
            <Text color="green">✓ {log.message}</Text>
          </Box>
        )}
      </Static>
      <Box marginTop={1}>
        <Text dimColor>Total: {logs.length}</Text>
      </Box>
    </>
  );
};
```

**静态输出原则:**
- `<Static>` 永久渲染内容，不会被覆盖
- 适用于日志、已完成任务列表
- 只渲染新增项

### 5. 焦点管理 (Focus Management)

```tsx
import {useFocus, useFocusManager} from 'ink';

const FocusableInput = ({id}) => {
  const {isFocused} = useFocus({id, autoFocus: true});
  return (
    <Box borderStyle={isFocused ? 'double' : 'single'}>
      <Text>{isFocused ? '> ' : '  '}Input</Text>
    </Box>
  );
};

const App = () => {
  const {focus} = useFocusManager();
  useInput((input) => {
    if (input === '1') focus('input1');
    if (input === '2') focus('input2');
  });
  return (
    <>
      <FocusableInput id="input1" />
      <FocusableInput id="input2" />
    </>
  );
};
```

### 6. 屏幕阅读器支持 (Screen Reader)

```tsx
<Box
  aria-role="checkbox"
  aria-state={{checked: true}}
  aria-label="Accept terms"
>
  <Text>☑ Accept terms</Text>
</Box>
```

### 7. 性能优化 (Performance)

```tsx
render(<App />, {
  maxFps: 30,
  incrementalRendering: true,
  onRender: ({renderTime}) => console.log(`${renderTime}ms`)
});
```
