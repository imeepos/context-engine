# UI/UX 设计方案 - 几何学习平台

## 📐 设计系统

### 配色方案

基于教育类产品的特点，采用清晰、专业、友好的配色：

```css
/* 主色调 - 蓝色系（专业、理性） */
--primary-50: #eff6ff
--primary-100: #dbeafe
--primary-500: #3b82f6  /* 主色 */
--primary-600: #2563eb
--primary-700: #1d4ed8

/* 辅助色 - 用于不同图形类型 */
--triangle: #3b82f6    /* 蓝色 - 三角形 */
--quad: #8b5cf6        /* 紫色 - 四边形 */
--polygon: #10b981     /* 绿色 - 多边形 */
--circle: #f59e0b      /* 橙色 - 圆形 */
--line: #6b7280        /* 灰色 - 线段 */
--point: #ef4444       /* 红色 - 点 */

/* 中性色 */
--gray-50: #f9fafb
--gray-100: #f3f4f6
--gray-200: #e5e7eb
--gray-600: #4b5563
--gray-900: #111827

/* 语义色 */
--success: #10b981
--warning: #f59e0b
--error: #ef4444
--info: #3b82f6
```

### 字体系统

```css
/* 字体家族 */
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
--font-mono: 'JetBrains Mono', 'Fira Code', monospace

/* 字体大小 */
--text-xs: 0.75rem    /* 12px - 标注 */
--text-sm: 0.875rem   /* 14px - 辅助文字 */
--text-base: 1rem     /* 16px - 正文 */
--text-lg: 1.125rem   /* 18px - 小标题 */
--text-xl: 1.25rem    /* 20px - 标题 */
--text-2xl: 1.5rem    /* 24px - 大标题 */

/* 行高 */
--leading-tight: 1.25
--leading-normal: 1.5
--leading-relaxed: 1.75
```

### 间距系统

```css
--spacing-1: 0.25rem   /* 4px */
--spacing-2: 0.5rem    /* 8px */
--spacing-3: 0.75rem   /* 12px */
--spacing-4: 1rem      /* 16px */
--spacing-6: 1.5rem    /* 24px */
--spacing-8: 2rem      /* 32px */
--spacing-12: 3rem     /* 48px */
```

---

## 🎨 页面布局设计

### 整体布局结构

```
┌─────────────────────────────────────────────────────────────────┐
│  Header (56px)                                                   │
│  [Logo] [图形选择器] [工具栏] [设置] [帮助]                      │
├────────┬──────────────────────────────────────┬──────────────────┤
│        │                                      │                  │
│ Shape  │                                      │   Properties     │
│ Picker │         Canvas Area                  │     Panel        │
│ (80px) │      (React Konva)                   │    (360px)       │
│        │                                      │                  │
│ [点]   │                                      │  ┌─────────────┐ │
│ [线]   │                                      │  │ 图形信息    │ │
│ [△]    │                                      │  ├─────────────┤ │
│ [□]    │                                      │  │ 属性计算    │ │
│ [⬡]    │                                      │  ├─────────────┤ │
│ [○]    │                                      │  │ 辅助工具    │ │
│        │                                      │  ├─────────────┤ │
│        │                                      │  │ 知识模块    │ │
│        │                                      │  └─────────────┘ │
├────────┴──────────────────────────────────────┴──────────────────┤
│  Status Bar (32px)                                               │
│  [坐标: (x, y)] [缩放: 100%] [网格: 开] [提示信息]              │
└─────────────────────────────────────────────────────────────────┘
```

### 响应式断点

```typescript
const breakpoints = {
  sm: '640px',   // 小屏幕 - 隐藏侧边栏，使用抽屉
  md: '768px',   // 中等屏幕 - 显示左侧栏，右侧栏可折叠
  lg: '1024px',  // 大屏幕 - 完整布局
  xl: '1280px',  // 超大屏幕 - 宽松布局
}
```

---

## 🎯 核心组件设计

### 1. 图形选择器 (Shape Picker)

**位置**: 左侧垂直工具栏
**宽度**: 80px
**设计**: 大图标 + 文字标签

