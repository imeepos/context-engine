// 全等三角形判定
import { Point } from '../types/geometry'
import { distance, triangleAreaByPoints, validateTriangleInequality } from './geometry'

export interface CongruenceCriteria {
  name: string
  description: string
  formula: string
  satisfied: boolean
}

/**
 * SSS (Side-Side-Side) 边边边判定
 * 三边对应相等的两个三角形全等
 */
export function checkSSS(vertices1: [Point, Point, Point], vertices2: [Point, Point, Point]): CongruenceCriteria {
  const sides1 = [
    distance(vertices1[0], vertices1[1]),
    distance(vertices1[1], vertices1[2]),
    distance(vertices1[2], vertices1[0]),
  ]
  const sides2 = [
    distance(vertices2[0], vertices2[1]),
    distance(vertices2[1], vertices2[2]),
    distance(vertices2[2], vertices2[0]),
  ]

  // 排序后比较
  const sorted1 = [...sides1].sort((a, b) => a - b)
  const sorted2 = [...sides2].sort((a, b) => a - b)

  const tolerance = 1e-6
  const satisfied =
    Math.abs(sorted1[0] - sorted2[0]) < tolerance &&
    Math.abs(sorted1[1] - sorted2[1]) < tolerance &&
    Math.abs(sorted1[2] - sorted2[2]) < tolerance

  return {
    name: 'SSS',
    description: '三边（Side-Side-Side）：三边对应相等的两个三角形全等',
    formula: 'AB = A′B′, BC = B′C′, CA = C′A′',
    satisfied,
  }
}

/**
 * SAS (Side-Angle-Side) 边角边判定
 * 两边及其夹角对应相等的两个三角形全等
 */
export function checkSAS(vertices1: [Point, Point, Point], vertices2: [Point, Point, Point]): CongruenceCriteria {
  // 比较以AB为边的夹角
  const sides1AB = distance(vertices1[0], vertices1[1])
  const sides1AC = distance(vertices1[0], vertices1[2])
  const sides2AB = distance(vertices2[0], vertices2[1])
  const sides2AC = distance(vertices2[0], vertices2[2])

  // 计算夹角
  const angle1 = Math.acos(
    (sides1AB * sides1AB + sides1AC * sides1AC -
      distance(vertices1[1], vertices1[2]) ** 2) /
    (2 * sides1AB * sides1AC)
  )
  const angle2 = Math.acos(
    (sides2AB * sides2AB + sides2AC * sides2AC -
      distance(vertices2[1], vertices2[2]) ** 2) /
    (2 * sides2AB * sides2AC)
  )

  const tolerance = 1e-6
  const satisfied =
    Math.abs(sides1AB - sides2AB) < tolerance &&
    Math.abs(sides1AC - sides2AC) < tolerance &&
    Math.abs(angle1 - angle2) < tolerance

  return {
    name: 'SAS',
    description: '两边及其夹角（Side-Angle-Side）对应相等的两个三角形全等',
    formula: 'AB = A′B′, ∠A = ∠A′, AC = A′C′',
    satisfied,
  }
}

/**
 * ASA (Angle-Side-Angle) 角边角判定
 * 两角及其夹边对应相等的两个三角形全等
 */
export function checkASA(vertices1: [Point, Point, Point], vertices2: [Point, Point, Point]): CongruenceCriteria {
  const sides1 = distance(vertices1[0], vertices1[1])
  const sides2 = distance(vertices2[0], vertices2[1])

  // 计算角A
  const sides1AC = distance(vertices1[0], vertices1[2])
  const sides1BC = distance(vertices1[1], vertices1[2])
  const angle1A = Math.acos(
    (sides1 * sides1 + sides1AC * sides1AC - sides1BC * sides1BC) /
    (2 * sides1 * sides1AC)
  )

  const sides2AC = distance(vertices2[0], vertices2[2])
  const sides2BC = distance(vertices2[1], vertices2[2])
  const angle2A = Math.acos(
    (sides2 * sides2 + sides2AC * sides2AC - sides2BC * sides2BC) /
    (2 * sides2 * sides2AC)
  )

  // 计算角B
  const angle1B = Math.PI - angle1A -
    Math.acos(
      (sides1 * sides1 + sides1BC * sides1BC - sides1AC * sides1AC) /
      (2 * sides1 * sides1BC)
    )
  const angle2B = Math.PI - angle2A -
    Math.acos(
      (sides2 * sides2 + sides2BC * sides2BC - sides2AC * sides2AC) /
      (2 * sides2 * sides2BC)
    )

  const tolerance = 1e-6
  const satisfied =
    Math.abs(sides1 - sides2) < tolerance &&
    Math.abs(angle1A - angle2A) < tolerance &&
    Math.abs(angle1B - angle2B) < tolerance

  return {
    name: 'ASA',
    description: '两角及其夹边（Angle-Side-Angle）对应相等的两个三角形全等',
    formula: '∠A = ∠A′, AB = A′B′, ∠B = ∠B′',
    satisfied,
  }
}

/**
 * AAS (Angle-Angle-Side) 角角边判定
 * 两角及其中一角的对边对应相等的两个三角形全等
 */
