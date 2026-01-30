# Ink 二次开发手册 (Development Manual)

## 自定义组件开发

```tsx
import {Box, Text} from 'ink';
import {type FC} from 'react';

type ProgressBarProps = {
  percent: number;
  width?: number;
  color?: string;
};

const ProgressBar: FC<ProgressBarProps> = ({
  percent,
  width = 20,
  color = 'green'
}) => {
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;

  return (
    <Box>
      <Box width={filled} backgroundColor={color}>
        <Text> </Text>
      </Box>
      <Box width={empty}>
        <Text> </Text>
      </Box>
      <Text> {percent}%</Text>
    </Box>
  );
};
```

**组件设计原则:**
- 使用 TypeScript 定义 Props 类型
- 使用 `<Box>` 和 `<Text>` 作为基础构建块
- 避免在 `<Text>` 内嵌套 `<Box>`

## Context 使用模式

```tsx
import {createContext, useContext} from 'react';

const ThemeContext = createContext({
  primaryColor: 'blue',
  secondaryColor: 'gray'
});

const ThemeProvider = ({children}) => {
  const theme = {primaryColor: 'cyan', secondaryColor: 'white'};
  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};

const ThemedText = ({children}) => {
  const {primaryColor} = useContext(ThemeContext);
  return <Text color={primaryColor}>{children}</Text>;
};
```

**内置 Context:**
- `AccessibilityContext` - 屏幕阅读器
- `BackgroundContext` - 背景色继承
- `FocusContext` - 焦点管理

## 自定义 Hook 开发

```tsx
import {useState, useEffect} from 'react';
import {useStdout} from 'ink';

// 终端尺寸监听
const useTerminalSize = () => {
  const {stdout} = useStdout();
  const [size, setSize] = useState({
    columns: stdout.columns || 80,
    rows: stdout.rows || 24
  });

  useEffect(() => {
    const handleResize = () => {
      setSize({
        columns: stdout.columns || 80,
        rows: stdout.rows || 24
      });
    };
    stdout.on('resize', handleResize);
    return () => stdout.off('resize', handleResize);
  }, [stdout]);

  return size;
};

// 防抖输入
const useDebouncedInput = (delay = 300) => {
  const [value, setValue] = useState('');
  const [debouncedValue, setDebouncedValue] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return [debouncedValue, setValue] as const;
};
```

## 测试模式

```tsx
import {render} from 'ink-testing-library';
import {Text} from 'ink';

// 基础渲染测试
test('renders text', () => {
  const {lastFrame} = render(<Text>Hello</Text>);
  expect(lastFrame()).toBe('Hello');
});

// 交互测试
test('handles input', () => {
  const {stdin, lastFrame} = render(<MyComponent />);
  stdin.write('a');
  expect(lastFrame()).toContain('You pressed: a');
});

// 异步测试
test('updates after delay', async () => {
  const {lastFrame, waitUntilExit} = render(<AsyncComponent />);
  await waitUntilExit();
  expect(lastFrame()).toContain('Done');
});
```

## 自定义渲染器

```tsx
import {Transform} from 'ink';
import chalk from 'chalk';

const GradientText = ({children}) => (
  <Transform transform={(output, index) => {
    const colors = ['red', 'yellow', 'green', 'cyan', 'blue'];
    const color = colors[index % colors.length];
    return chalk[color](output);
  }}>
    {children}
  </Transform>
);
```

## 外部进程集成

```tsx
import {useEffect, useState} from 'react';
import {spawn} from 'child_process';
import {useStdout} from 'ink';

const SubprocessOutput = ({command, args}) => {
  const [output, setOutput] = useState('');
  const {write} = useStdout();

  useEffect(() => {
    const proc = spawn(command, args);
    proc.stdout.on('data', (data) => {
      const text = data.toString();
      setOutput(prev => prev + text);
      write(text);
    });
    return () => proc.kill();
  }, [command, args]);

  return <Text>{output}</Text>;
};
```