```tsx
<ShapePicker>
  <ShapeButton icon={<Dot />} label="点" active={mode === 'point'} />
  <ShapeButton icon={<Line />} label="线段" active={mode === 'segment'} />
  <ShapeButton icon={<Triangle />} label="三角形" active={mode === 'triangle'} />
  <ShapeButton icon={<Square />} label="四边形" active={mode === 'quad'} />
  <ShapeButton icon={<Hexagon />} label="多边形" active={mode === 'polygon'} />
  <ShapeButton icon={<Circle />} label="圆" active={mode === 'circle'} />

  <Separator />

  <ShapeButton icon={<MousePointer />} label="选择" active={mode === 'select'} />
  <ShapeButton icon={<Move />} label="移动" active={mode === 'pan'} />
  <ShapeButton icon={<Ruler />} label="测量" active={mode === 'measure'} />
</ShapePicker>
```

**交互**:
- 点击切换模式
- 悬停显示快捷键提示
- 当前模式高亮显示（蓝色背景）

### 2. 属性面板 (Properties Panel)

**位置**: 右侧面板
**宽度**: 360px
**可折叠**: 是

#### 面板结构

```tsx
<PropertiesPanel>
  <Tabs defaultValue="info">
    <TabsList>
      <TabsTrigger value="info">信息</TabsTrigger>
      <TabsTrigger value="tools">工具</TabsTrigger>
      <TabsTrigger value="knowledge">知识</TabsTrigger>
      <TabsTrigger value="quiz">测验</TabsTrigger>
    </TabsList>

    <TabsContent value="info">
      <ShapeInfo shape={selectedShape} />
    </TabsContent>

    <TabsContent value="tools">
      <ShapeTools shape={selectedShape} />
    </TabsContent>

    <TabsContent value="knowledge">
      <KnowledgeModule module={activeModule} />
    </TabsContent>

    <TabsContent value="quiz">
      <QuizPanel module={activeModule} />
    </TabsContent>
  </Tabs>
</PropertiesPanel>
```

#### 信息面板内容（根据图形类型动态显示）

**点 (Point)**
```
┌─────────────────────────┐
│ 点 A                    │
├─────────────────────────┤
│ 坐标                    │
│ x: 120.5               │
│ y: 85.3                │
├─────────────────────────┤
│ 样式                    │
│ 颜色: [🔴]             │
│ 大小: [====|===] 8px   │
└─────────────────────────┘
```

**线段 (Segment)**
```
┌─────────────────────────┐
│ 线段 AB                 │
├─────────────────────────┤
│ 端点                    │
│ A: (120, 85)           │
│ B: (200, 150)          │
├─────────────────────────┤
│ 属性                    │
│ 长度: 98.5 px          │
│ 斜率: 0.87             │
│ 中点: (160, 117.5)     │
├─────────────────────────┤
│ 工具                    │
│ [显示中点]             │
│ [显示长度标注]         │
│ [垂直平分线]           │
└─────────────────────────┘
```

**三角形 (Triangle)**
```
┌─────────────────────────┐
│ 三角形 ABC              │
├─────────────────────────┤
│ 边长                    │
│ AB: 120.5 px           │
│ BC: 98.3 px            │
│ CA: 85.7 px            │
├─────────────────────────┤
│ 角度                    │
│ ∠A: 65.2°              │
│ ∠B: 58.3°              │
│ ∠C: 56.5°              │
├─────────────────────────┤
│ 面积与周长              │
│ 面积: 4,523 px²        │
│ 周长: 304.5 px         │
├─────────────────────────┤
│ 类型                    │
│ 🔹 不等边三角形         │
│ 🔹 锐角三角形           │
├─────────────────────────┤
│ 辅助线                  │
│ [中线] [高线]          │
│ [角平分线] [中位线]    │
├─────────────────────────┤
│ 特殊点                  │
│ [重心] [垂心]          │
│ [内心] [外心]          │
└─────────────────────────┘
```

