/**
 * 多边形计算引擎
 * 实现多边形属性计算和判定功能
 */

import type { Point } from '../../types/geometry-base'
import type { PolygonProperties } from '../../types/properties'
import { distance, crossProduct } from '../core/point'

/**
 * 计算多边形的完整属性
 */
export function calculatePolygonProperties(
  vertices: Point[]
): PolygonProperties {
  const sideCount = vertices.length

  // 边长
  const sideLengths: number[] = []
  for (let i = 0; i < sideCount; i++) {
    const next = (i + 1) % sideCount
    sideLengths.push(distance(vertices[i], vertices[next]))
  }

  // 周长
  const perimeter = sideLengths.reduce((sum, len) => sum + len, 0)

  // 面积（鞋带公式）
  const area = calculatePolygonArea(vertices)

  // 内角和
  const interiorAngleSum = (sideCount - 2) * Math.PI
  const exteriorAngleSum = 2 * Math.PI

  // 判定凸多边形
  const isConvex = checkConvex(vertices)

  // 判定正多边形
  const isRegular = checkRegular(vertices, sideLengths)

  // 边心距（正多边形）
  let apothem: number | undefined
  if (isRegular) {
    apothem = area / (perimeter / 2)
  }

  // 内角（简化：假设凸多边形）
  const angles: number[] = []
  for (let i = 0; i < sideCount; i++) {
    // 简化：使用内角和平均值
    angles.push(interiorAngleSum / sideCount)
  }

  return {
    sideCount,
    sideLengths,
    angles,
    perimeter,
    area,
    isConvex,
    isRegular,
    interiorAngleSum,
    exteriorAngleSum,
    apothem,
  }
}

/**
 * 使用鞋带公式计算多边形面积
 */
export function calculatePolygonArea(vertices: Point[]): number {
  let area = 0
  const n = vertices.length

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    area += vertices[i].x * vertices[j].y
    area -= vertices[j].x * vertices[i].y
  }

  return Math.abs(area) / 2
}

/**
 * 判定凸多边形
 * 检查所有顶点的叉积是否同号
 */
export function checkConvex(vertices: Point[]): boolean {
  const n = vertices.length
  if (n < 3) return false

  let sign = 0

  for (let i = 0; i < n; i++) {
    const p1 = vertices[i]
    const p2 = vertices[(i + 1) % n]
    const p3 = vertices[(i + 2) % n]

    const v1 = { x: p2.x - p1.x, y: p2.y - p1.y }
    const v2 = { x: p3.x - p2.x, y: p3.y - p2.y }
    const cross = crossProduct(v1, v2)

    if (cross !== 0) {
      if (sign === 0) {
        sign = cross > 0 ? 1 : -1
      } else if ((cross > 0 ? 1 : -1) !== sign) {
        return false
      }
    }
  }

  return true
}

/**
 * 判定正多边形
 * 检查所有边长是否相等
 */
export function checkRegular(vertices: Point[], sideLengths: number[]): boolean {
  if (sideLengths.length < 3) return false

  const tolerance = 0.01
  const firstLength = sideLengths[0]

  for (let i = 1; i < sideLengths.length; i++) {
    if (Math.abs(sideLengths[i] - firstLength) > tolerance) {
      return false
    }
  }

  return true
}
