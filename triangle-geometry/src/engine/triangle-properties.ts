// 三角形属性计算
import { Point, TriangleProperties } from '../types/geometry'
import {
  distance,
  angle,
  triangleAreaByPoints,
  radiansToDegrees,
} from './geometry'
import { centroid, orthocenter, incenter, circumcenter } from './special-points'

/**
 * 计算特殊点
 */
function calculateSpecialPoints(vertices: [Point, Point, Point]) {
  return {
    centroid: centroid(vertices),
    orthocenter: orthocenter(vertices),
    incenter: incenter(vertices),
    circumcenter: circumcenter(vertices),
  }
}

/**
 * 计算完整的三角形属性
 */
export function calculateTriangleProperties(vertices: [Point, Point, Point]): TriangleProperties {
  // 计算边长
  const AB = distance(vertices[0], vertices[1])
  const BC = distance(vertices[1], vertices[2])
  const CA = distance(vertices[2], vertices[0])

  // 计算角度（弧度）
  const angleA = angle(vertices[1], vertices[0], vertices[2])
  const angleB = angle(vertices[2], vertices[1], vertices[0])
  const angleC = Math.PI - angleA - angleB // 三角形内角和180°

  // 转换为角度制
  const angleADeg = radiansToDegrees(angleA)
  const angleBDeg = radiansToDegrees(angleB)
  const angleCDeg = radiansToDegrees(angleC)

  // 周长
  const perimeter = AB + BC + CA

  // 面积
  const area = triangleAreaByPoints(vertices[0], vertices[1], vertices[2])

  // 判断三角形类型
  const type = classifyTriangle(AB, BC, CA, angleADeg, angleBDeg, angleCDeg)

  // 计算特殊点
  const specialPoints = calculateSpecialPoints(vertices)

  return {
    sideLengths: { AB, BC, CA },
    angles: { A: angleA, B: angleB, C: angleC },
    anglesInDegrees: { A: angleADeg, B: angleBDeg, C: angleCDeg },
    perimeter,
    area,
    type,
    specialType: classifyByAngle(angleADeg, angleBDeg, angleCDeg),
    specialPoints,
  }
}

/**
 * 判断三角形类型
 */
export function classifyTriangle(
  AB: number,
  BC: number,
  CA: number,
  angleA: number,
  angleB: number,
  angleC: number
): 'equilateral' | 'isosceles' | 'right' | 'scalene' {
  const tolerance = 1e-6

  // 等边三角形
  if (
    Math.abs(AB - BC) < tolerance &&
    Math.abs(BC - CA) < tolerance &&
    Math.abs(AB - CA) < tolerance
  ) {
    return 'equilateral'
  }

  // 直角三角形
  const angles = [angleA, angleB, angleC]
  const hasRightAngle = angles.some(a => Math.abs(a - 90) < tolerance)

  // 等腰三角形（两边相等或两角相等）
  const sides = [AB, BC, CA].sort((a, b) => a - b)
  const isIsosceles =
    Math.abs(sides[0] - sides[1]) < tolerance ||
    Math.abs(sides[1] - sides[2]) < tolerance ||
    angles.filter(a => Math.abs(a - angles[0]) < tolerance).length >= 2

  if (hasRightAngle) return 'right'
  if (isIsosceles) return 'isosceles'

  return 'scalene'
}

/**
 * 按角度分类三角形
 */
export function classifyByAngle(
  angleA: number,
  angleB: number,
  angleC: number
): 'acute' | 'right-angled' | 'obtuse' | undefined {
  const tolerance = 1e-6

  if (Math.abs(angleA - 90) < tolerance || Math.abs(angleB - 90) < tolerance || Math.abs(angleC - 90) < tolerance) {
    return 'right-angled'
  }

  const angles = [angleA, angleB, angleC].filter(a => a > 90)
  if (angles.length > 0) {
    return 'obtuse'
  }

  return 'acute'
}

/**
 * 验证三角形不等式
 */
export function validateTriangleInequality(AB: number, BC: number, CA: number): boolean {
  return AB + BC > CA && AB + CA > BC && BC + CA > AB
}

/**
 * 计算三角形的外接圆半径
 */
export function circumradius(AB: number, BC: number, CA: number, area: number): number {
  if (area === 0) return 0
  return (AB * BC * CA) / (4 * area)
}

/**
 * 计算三角形的内切圆半径
 */
export function inradius(area: number, perimeter: number): number {
  if (perimeter === 0) return 0
  return (2 * area) / perimeter
}

/**
 * 计算半周长（用于海伦公式）
 */
export function semiperimeter(AB: number, BC: number, CA: number): number {
  return (AB + BC + CA) / 2
}
