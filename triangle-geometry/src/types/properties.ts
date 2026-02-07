/**
 * 图形属性计算类型定义
 * 定义各种图形的属性计算结果类型
 */

import type { Point } from './geometry-base'

/** 三角形属性 */
export interface TriangleProperties {
  sideLengths: { AB: number; BC: number; CA: number }
  angles: { A: number; B: number; C: number }
  anglesInDegrees: { A: number; B: number; C: number }
  perimeter: number
  area: number
  type: 'equilateral' | 'isosceles' | 'right' | 'scalene'
  specialType?: 'acute' | 'obtuse' | 'right-angled'
  specialPoints: {
    centroid: Point | null
    orthocenter: Point | null
    incenter: Point | null
    circumcenter: Point | null
  }
}

/** 四边形属性 */
export interface QuadrilateralProperties {
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
export interface PolygonProperties {
  sideCount: number
  sideLengths: number[]
  angles: number[]
  perimeter: number
  area: number
  isConvex: boolean
  isRegular: boolean
  interiorAngleSum: number
  exteriorAngleSum: number
  apothem?: number
}

/** 圆属性 */
export interface CircleProperties {
  radius: number
  diameter: number
  circumference: number
  area: number
}
