/**
 * 基础几何类型定义
 * 为所有几何图形提供统一的抽象接口
 */

/** 基础点类型 */
export interface Point {
  x: number
  y: number
  id?: string
  label?: string
}

/** 图形类型枚举 */
export type ShapeType =
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
export interface LabelConfig {
  text: string
  visible: boolean
  position: 'auto' | 'top' | 'bottom' | 'left' | 'right'
  offset: { x: number; y: number }
}

/** 图形基类 - 所有图形都继承此接口 */
export interface BaseShape {
  id: string
  type: ShapeType
  visible: boolean
  locked: boolean
  color: string
  opacity: number
  zIndex: number
  metadata?: Record<string, any>
}

/** 顶点标签类型 */
export type VertexLabel = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L' | 'M' | 'N' | 'O' | 'P' | 'Q' | 'R' | 'S' | 'T' | 'U' | 'V' | 'W' | 'X' | 'Y' | 'Z'