**四边形 (Quadrilateral)**
```
┌─────────────────────────┐
│ 四边形 ABCD             │
├─────────────────────────┤
│ 边长                    │
│ AB: 100 px             │
│ BC: 80 px              │
│ CD: 100 px             │
│ DA: 80 px              │
├─────────────────────────┤
│ 对角线                  │
│ AC: 128.1 px           │
│ BD: 128.1 px           │
├─────────────────────────┤
│ 角度                    │
│ ∠A: 90°                │
│ ∠B: 90°                │
│ ∠C: 90°                │
│ ∠D: 90°                │
├─────────────────────────┤
│ 面积与周长              │
│ 面积: 8,000 px²        │
│ 周长: 360 px           │
├─────────────────────────┤
│ 类型判定                │
│ ✅ 平行四边形           │
│ ✅ 矩形                 │
│ ❌ 菱形                 │
│ ❌ 正方形               │
│ ❌ 梯形                 │
├─────────────────────────┤
│ 工具                    │
│ [显示对角线]           │
│ [对称轴]               │
└─────────────────────────┘
```

**圆 (Circle)**
```
┌─────────────────────────┐
│ 圆 O                    │
├─────────────────────────┤
│ 圆心                    │
│ O: (200, 150)          │
├─────────────────────────┤
│ 半径                    │
│ r: 80 px               │
│ [=======|==] 调整      │
├─────────────────────────┤
│ 属性                    │
│ 直径: 160 px           │
│ 周长: 502.7 px         │
│ 面积: 20,106 px²       │
├─────────────────────────┤
│ 标注                    │
│ [显示圆心]             │
│ [显示半径]             │
│ [显示直径]             │
├─────────────────────────┤
│ 工具                    │
│ [内接三角形]           │
│ [内接正方形]           │
│ [切线]                 │
└─────────────────────────┘
```

### 3. 画布工具栏 (Canvas Toolbar)

**位置**: 画布右上角浮动
**设计**: 半透明背景 + 圆角卡片

```tsx
<CanvasToolbar>
  <ToolGroup label="视图">
    <IconButton icon={<ZoomIn />} onClick={zoomIn} tooltip="放大 (Ctrl +)" />
    <IconButton icon={<ZoomOut />} onClick={zoomOut} tooltip="缩小 (Ctrl -)" />
    <IconButton icon={<Maximize />} onClick={fitToScreen} tooltip="适应屏幕" />
  </ToolGroup>

  <Separator />

  <ToolGroup label="网格">
    <ToggleButton
      icon={<Grid />}
      active={gridVisible}
      onClick={toggleGrid}
      tooltip="显示网格 (G)"
    />
    <ToggleButton
      icon={<Magnet />}
      active={snapEnabled}
      onClick={toggleSnap}
      tooltip="网格吸附 (S)"
    />
  </ToolGroup>

  <Separator />

  <ToolGroup label="历史">
    <IconButton icon={<Undo />} onClick={undo} disabled={!canUndo} tooltip="撤销 (Ctrl Z)" />
    <IconButton icon={<Redo />} onClick={redo} disabled={!canRedo} tooltip="重做 (Ctrl Shift Z)" />
  </ToolGroup>
</CanvasToolbar>
```

### 4. 知识模块卡片

**设计**: 可展开的手风琴式卡片

```tsx
<KnowledgeModule>
  <ModuleHeader>
    <ModuleIcon type={module.type} />
    <ModuleTitle>{module.title}</ModuleTitle>
    <ModuleBadge grade={module.grade} />
  </ModuleHeader>

  <ModuleContent>
    <Section title="核心概念">
      <ConceptList concepts={module.concepts} />
    </Section>

    <Section title="公式定理">
      <FormulaList formulas={module.formulas} />
    </Section>

    <Section title="互动演示">
      <DemoButton onClick={startDemo}>
        启动演示动画
      </DemoButton>
    </Section>

    <Section title="练习题">
      <QuizButton onClick={startQuiz}>
        开始测验 ({module.quizCount} 题)
      </QuizButton>
    </Section>
  </ModuleContent>
</KnowledgeModule>
```

---

## 🎭 交互流程设计

### 流程 1: 创建点

```
1. 用户点击左侧"点"按钮
   ↓
2. 画布模式切换为 'point'
   ↓
3. 光标变为十字准星 + 点预览
   ↓
4. 用户点击画布
   ↓
5. 创建点对象，自动分配标签 (A, B, C...)
   ↓
6. 点被添加到画布并选中
   ↓
7. 右侧面板显示点的属性
```

