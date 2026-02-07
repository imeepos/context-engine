/**
 * 圆形计算引擎
 * 实现圆的属性计算和相关功能
 */

import type { Point } from '../../types/geometry-base'
import type { CircleProperties } from '../../types/properties'
import { distance } from '../core/point'

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
