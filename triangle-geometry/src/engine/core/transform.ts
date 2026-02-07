/**
 * 几何变换运算
 */

import type { Point } from '../../types/geometry-base'
import { vector, crossProduct } from './point'

/**
 * 旋转向量
 */
export function rotateVector(v: Point, angleRad: number): Point {
  return {
    x: v.x * Math.cos(angleRad) - v.y * Math.sin(angleRad),
    y: v.x * Math.sin(angleRad) + v.y * Math.cos(angleRad),
  }
}

/**
 * 缩放点（以指定中心为基准）
 */
export function scalePoint(
  p: Point,
  scale: number,
  center: Point = { x: 0, y: 0 }
): Point {
  return {
    x: center.x + (p.x - center.x) * scale,
    y: center.y + (p.y - center.y) * scale,
  }
}

/**
 * 平移点
 */
export function translatePoint(p: Point, dx: number, dy: number): Point {
  return { x: p.x + dx, y: p.y + dy }
}

/**
 * 计算两条直线的交点
 */
export function lineIntersection(
  p1: Point,
  p2: Point,
  p3: Point,
  p4: Point
): Point | null {
  const d1 = crossProduct(vector(p1, p2), vector(p1, p3))
  const d2 = crossProduct(vector(p1, p2), vector(p1, p4))

  if (Math.abs(d1 - d2) < 1e-6) return null

  const t = crossProduct(vector(p1, p3), vector(p1, p4)) / (d1 - d2)

  return {
    x: p1.x + t * (p2.x - p1.x),
    y: p1.y + t * (p2.y - p1.y),
  }
}

/**
 * 计算点到直线的距离
 */
export function pointToLineDistance(p: Point, a: Point, b: Point): number {
  const area = Math.abs(
    (a.x * (b.y - p.y) + b.x * (p.y - a.y) + p.x * (a.y - b.y)) / 2
  )
  const dx = b.x - a.x
  const dy = b.y - a.y
  const base = Math.sqrt(dx * dx + dy * dy)
  return base > 0 ? (2 * area) / base : 0
}