### 流程 2: 创建线段

```
1. 用户点击左侧"线段"按钮
   ↓
2. 画布模式切换为 'segment'
   ↓
3. 用户点击第一个点（起点）
   ↓
4. 显示临时点 + 跟随鼠标的虚线
   ↓
5. 用户点击第二个点（终点）
   ↓
6. 创建线段对象，自动计算长度、斜率、中点
   ↓
7. 线段被添加到画布并选中
   ↓
8. 右侧面板显示线段属性
```

### 流程 3: 创建四边形

```
1. 用户点击左侧"四边形"按钮
   ↓
2. 弹出子菜单选择类型:
   - 任意四边形（点击4个点）
   - 平行四边形（快速创建）
   - 矩形（快速创建）
   - 菱形（快速创建）
   - 正方形（快速创建）
   ↓
3a. 如果选择"任意四边形":
    - 点击4个点创建
    - 实时显示连接线
    - 第4个点后自动闭合
    ↓
3b. 如果选择"矩形":
    - 点击对角两个点
    - 自动生成矩形
    ↓
4. 创建四边形对象，计算所有属性
   ↓
5. 自动判定四边形类型
   ↓
6. 右侧面板显示:
   - 边长、角度
   - 对角线长度
   - 面积、周长
   - 类型判定结果
```

### 流程 4: 创建圆

```
1. 用户点击左侧"圆"按钮
   ↓
2. 弹出子菜单选择创建方式:
   - 圆心+半径
   - 三点定圆
   - 直径两端点
   ↓
3a. 如果选择"圆心+半径":
    - 点击确定圆心
    - 拖动鼠标调整半径
    - 实时显示圆的预览
    - 再次点击确定半径
    ↓
3b. 如果选择"三点定圆":
    - 点击三个点
    - 自动计算外接圆
    ↓
4. 创建圆对象，计算属性
   ↓
5. 右侧面板显示:
   - 圆心坐标
   - 半径、直径
   - 周长、面积
```

### 流程 5: 添加辅助线/工具

```
1. 用户选中一个图形
   ↓
2. 右侧面板切换到"工具"标签
   ↓
3. 根据图形类型显示可用工具:

   三角形:
   - 中线、高线、角平分线、中位线
   - 重心、垂心、内心、外心

   四边形:
   - 对角线
   - 对称轴

   圆:
   - 半径、直径
   - 切线
   - 内接多边形
   ↓
4. 用户点击工具按钮
   ↓
5. 如果需要选择顶点:
   - 高亮可选顶点
   - 用户点击选择
   ↓
6. 计算并渲染辅助线/点
   ↓
7. 辅助线可以单独显示/隐藏
```

### 流程 6: 知识学习

```
1. 用户在右侧面板切换到"知识"标签
   ↓
2. 显示知识模块列表（按年级分组）:

   初一:
   - 点、线、面基础
   - 相交线与平行线
   - 三角形基本性质

   初二:
   - 全等三角形
   - 特殊三角形
   - 四边形

   初三:
   - 相似三角形
   - 锐角三角函数
   - 圆
   ↓
3. 用户点击某个模块
   ↓
4. 展开显示:
   - 核心概念
   - 公式定理
   - 互动演示按钮
   - 练习题按钮
   ↓
5a. 如果点击"互动演示":
    - 画布自动创建演示图形
    - 播放动画演示
    - 配合文字解说
    ↓
5b. 如果点击"练习题":
    - 切换到"测验"标签
    - 显示题目列表
    - 用户答题并获得反馈
```

---

## 🎬 动画与反馈

### 微交互动画

```typescript
const animations = {
  // 按钮点击
  buttonClick: {
    scale: [1, 0.95, 1],
    duration: 150,
  },

  // 图形创建
  shapeAppear: {
    opacity: [0, 1],
    scale: [0.8, 1],
    duration: 300,
    easing: 'easeOutCubic',
  },

  // 图形选中
  shapeSelect: {
    strokeWidth: [2, 4],
    duration: 200,
  },

  // 辅助线出现
  auxiliaryLineAppear: {
    strokeDashoffset: [100, 0],
    duration: 500,
    easing: 'easeInOutQuad',
  },

  // 面板展开
  panelExpand: {
    height: ['0px', 'auto'],
    opacity: [0, 1],
    duration: 300,
  },
}
```

