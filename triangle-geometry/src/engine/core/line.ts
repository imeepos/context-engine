/**
 * 直线和线段的运算
 */

import type { Point } from '../../types/geometry-base'
import { vector, crossProduct, dotProduct, vectorMagnitude, midpoint } from './point'

/**
 * 计算线段的垂直平分线上的点
 * @param lineStart 线段起点
 * @param lineEnd 线段终点
 * @param distanceFromMidpoint 到中点的距离
 */
export function perpendicularPoint(
  lineStart: Point,
  lineEnd: Point,
  distanceFromMidpoint: number
): Point {
  const mid = midpoint(lineStart, lineEnd)
  const dx = lineEnd.x - lineStart.x
  const dy = lineEnd.y - lineStart.y
  const length = Math.sqrt(dx * dx + dy * dy)

  if (length === 0) return mid

  // 垂直向量
  const perpX = -dy / length
  const perpY = dx / length

  return {
    x: mid.x + perpX * distanceFromMidpoint,
    y: mid.y + perpY * distanceFromMidpoint,
  }
}

/**
 * 计算点 p 到线段 ab 的垂足
 */
export function perpendicularFoot(p: Point, a: Point, b: Point): Point {
  const ab = vector(a, b)
  const ap = vector(a, p)

  const abLengthSq = ab.x * ab.x + ab.y * ab.y

  if (abLengthSq === 0) return a

  // 投影系数
  const t = dotProduct(ap, ab) / abLengthSq

  // 限制在线段范围内
  const clampedT = Math.max(0, Math.min(1, t))

  return {
    x: a.x + clampedT * ab.x,
    y: a.y + clampedT * ab.y,
  }
}

/**
 * 判断点是否在线段上
 */
export function pointOnSegment(
  p: Point,
  a: Point,
  b: Point,
  tolerance: number = 1e-6
): boolean {
  const cross = crossProduct(vector(a, b), vector(a, p))
  if (Math.abs(cross) > tolerance) return false

  const dot = dotProduct(vector(a, p), vector(b, p))
  return dot <= tolerance
}
