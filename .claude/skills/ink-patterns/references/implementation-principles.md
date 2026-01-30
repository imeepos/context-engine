# Ink 实现原理解析 (Implementation Principles)

## 核心架构

### 1. React Reconciler 集成

**关键文件:** `src/reconciler.ts`

Ink 使用 react-reconciler 创建自定义渲染器：

```typescript
const reconciler = createReconciler({
  createInstance(type, props, rootNode, hostContext) {
    const node = createNode(type);
    if (node.yogaNode) {
      applyStyles(node.yogaNode, props.style);
    }
    return node;
  },

  resetAfterCommit(rootNode) {
    rootNode.onComputeLayout();  // 计算 Flexbox 布局
    rootNode.onRender();          // 触发渲染
  }
});
```

**核心原理:**
- 将 React 组件树映射到自定义 DOM 树
- 每个组件对应 `DOMElement` 或 `TextNode`
- 使用 Yoga 计算 Flexbox 布局
- 渲染器将 DOM 树转换为 ANSI 转义序列

### 2. 虚拟 DOM 结构

**关键文件:** `src/dom.ts`

```typescript
type DOMElement = {
  nodeName: 'ink-root' | 'ink-box' | 'ink-text' | 'ink-virtual-text';
  style: Styles;
  attributes: Record<string, any>;
  childNodes: DOMNode[];
  parentNode?: DOMElement;
  yogaNode?: YogaNode;
  internal_transform?: OutputTransformer;
  internal_accessibility?: AccessibilityInfo;
};

type TextNode = {
  nodeName: '#text';
  nodeValue: string;
  parentNode?: DOMElement;
  style: Styles;
};
```

**DOM 操作:**
- `createNode()` - 创建节点
- `appendChildNode()` - 添加子节点
- `insertBeforeNode()` - 插入节点
- `removeChildNode()` - 移除节点
- `setStyle()` - 设置样式

**关键机制:**
- `ink-text` 使用 `measureTextNode` 测量文本尺寸
- `ink-virtual-text` 用于嵌套文本（无 Yoga 节点）
- 文本变化时调用 `markNodeAsDirty()` 触发重新测量

### 3. Flexbox 布局引擎

**关键文件:** `src/styles.ts`

```typescript
const applyStyles = (yogaNode: YogaNode, style: Styles) => {
  if (style.flexDirection) {
    yogaNode.setFlexDirection(
      style.flexDirection === 'row'
        ? Yoga.FLEX_DIRECTION_ROW
        : Yoga.FLEX_DIRECTION_COLUMN
    );
  }

  if (style.width) {
    if (typeof style.width === 'string') {
      yogaNode.setWidth(`${style.width}`);  // 百分比
    } else {
      yogaNode.setWidth(style.width);       // 绝对值
    }
  }
};
```

**布局计算流程:**
1. React 更新触发 `resetAfterCommit`
2. 调用 `rootNode.onComputeLayout()`
3. 执行 `yogaNode.calculateLayout()` 计算位置和尺寸
4. 调用 `rootNode.onRender()` 触发渲染

### 4. 渲染管线

**关键文件:** `src/ink.tsx`, `src/renderer.ts`

```typescript
class Ink {
  onRender = () => {
    // 1. 渲染 DOM 树到输出对象
    const {output, outputHeight, staticOutput} = render(
      this.rootNode,
      this.isScreenReaderEnabled
    );

    // 2. 处理静态输出
    if (staticOutput) {
      this.fullStaticOutput += staticOutput;
      this.options.stdout.write(staticOutput);
    }

    // 3. 更新动态输出
    if (output !== this.lastOutput) {
      this.throttledLog(output);
    }
  };
}
```

**渲染流程:**
1. DOM 树遍历 - `renderNodeToOutput()` 递归遍历
2. 输出构建 - 使用 `Output` 类构建二维字符缓冲区
3. 样式应用 - 应用 ANSI 颜色、边框、背景色
4. 文本换行 - 根据容器宽度处理文本
5. 终端输出 - 使用 `log-update` 更新输出

### 5. 输入处理机制

**关键文件:** `src/hooks/use-input.ts`

```typescript
const useInput = (inputHandler: Handler, options: Options = {}) => {
  const {stdin, setRawMode, internal_eventEmitter} = useStdin();

  useEffect(() => {
    setRawMode(true);  // 启用 raw mode

    const handleData = (data: string) => {
      const keypress = parseKeypress(data);
      const key = {
        upArrow: keypress.name === 'up',
        ctrl: keypress.ctrl,
        // ...
      };

      reconciler.batchedUpdates(() => {
        inputHandler(input, key);
      });
    };

    internal_eventEmitter.on('input', handleData);
    return () => {
      setRawMode(false);
      internal_eventEmitter.removeListener('input', handleData);
    };
  }, [options.isActive]);
};
```

**输入处理原理:**
- 使用 `stdin.setRawMode(true)` 捕获原始按键
- `parseKeypress()` 解析 ANSI 转义序列
- 使用 `reconciler.batchedUpdates()` 批量更新
- 支持 Ctrl+C 退出（可配置）

### 6. 性能优化机制

**节流渲染:**
```typescript
const maxFps = options.maxFps ?? 30;
const renderThrottleMs = Math.ceil(1000 / maxFps);

this.rootNode.onRender = throttle(this.onRender, renderThrottleMs, {
  leading: true,
  trailing: true
});
```

**增量渲染:**
```typescript
this.log = logUpdate.create(options.stdout, {
  incremental: options.incrementalRendering
});
```

**静态输出优化:**
- `<Static>` 内容只渲染一次
- 使用 `isStaticDirty` 标记触发立即渲染
- 静态输出与动态输出分离

### 7. 屏幕阅读器支持

**关键文件:** `src/render-node-to-output.ts`

```typescript
const renderNodeToScreenReaderOutput = (node: DOMElement) => {
  if (node.internal_accessibility?.role) {
    const {role, state} = node.internal_accessibility;
    let output = '';
    if (state?.checked) output += '(checked) ';
    output += `${role}: `;
    output += getTextContent(node);
    return output;
  }

  if (node.attributes['aria-label']) {
    return node.attributes['aria-label'];
  }

  return getTextContent(node);
};
```

**无障碍原理:**
- 检测 `INK_SCREEN_READER` 环境变量
- 使用 `AccessibilityContext` 传递状态
- 渲染简化文本输出，包含 ARIA 语义
- 支持 `aria-hidden` 隐藏装饰性元素
