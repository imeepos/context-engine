// 基础几何类型定义

export interface Point {
  x: number
  y: number
}

export type VertexLabel = 'A' | 'B' | 'C'

export interface Triangle {
  id: string
  vertices: [Point, Point, Point]
  labels: [VertexLabel, VertexLabel, VertexLabel]
  auxiliaryLines: AuxiliaryLine[]
  color: string
  opacity: number
}

export interface Line {
  start: Point
  end: Point
}

export type AuxiliaryLineType = 'median' | 'altitude' | 'bisector' | 'midline'

export interface AuxiliaryLine {
  id: string
  type: AuxiliaryLineType
  fromVertex: number // 0=A, 1=B, 2=C
  toSide?: number // 对边的顶点索引
  visible: boolean
  animated: boolean // 是否显示动画
}

export interface TriangleProperties {
  // 边长
  sideLengths: {
    AB: number
    BC: number
    CA: number
  }
  // 角度 (弧度)
  angles: {
    A: number
    B: number
    C: number
  }
  // 角度 (角度制)
  anglesInDegrees: {
    A: number
    B: number
    C: number
  }
  // 周长
  perimeter: number
  // 面积
  area: number
  // 类型分类
  type: 'equilateral' | 'isosceles' | 'right' | 'scalene'
  // 特殊类型
  specialType?: 'acute' | 'obtuse' | 'right-angled'
  // 特殊点
  specialPoints: {
    centroid: Point | null      // 重心
    orthocenter: Point | null   // 垂心
    incenter: Point | null      // 内心
    circumcenter: Point | null // 外心
  }
}

export interface Measurement {
  sideLengths: boolean
  angles: boolean
  perimeter: boolean
  area: boolean
  type: boolean
  specialPoints: boolean
}

export interface AnimationConfig {
  id: string
  type: 'angle-sum' | 'pythagorean' | 'congruence' | 'median-split' | 'bisector-demo'
  playing: boolean
  progress: number
}
