/**
 * 具体图形类型定义
 * 定义所有支持的几何图形类型
 */

import type { BaseShape, Point, LabelConfig, VertexLabel } from './geometry-base'
import type {
  TriangleProperties,
  QuadrilateralProperties,
  PolygonProperties,
  CircleProperties,
} from './properties'

/** 点图形 */
export interface PointShape extends BaseShape {
  type: 'point'
  position: Point
  label: LabelConfig
  style: {
    radius: number
    fill: string
    stroke: string
  }
}

/** 线段图形 */
export interface SegmentShape extends BaseShape {
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

/** 射线图形 */
export interface RayShape extends BaseShape {
  type: 'ray'
  origin: Point
  direction: Point
  label: LabelConfig
}

/** 直线图形 */
export interface LineShape extends BaseShape {
  type: 'line'
  point1: Point
  point2: Point
  label: LabelConfig
  equation?: {
    slope: number | 'vertical'
    intercept: number
    standard: string
  }
}