### 视觉反馈

1. **悬停状态**
   - 按钮: 背景色变浅 + 轻微放大
   - 图形: 边框加粗 + 颜色高亮
   - 顶点: 半径增大 + 显示标签

2. **选中状态**
   - 图形: 蓝色边框 + 控制点显示
   - 按钮: 蓝色背景 + 白色图标

3. **禁用状态**
   - 透明度 40%
   - 光标变为 not-allowed

4. **加载状态**
   - 旋转的加载图标
   - 骨架屏占位

---

## ♿ 无障碍设计

### 键盘导航

```typescript
const keyboardShortcuts = {
  // 工具切换
  'P': 'point',      // 点模式
  'L': 'segment',    // 线段模式
  'T': 'triangle',   // 三角形模式
  'Q': 'quad',       // 四边形模式
  'O': 'circle',     // 圆模式
  'V': 'select',     // 选择模式

  // 视图控制
  'Ctrl +': 'zoomIn',
  'Ctrl -': 'zoomOut',
  'Ctrl 0': 'resetZoom',
  'G': 'toggleGrid',
  'S': 'toggleSnap',

  // 编辑操作
  'Ctrl Z': 'undo',
  'Ctrl Shift Z': 'redo',
  'Delete': 'deleteSelected',
  'Escape': 'cancelOperation',

  // 导航
  'Tab': 'nextShape',
  'Shift Tab': 'prevShape',
  'Space': 'togglePanel',
}
```

### ARIA 标签

```tsx
<button
  aria-label="创建三角形"
  aria-pressed={mode === 'triangle'}
  aria-keyshortcuts="T"
>
  <Triangle />
</button>

<div
  role="region"
  aria-label="画布区域"
  aria-describedby="canvas-instructions"
>
  <Stage />
</div>

<div
  role="tabpanel"
  aria-labelledby="info-tab"
  aria-hidden={activeTab !== 'info'}
>
  <ShapeInfo />
</div>
```

---

## 📱 响应式适配

### 移动端适配 (< 768px)

```
┌─────────────────────────┐
│  Header (简化)          │
│  [☰] [Logo] [?]        │
├─────────────────────────┤
│                         │
│                         │
│      Canvas             │
│    (全屏显示)           │
│                         │
│                         │
├─────────────────────────┤
│  Bottom Sheet           │
│  [向上滑动查看属性]     │
└─────────────────────────┘
```

**移动端交互调整**:
- 左侧工具栏 → 底部工具栏
- 右侧面板 → 底部抽屉 (Bottom Sheet)
- 双指缩放画布
- 长按显示上下文菜单
- 触摸拖动移动图形

---

## 🎨 主题切换

### 浅色主题 (默认)
- 背景: #ffffff
- 画布: #f9fafb
- 文字: #111827
- 边框: #e5e7eb

### 深色主题
- 背景: #111827
- 画布: #1f2937
- 文字: #f9fafb
- 边框: #374151

```typescript
const theme = {
  light: {
    background: '#ffffff',
    canvas: '#f9fafb',
    text: '#111827',
    border: '#e5e7eb',
  },
  dark: {
    background: '#111827',
    canvas: '#1f2937',
    text: '#f9fafb',
    border: '#374151',
  },
}
```

---

## 📊 性能优化

### 渲染优化

1. **图层分离**
   - 静态图层: 网格、坐标轴
   - 内容图层: 图形、辅助线
   - 交互图层: 选中状态、临时元素

2. **虚拟化**
   - 只渲染可见区域的图形
   - 超出视口的图形不渲染

3. **节流防抖**
   - 鼠标移动事件节流 (16ms)
   - 窗口resize事件防抖 (300ms)
   - 属性计算防抖 (100ms)

4. **懒加载**
   - 知识模块内容按需加载
   - 图片资源懒加载

---

这个 UI/UX 设计方案提供了完整的视觉设计、交互流程和技术实现指导，可以直接用于开发实施。
