// 三角函数相关计算
import { Point } from '../types/geometry'
import { distance, angle, radiansToDegrees } from './geometry'

/**
 * 直角三角形的三角函数计算
 */
export interface TrigValues {
  sin: number
  cos: number
  tan: number
  sinDeg: number
  cosDeg: number
  tanDeg: number
}

/**
 * 计算给定角度的三角函数值
 */
export function calculateTrigFunctions(degrees: number): TrigValues {
  const radians = (degrees * Math.PI) / 180

  return {
    sin: Math.sin(radians),
    cos: Math.cos(radians),
    tan: Math.tan(radians),
    sinDeg: Math.sin(radians),
    cosDeg: Math.cos(radians),
    tanDeg: Math.tan(radians),
  }
}

/**
 * 从直角三角形的边计算三角函数
 * @param opposite 对边长度
 * @param adjacent 邻边长度
 * @param hypotenuse 斜边长度
 */
export function calculateTrigFromSides(
  opposite: number,
  adjacent: number,
  hypotenuse: number
): TrigValues {
  // 处理边界情况
  const tolerance = 1e-6

  const sin = hypotenuse > 0 ? opposite / hypotenuse : 0
  const cos = hypotenuse > 0 ? adjacent / hypotenuse : 0
  const tan = adjacent > 0 ? opposite / adjacent : (opposite > 0 ? Infinity : 0)

  return {
    sin: Math.abs(sin) > 1 ? Math.sign(sin) : sin,
    cos: Math.abs(cos) > 1 ? Math.sign(cos) : cos,
    tan: Math.abs(tan) > 1e10 ? Math.sign(tan) * Infinity : tan,
    sinDeg: Math.abs(sin) > 1 ? Math.sign(sin) : sin,
    cosDeg: Math.abs(cos) > 1 ? Math.sign(cos) : cos,
    tanDeg: Math.abs(tan) > 1e10 ? Math.sign(tan) * Infinity : tan,
  }
}

/**
 * 从直角三角形的角度计算各边的比例
 */
export function calculateSideRatios(degrees: number): { sin: number; cos: number; tan: number } {
  const radians = (degrees * Math.PI) / 180

  return {
    sin: Math.sin(radians),
    cos: Math.cos(radians),
    tan: Math.tan(radians),
  }
}

/**
 * 特殊角的三角函数值
 */
export const SPECIAL_ANGLES = {
  0: { sin: 0, cos: 1, tan: 0 },
  30: { sin: 0.5, cos: Math.sqrt(3) / 2, tan: Math.sqrt(3) / 3 },
  45: { sin: Math.sqrt(2) / 2, cos: Math.sqrt(2) / 2, tan: 1 },
  60: { sin: Math.sqrt(3) / 2, cos: 0.5, tan: Math.sqrt(3) },
  90: { sin: 1, cos: 0, tan: Infinity },
  180: { sin: 0, cos: -1, tan: 0 },
  270: { sin: -1, cos: 0, tan: 0 },
  360: { sin: 0, cos: 1, tan: 0 },
}

/**
 * 从顶点计算直角三角形的三角函数值
 * @param rightAngleVertex 直角顶点
 * @param vertices 三角形顶点
 */
export function calculateTrigFromTriangle(
  vertices: [Point, Point, Point]
): { A: TrigValues; B: TrigValues; C: TrigValues } | null {
  // 找出直角
  const angles = [
    angle(vertices[1], vertices[0], vertices[2]),
    angle(vertices[2], vertices[1], vertices[0]),
    angle(vertices[0], vertices[2], vertices[1]),
  ]

  const tolerance = 1e-6
  const rightAngleIndex = angles.findIndex(a => Math.abs(a - Math.PI / 2) < tolerance)

  if (rightAngleIndex === -1) {
    return null // 不是直角三角形
  }

  // 计算各边长度
  const sides = [
    distance(vertices[0], vertices[1]),
    distance(vertices[1], vertices[2]),
    distance(vertices[2], vertices[0]),
  ]

  // 找出斜边（最长的边）
  const hypotenuse = Math.max(...sides)
  const hypIndex = sides.indexOf(hypotenuse)

  // 直角的对边是斜边
  // 直角的两条边是直角边

  // 计算每个角的三角函数值
  const result: { A: TrigValues; B: TrigValues; C: TrigValues } = {
    A: { sin: 0, cos: 0, tan: 0, sinDeg: 0, cosDeg: 0, tanDeg: 0 },
    B: { sin: 0, cos: 0, tan: 0, sinDeg: 0, cosDeg: 0, tanDeg: 0 },
    C: { sin: 0, cos: 0, tan: 0, sinDeg: 0, cosDeg: 0, tanDeg: 0 },
  }

  // 遍历三个顶点
  for (let i = 0; i < 3; i++) {
    if (i === rightAngleIndex) continue // 跳过直角

    // 邻边：连接到直角顶点的边
    const rightAngleConnected = [
      (rightAngleIndex + 1) % 3,
      (rightAngleIndex + 2) % 3,
    ]

    const adjacentIdx = rightAngleConnected.find(idx => idx !== i)
    const oppositeIdx = rightAngleConnected.find(idx => idx === i)

    if (adjacentIdx === undefined || oppositeIdx === undefined) continue

    const adjacent = sides[adjacentIdx]
    const opposite = sides[oppositeIdx]

    result[('ABC'[i] as 'A' | 'B' | 'C')] = calculateTrigFromSides(opposite, adjacent, hypotenuse)
  }

  return result
}

/**
 * 勾股定理验证
 */
export function verifyPythagoras(vertices: [Point, Point, Point]): { verified: boolean; equation: string } {
  const sides = [
    distance(vertices[0], vertices[1]),
    distance(vertices[1], vertices[2]),
    distance(vertices[2], vertices[0]),
  ]

  const sorted = [...sides].sort((a, b) => a - b)
  const [a, b, c] = sorted // c 是斜边

  const tolerance = 1e-6
  const verified = Math.abs(a * a + b * b - c * c) < tolerance

  return {
    verified,
    equation: `${a.toFixed(2)}² + ${b.toFixed(2)}² = ${c.toFixed(2)}²`,
  }
}

/**
 * 根据勾股定理计算边长
 */
export function calculateByPythagoras(leg1: number, leg2?: number, hypotenuse?: number): number {
  const tolerance = 1e-6

  if (leg1 > 0 && leg2 !== undefined && leg2 > 0) {
    // 已知两条直角边，计算斜边
    return Math.sqrt(leg1 * leg1 + leg2 * leg2)
  }

  if (leg1 > 0 && hypotenuse !== undefined && hypotenuse > leg1) {
    // 已知一条直角边和斜边，计算另一条直角边
    return Math.sqrt(hypotenuse * hypotenuse - leg1 * leg1)
  }

  return 0
}

/**
 * 30-60-90 特殊三角形的边长比例
 */
export const THIRTY_SIXTY_NINETY_RATIO = {
  shortLeg: 1,
  longLeg: Math.sqrt(3),
  hypotenuse: 2,
}

/**
 * 45-45-90 等腰直角三角形的边长比例
 */
export const FORTY_FIVE_RATIOS = {
  legs: 1,
  hypotenuse: Math.sqrt(2),
}
