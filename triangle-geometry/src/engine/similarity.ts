// 相似三角形判定
import { Point } from '../types/geometry'
import { distance, angle, triangleAreaByPoints } from './geometry'

export interface SimilarityCriteria {
  name: string
  description: string
  formula: string
  satisfied: boolean
  ratio?: number
}

/**
 * AA (Angle-Angle) 两角相等判定
 * 两个角对应相等的三角形相似
 */
export function checkAA(vertices1: [Point, Point, Point], vertices2: [Point, Point, Point]): SimilarityCriteria {
  const angle1A = angle(vertices1[1], vertices1[0], vertices1[2])
  const angle1B = angle(vertices1[2], vertices1[1], vertices1[0])
  const angle1C = Math.PI - angle1A - angle1B

  const angle2A = angle(vertices2[1], vertices2[0], vertices2[2])
  const angle2B = angle(vertices2[2], vertices2[1], vertices2[0])
  const angle2C = Math.PI - angle2A - angle2B

  const tolerance = 1e-6
  const angles1 = [angle1A, angle1B, angle1C].map(a => (a * 180) / Math.PI)
  const angles2 = [angle2A, angle2B, angle2C].map(a => (a * 180) / Math.PI)

  // 检查是否有两个角对应相等
  let equalPairs = 0
  for (const a1 of angles1) {
    for (const a2 of angles2) {
      if (Math.abs(a1 - a2) < tolerance) {
        equalPairs++
      }
    }
  }

  const satisfied = equalPairs >= 2

  // 计算相似比（如果相似）
  const ratio = satisfied ? calculateRatio(vertices1, vertices2) : undefined

  return {
    name: 'AA',
    description: '两角相等（Angle-Angle）：两个角对应相等的三角形相似',
    formula: '∠A = ∠A′, ∠B = ∠B′',
    satisfied,
    ratio,
  }
}

/**
 * SAS (Side-Angle-Side) 边角边判定
 * 两边成比例且夹角相等
 */
export function checkSimilarSAS(vertices1: [Point, Point, Point], vertices2: [Point, Point, Point]): SimilarityCriteria {
  // 计算所有边长
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

  // 计算夹角
  const angle1 = angle(vertices1[1], vertices1[0], vertices1[2])
  const angle2 = angle(vertices2[1], vertices2[0], vertices2[2])

  const tolerance = 1e-6

  // 检查边的比例是否相等
  const ratios = [
    sides1[0] / sides2[0],
    sides1[1] / sides2[1],
    sides1[2] / sides2[2],
  ]

  // 检查夹角是否相等
  const anglesEqual = Math.abs(angle1 - angle2) < tolerance

  // 检查是否有两组边成相同比例
  const sidesProportional =
    Math.abs(ratios[0] - ratios[1]) < tolerance ||
    Math.abs(ratios[1] - ratios[2]) < tolerance ||
    Math.abs(ratios[0] - ratios[2]) < tolerance

  const satisfied = sidesProportional && anglesEqual
  const ratio = satisfied ? calculateRatio(vertices1, vertices2) : undefined

  return {
    name: 'SAS',
    description: '两边成比例且夹角相等（Side-Angle-Side）的两个三角形相似',
    formula: 'AB/A′B′ = BC/B′C′, ∠B = ∠B′',
    satisfied,
    ratio,
  }
}

/**
 * SSS (Side-Side-Side) 三边成比例判定
 * 三边成比例的两个三角形相似
 */
export function checkSSS(vertices1: [Point, Point, Point], vertices2: [Point, Point, Point]): SimilarityCriteria {
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

  // 排序后计算比例
  const sorted1 = [...sides1].sort((a, b) => a - b)
  const sorted2 = [...sides2].sort((a, b) => a - b)

  const tolerance = 1e-6

  // 计算三组比例
  const ratio1 = sorted1[0] / sorted2[0]
  const ratio2 = sorted1[1] / sorted2[1]
  const ratio3 = sorted1[2] / sorted2[2]

  // 检查三组比例是否相等
  const sidesProportional =
    Math.abs(ratio1 - ratio2) < tolerance &&
    Math.abs(ratio2 - ratio3) < tolerance

  const satisfied = sidesProportional
  const ratio = satisfied ? ratio1 : undefined

  return {
    name: 'SSS',
    description: '三边成比例（Side-Side-Side）的两个三角形相似',
    formula: 'AB/A′B′ = BC/B′C′ = CA/C′A′ = k',
    satisfied,
    ratio,
  }
}

/**
 * 计算相似比
 */
function calculateRatio(vertices1: [Point, Point, Point], vertices2: [Point, Point, Point]): number {
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

  // 使用最短边计算比例
  const min1 = Math.min(...sides1)
  const min2 = Math.min(...sides2)

  return min2 > 0 ? min1 / min2 : 1
}

/**
 * 计算面积比（相似比的平方）
 */
export function areaRatio(similarityRatio: number): number {
  return similarityRatio * similarityRatio
}

/**
 * 检查三角形是否相似
 */
export function checkAllSimilarity(
  vertices1: [Point, Point, Point],
  vertices2: [Point, Point, Point]
): SimilarityCriteria[] {
  return [
    checkAA(vertices1, vertices2),
    checkSimilarSAS(vertices1, vertices2),
    checkSSS(vertices1, vertices2),
  ]
}
