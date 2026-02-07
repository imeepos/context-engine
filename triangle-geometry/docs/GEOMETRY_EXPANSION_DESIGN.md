# 几何知识扩展设计方案

## 📋 目录

1. [项目现状分析](#项目现状分析)
2. [扩展目标](#扩展目标)
3. [架构设计](#架构设计)
4. [数据模型设计](#数据模型设计)
5. [计算引擎扩展](#计算引擎扩展)
6. [UI/UX 设计](#uiux-设计)
7. [交互流程设计](#交互流程设计)
8. [实现路线图](#实现路线图)

---

## 1. 项目现状分析

### 当前功能范围
- ✅ 三角形的创建、编辑、删除
- ✅ 三角形属性计算（边长、角度、面积、周长）
- ✅ 辅助线（中线、高线、角平分线、中位线）
- ✅ 特殊点（重心、垂心、内心、外心）
- ✅ 全等和相似判定
- ✅ 7 个知识模块（初一到初三）

### 当前架构优势
1. **清晰的分层架构**：引擎层、状态层、UI层分离
2. **可扩展的类型系统**：TypeScript 严格类型检查
3. **灵活的状态管理**：Zustand 多 store 设计
4. **高性能渲染**：React Konva 多图层架构
5. **完善的测试覆盖**：核心计算引擎有单元测试

### 当前限制
- ❌ 只支持三角形，无法学习其他几何图形
- ❌ 缺少基础几何元素（点、线、面）的独立操作
- ❌ 无法创建复杂多边形和圆形
- ❌ 知识模块局限于三角形相关内容

---

## 2. 扩展目标

### 核心目标
将 **triangle-geometry** 升级为 **geometry-learning-platform**，支持完整的平面几何学习体系。

### 几何元素扩展

| 类别 | 元素 | 优先级 | 学习阶段 |
|------|------|--------|----------|
| **基础元素** | 点 (Point) | P0 | 小学/初一 |
| | 线段 (Segment) | P0 | 小学/初一 |
| | 射线 (Ray) | P1 | 初一 |
| | 直线 (Line) | P1 | 初一 |
| **三角形** | 普通三角形 | ✅ 已完成 | 初一-初三 |
| **四边形** | 平行四边形 | P0 | 初二 |
| | 矩形 | P0 | 初二 |
| | 菱形 | P0 | 初二 |
| | 正方形 | P0 | 初二 |
| | 梯形 | P1 | 初二 |
| **多边形** | 正多边形 (n边形) | P1 | 初三 |
| | 不规则多边形 | P2 | 初三 |
| **圆形** | 圆 (Circle) | P0 | 初三 |
| | 扇形 (Sector) | P1 | 初三 |
| | 弓形 (Segment) | P2 | 初三 |
| **复合图形** | 圆与多边形组合 | P2 | 初三/高中 |

---

## 3. 架构设计

### 3.1 整体架构升级

```
┌─────────────────────────────────────────────────────────────┐
│                    应用层 (App Layer)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Canvas UI   │  │  Panel UI    │  │  Toolbar UI  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   状态管理层 (State Layer)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Shape Store  │  │ Canvas Store │  │ Module Store │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   计算引擎层 (Engine Layer)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Point Engine │  │ Line Engine  │  │ Shape Engine │      │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤      │
│  │ Triangle Eng │  │ Quad Engine  │  │ Circle Engine│      │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤      │
│  │ Polygon Eng  │  │ Transform Eng│  │ Relation Eng │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 核心设计原则

1. **统一的图形抽象**：所有图形继承自 `BaseShape` 接口
2. **可组合的计算引擎**：每个引擎专注于特定几何计算
3. **分离的渲染层**：每种图形有独立的 Konva Layer
4. **模块化的知识体系**：知识模块按年级和主题组织

---

## 4. 数据模型设计

### 4.1 基础类型定义

```typescript
// src/types/geometry-base.ts

/** 基础点类型 */
interface Point {
  x: number
  y: number
  id?: string
  label?: string
}

/** 图形基类 */
interface BaseShape {
  id: string
  type: ShapeType
  visible: boolean
  locked: boolean
  color: string
  opacity: number
  zIndex: number
  metadata?: Record<string, any>
}

/** 图形类型枚举 */
type ShapeType =
  | 'point'
  | 'segment'
  | 'ray'
  | 'line'
  | 'triangle'
  | 'quadrilateral'
  | 'polygon'
  | 'circle'
  | 'arc'
  | 'sector'

/** 标签配置 */
interface LabelConfig {
  text: string
  visible: boolean
  position: 'auto' | 'top' | 'bottom' | 'left' | 'right'
  offset: { x: number; y: number }
}
```

### 4.2 具体图形类型

```typescript
// src/types/shapes.ts

/** 点 */
interface PointShape extends BaseShape {
  type: 'point'
  position: Point
  label: LabelConfig
  style: {
    radius: number
    fill: string
    stroke: string
  }
}

/** 线段 */
interface SegmentShape extends BaseShape {
  type: 'segment'
  start: Point
  end: Point
  label: LabelConfig
  style: {
    strokeWidth: number
    dash?: number[]
  }
  measurements: {
    length: number
    midpoint: Point
  }
}

/** 射线 */
interface RayShape extends BaseShape {
  type: 'ray'
  origin: Point
  direction: Point  // 方向点
  label: LabelConfig
}

/** 直线 */
interface LineShape extends BaseShape {
  type: 'line'
  point1: Point
  point2: Point  // 用两点确定直线
  label: LabelConfig
  equation?: {
    slope: number | 'vertical'
    intercept: number
    standard: string  // Ax + By + C = 0
  }
}

/** 三角形 (已有，需要适配新接口) */
interface TriangleShape extends BaseShape {
  type: 'triangle'
  vertices: [Point, Point, Point]
  labels: [LabelConfig, LabelConfig, LabelConfig]
  auxiliaryLines: AuxiliaryLine[]
  properties: TriangleProperties
}

/** 四边形 */
interface QuadrilateralShape extends BaseShape {
  type: 'quadrilateral'
  vertices: [Point, Point, Point, Point]
  labels: [LabelConfig, LabelConfig, LabelConfig, LabelConfig]
  quadType: 'parallelogram' | 'rectangle' | 'rhombus' | 'square' | 'trapezoid' | 'general'
  properties: QuadrilateralProperties
  diagonals?: {
    AC: { visible: boolean; length: number }
    BD: { visible: boolean; length: number }
    intersection: Point | null
  }
}

/** 多边形 */
interface PolygonShape extends BaseShape {
  type: 'polygon'
  vertices: Point[]  // n个顶点
  labels: LabelConfig[]
  closed: boolean
  polygonType: 'regular' | 'irregular'
  properties: PolygonProperties
}

/** 圆 */
interface CircleShape extends BaseShape {
  type: 'circle'
  center: Point
  radius: number
  label: LabelConfig
  style: {
    fill: string
    stroke: string
    strokeWidth: number
  }
  properties: CircleProperties
  annotations?: {
    showRadius: boolean
    showDiameter: boolean
    showCenter: boolean
  }
}

/** 扇形 */
interface SectorShape extends BaseShape {
  type: 'sector'
  center: Point
  radius: number
  startAngle: number  // 弧度
  endAngle: number    // 弧度
  properties: {
    arcLength: number
    area: number
    centralAngle: number
  }
}

/** 联合类型 */
type Shape =
  | PointShape
  | SegmentShape
  | RayShape
  | LineShape
  | TriangleShape
  | QuadrilateralShape
  | PolygonShape
  | CircleShape
  | SectorShape
```

### 4.3 属性计算类型

```typescript
// src/types/properties.ts

/** 四边形属性 */
interface QuadrilateralProperties {
  sideLengths: { AB: number; BC: number; CD: number; DA: number }
  angles: { A: number; B: number; C: number; D: number }
  diagonals: { AC: number; BD: number }
  perimeter: number
  area: number
  isParallelogram: boolean
  isRectangle: boolean
  isRhombus: boolean
  isSquare: boolean
  isTrapezoid: boolean
}

/** 多边形属性 */
interface PolygonProperties {
  sideCount: number
  sideLengths: number[]
  angles: number[]
  perimeter: number
  area: number
  isConvex: boolean
  isRegular: boolean
  interiorAngleSum: number
  exteriorAngleSum: number
  apothem?: number  // 边心距（正多边形）
}

/** 圆属性 */
interface CircleProperties {
  radius: number
  diameter: number
  circumference: number
  area: number
}
```

---

## 5. 计算引擎扩展

### 5.1 引擎模块组织

```
src/engine/
├── core/
│   ├── point.ts              # 点的基础运算
│   ├── vector.ts             # 向量运算
│   ├── line.ts               # 直线/线段/射线运算
│   └── transform.ts          # 几何变换
├── shapes/
│   ├── triangle.ts           # ✅ 已有
│   ├── quadrilateral.ts      # 四边形计算
│   ├── polygon.ts            # 多边形计算
│   └── circle.ts             # 圆形计算
├── relations/
│   ├── distance.ts           # 距离关系
│   ├── angle.ts              # 角度关系
│   ├── parallel.ts           # 平行关系
│   ├── perpendicular.ts      # 垂直关系
│   └── intersection.ts       # 相交关系
├── properties/
│   ├── triangle-properties.ts    # ✅ 已有
│   ├── quad-properties.ts        # 四边形属性
│   ├── polygon-properties.ts     # 多边形属性
│   └── circle-properties.ts      # 圆属性
└── advanced/
    ├── congruence.ts         # ✅ 已有
    ├── similarity.ts         # ✅ 已有
    ├── symmetry.ts           # 对称性判定
    └── tangency.ts           # 切线关系
```

### 5.2 核心引擎实现示例

#### 四边形引擎

```typescript
// src/engine/shapes/quadrilateral.ts

import { Point } from '@/types/geometry-base'
import { QuadrilateralProperties } from '@/types/properties'
import { distance, angle } from '@/engine/core/point'
import { lineIntersection } from '@/engine/core/line'

/**
 * 计算四边形的完整属性
 */
export function calculateQuadProperties(
  vertices: [Point, Point, Point, Point]
): QuadrilateralProperties {
  const [A, B, C, D] = vertices

  // 边长
  const AB = distance(A, B)
  const BC = distance(B, C)
  const CD = distance(C, D)
  const DA = distance(D, A)

  // 对角线
  const AC = distance(A, C)
  const BD = distance(B, D)

  // 内角
  const angleA = angle(D, A, B)
  const angleB = angle(A, B, C)
  const angleC = angle(B, C, D)
  const angleD = angle(C, D, A)

  // 周长和面积
  const perimeter = AB + BC + CD + DA
  const area = calculateQuadArea(vertices)

  // 判定特殊四边形
  const isParallelogram = checkParallelogram(vertices)
  const isRectangle = checkRectangle(vertices, isParallelogram)
  const isRhombus = checkRhombus(vertices, isParallelogram)
  const isSquare = isRectangle && isRhombus
  const isTrapezoid = checkTrapezoid(vertices)

  return {
    sideLengths: { AB, BC, CD, DA },
    angles: {
      A: angleA,
      B: angleB,
      C: angleC,
      D: angleD
    },
    diagonals: { AC, BD },
    perimeter,
    area,
    isParallelogram,
    isRectangle,
    isRhombus,
    isSquare,
    isTrapezoid,
  }
}

/**
 * 使用鞋带公式计算四边形面积
 */
function calculateQuadArea(vertices: [Point, Point, Point, Point]): number {
  const [A, B, C, D] = vertices
  return Math.abs(
    (A.x * B.y - B.x * A.y) +
    (B.x * C.y - C.x * B.y) +
    (C.x * D.y - D.x * C.y) +
    (D.x * A.y - A.x * D.y)
  ) / 2
}

/**
 * 判定平行四边形：对边平行且相等
 */
function checkParallelogram(vertices: [Point, Point, Point, Point]): boolean {
  const [A, B, C, D] = vertices

  // 对边相等
  const AB = distance(A, B)
  const CD = distance(C, D)
  const BC = distance(B, C)
  const DA = distance(D, A)

  const tolerance = 0.01
  return (
    Math.abs(AB - CD) < tolerance &&
    Math.abs(BC - DA) < tolerance
  )
}

/**
 * 判定矩形：平行四边形 + 一个直角
 */
function checkRectangle(
  vertices: [Point, Point, Point, Point],
  isParallelogram: boolean
): boolean {
  if (!isParallelogram) return false

  const [A, B, C] = vertices
  const angleABC = angle(A, B, C)

  return Math.abs(angleABC - Math.PI / 2) < 0.01
}

/**
 * 判定菱形：平行四边形 + 四边相等
 */
function checkRhombus(
  vertices: [Point, Point, Point, Point],
  isParallelogram: boolean
): boolean {
  if (!isParallelogram) return false

  const [A, B, C, D] = vertices
  const AB = distance(A, B)
  const BC = distance(B, C)
  const CD = distance(C, D)
  const DA = distance(D, A)

  const tolerance = 0.01
  return (
    Math.abs(AB - BC) < tolerance &&
    Math.abs(BC - CD) < tolerance &&
    Math.abs(CD - DA) < tolerance
  )
}

/**
 * 判定梯形：一组对边平行
 */
function checkTrapezoid(vertices: [Point, Point, Point, Point]): boolean {
  // 检查 AB || CD 或 BC || DA
  // 使用向量叉积判定平行
  const [A, B, C, D] = vertices

  const AB = { x: B.x - A.x, y: B.y - A.y }
  const CD = { x: D.x - C.x, y: D.y - C.y }
  const BC = { x: C.x - B.x, y: C.y - B.y }
  const DA = { x: A.x - D.x, y: A.y - D.y }

  const cross1 = Math.abs(AB.x * CD.y - AB.y * CD.x)
  const cross2 = Math.abs(BC.x * DA.y - BC.y * DA.x)

  const tolerance = 0.01
  return cross1 < tolerance || cross2 < tolerance
}
```

#### 圆形引擎

```typescript
// src/engine/shapes/circle.ts

import { Point } from '@/types/geometry-base'
import { CircleProperties } from '@/types/properties'
import { distance } from '@/engine/core/point'

/**
 * 计算圆的属性
 */
export function calculateCircleProperties(
  center: Point,
  radius: number
): CircleProperties {
  return {
    radius,
    diameter: radius * 2,
    circumference: 2 * Math.PI * radius,
    area: Math.PI * radius * radius,
  }
}

/**
 * 通过三点确定圆
 * 返回圆心和半径
 */
export function circleFromThreePoints(
  p1: Point,
  p2: Point,
  p3: Point
): { center: Point; radius: number } | null {
  // 使用外接圆算法
  const ax = p1.x
  const ay = p1.y
  const bx = p2.x
  const by = p2.y
  const cx = p3.x
  const cy = p3.y

  const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by))

  if (Math.abs(d) < 0.0001) {
    return null // 三点共线
  }

  const ux = ((ax * ax + ay * ay) * (by - cy) +
              (bx * bx + by * by) * (cy - ay) +
              (cx * cx + cy * cy) * (ay - by)) / d

  const uy = ((ax * ax + ay * ay) * (cx - bx) +
              (bx * bx + by * by) * (ax - cx) +
              (cx * cx + cy * cy) * (bx - ax)) / d

  const center = { x: ux, y: uy }
  const radius = distance(center, p1)

  return { center, radius }
}

/**
 * 判断点是否在圆内
 */
export function isPointInCircle(
  point: Point,
  center: Point,
  radius: number
): boolean {
  return distance(point, center) <= radius
}

/**
 * 判断点是否在圆上
 */
export function isPointOnCircle(
  point: Point,
  center: Point,
  radius: number,
  tolerance = 0.01
): boolean {
  const dist = distance(point, center)
  return Math.abs(dist - radius) < tolerance
}

/**
 * 计算圆与直线的交点
 */
export function circleLineIntersection(
  center: Point,
  radius: number,
  lineStart: Point,
  lineEnd: Point
): Point[] {
  // 使用参数方程求解
  const dx = lineEnd.x - lineStart.x
  const dy = lineEnd.y - lineStart.y
  const fx = lineStart.x - center.x
  const fy = lineStart.y - center.y

  const a = dx * dx + dy * dy
  const b = 2 * (fx * dx + fy * dy)
  const c = fx * fx + fy * fy - radius * radius

  const discriminant = b * b - 4 * a * c

  if (discriminant < 0) {
    return [] // 无交点
  }

  const t1 = (-b - Math.sqrt(discriminant)) / (2 * a)
  const t2 = (-b + Math.sqrt(discriminant)) / (2 * a)

  const intersections: Point[] = []

  if (t1 >= 0 && t1 <= 1) {
    intersections.push({
      x: lineStart.x + t1 * dx,
      y: lineStart.y + t1 * dy,
    })
  }

  if (t2 >= 0 && t2 <= 1 && Math.abs(t1 - t2) > 0.0001) {
    intersections.push({
      x: lineStart.x + t2 * dx,
      y: lineStart.y + t2 * dy,
    })
  }

  return intersections
}

/**
 * 计算两圆的交点
 */
export function circleCir