export function checkAAS(vertices1: [Point, Point, Point], vertices2: [Point, Point, Point]): CongruenceCriteria {
  // 由于三角形内角和为180°，AAS实际上等价于ASA
  // 这里实现两角及任意一边的判定

  // 计算所有角度
  const sides1 = [
    distance(vertices1[0], vertices1[1]),
    distance(vertices1[1], vertices1[2]),
    distance(vertices1[2], vertices1[0]),
  ]
  const sides2 = [
    distance(vertices2[0], vertices2[1]),
    distance(vertices2[1], vertices2[2]),
    distance(vertices2[2], vertices2[0]),
  ]

  // 简化：AAS 检查任意两个角相等且任意一条边相等
  const angle1 = calculateAngles(vertices1)
  const angle2 = calculateAngles(vertices2)

  const tolerance = 1e-6
  const hasTwoEqualAngles =
    (Math.abs(angle1.A - angle2.A) < tolerance && Math.abs(angle1.B - angle2.B) < tolerance) ||
    (Math.abs(angle1.A - angle2.A) < tolerance && Math.abs(angle1.C - angle2.C) < tolerance) ||
    (Math.abs(angle1.B - angle2.B) < tolerance && Math.abs(angle1.C - angle2.C) < tolerance)

  const hasOneEqualSide =
    Math.abs(sides1[0] - sides2[0]) < tolerance ||
    Math.abs(sides1[1] - sides2[1]) < tolerance ||
    Math.abs(sides1[2] - sides2[2]) < tolerance

  const satisfied = hasTwoEqualAngles && hasOneEqualSide

  return {
    name: 'AAS',
    description: '两角及其中一角的对边（Angle-Angle-Side）对应相等的两个三角形全等',
    formula: '∠A = ∠A′, ∠B = ∠B′, BC = B′C′',
    satisfied,
  }
}

/**
 * HL (Hypotenuse-Leg) 斜边直角边判定
 * 直角三角形的斜边和一条直角边对应相等
 * 注意：HL 只适用于直角三角形
 */
export function checkHL(vertices1: [Point, Point, Point], vertices2: [Point, Point, Point]): CongruenceCriteria {
  // 检查是否为直角三角形
  const angles1 = calculateAngles(vertices1)
  const angles2 = calculateAngles(vertices2)

  const isRight1 = Math.abs(angles1.A - 90) < 1e-6 ||
    Math.abs(angles1.B - 90) < 1e-6 ||
    Math.abs(angles1.C - 90) < 1e-6

  const isRight2 = Math.abs(angles2.A - 90) < 1e-6 ||
    Math.abs(angles2.B - 90) < 1e-6 ||
    Math.abs(angles2.C - 90) < 1e-6

  if (!isRight1 || !isRight2) {
    return {
      name: 'HL',
      description: '斜边直角边（Hypotenuse-Leg）：直角三角形的斜边和一条直角边对应相等',
      formula: '∠C = ∠C′ = 90°, AB = A′B′, AC = A′C′',
      satisfied: false,
    }
  }

  // 计算斜边（最长的边）
  const sides1 = [
    distance(vertices1[0], vertices1[1]),
    distance(vertices1[1], vertices1[2]),
    distance(vertices1[2], vertices1[0]),
  ]
  const sides2 = [
    distance(vertices2[0], vertices2[1]),
    distance(vertices2[1], vertices2[2]),
    distance(vertices2[2], vertices2[0]),
  ]

  const hypotenuse1 = Math.max(...sides1)
  const hypotenuse2 = Math.max(...sides2)

  // 找到斜边对应的索引
  const hypIndex1 = sides1.indexOf(hypotenuse1)
  const hypIndex2 = sides2.indexOf(hypotenuse2)

  // 计算斜边之外的边（直角边）
  const leg1Sum = sides1.reduce((sum, s, i) => (i !== hypIndex1 ? sum + s : sum), 0)
  const leg2Sum = sides2.reduce((sum, s, i) => (i !== hypIndex2 ? sum + s : sum), 0)

  const tolerance = 1e-6
  const satisfied =
    Math.abs(hypotenuse1 - hypotenuse2) < tolerance &&
    Math.abs(leg1Sum - leg2Sum) < tolerance

  return {
    name: 'HL',
    description: '斜边直角边（Hypotenuse-Leg）：直角三角形的斜边和一条直角边对应相等',
    formula: '∠C = ∠C′ = 90°, AB = A′B′, AC = A′C′',
    satisfied,
  }
}

/**
 * 计算三角形的角度
 */
function calculateAngles(vertices: [Point, Point, Point]): { A: number; B: number; C: number } {
  const a = distance(vertices[1], vertices[2])
  const b = distance(vertices[0], vertices[2])
  const c = distance(vertices[0], vertices[1])

  const A = Math.acos((b * b + c * c - a * a) / (2 * b * c))
  const B = Math.acos((a * a + c * c - b * b) / (2 * a * c))
  const C = Math.PI - A - B

  return {
    A: (A * 180) / Math.PI,
    B: (B * 180) / Math.PI,
    C: (C * 180) / Math.PI,
  }
}

/**
 * 检查所有全等判定条件
 */
export function checkAllCongruence(
  vertices1: [Point, Point, Point],
  vertices2: [Point, Point, Point]
): CongruenceCriteria[] {
  return [
    checkSSS(vertices1, vertices2),
    checkSAS(vertices1, vertices2),
    checkASA(vertices1, vertices2),
    checkAAS(vertices1, vertices2),
    checkHL(vertices1, vertices2),
  ]
}
