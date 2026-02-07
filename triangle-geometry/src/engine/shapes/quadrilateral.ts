/**
 * 四边形计算引擎
 * 实现四边形属性计算和特殊四边形判定
 */

import type { Point } from '../../types/geometry-base'
import type { QuadrilateralProperties } from '../../types/properties'
import { distance, angle } from '../core/point'

/**
 * 计算四边形的完整属性
 */
export function calculateQuadProperties(
  vertices: [Point, Point, Point, Point]
): QuadrilateralProperties {
  const [A, B, C, D] = vertices

  // 边长
  const AB = distance(A, B)
  const BC = distance(B, C)
  const CD = distance(C, D)
  const DA = distance(D, A)

  // 对角线
  const AC = distance(A, C)
  const BD = distance(B, D)

  // 内角（弧度）
  const angleA = angle(D, A, B)
  const angleB = angle(A, B, C)
  const angleC = angle(B, C, D)
  const angleD = angle(C, D, A)

  // 周长和面积
  const perimeter = AB + BC + CD + DA
  const area = calculateQuadArea(vertices)

  // 判定特殊四边形
  const isParallelogram = checkParallelogram(vertices)
  const isRectangle = checkRectangle(vertices, isParallelogram)
  const isRhombus = checkRhombus(vertices, isParallelogram)
  const isSquare = isRectangle && isRhombus
  const isTrapezoid = !isParallelogram && checkTrapezoid(vertices)

  return {
    sideLengths: { AB, BC, CD, DA },
    angles: {
      A: angleA,
      B: angleB,
      C: angleC,
      D: angleD,
    },
    diagonals: { AC, BD },
    perimeter,
    area,
    isParallelogram,
    isRectangle,
    isRhombus,
    isSquare,
    isTrapezoid,
  }
}

/**
 * 使用鞋带公式计算四边形面积
 */
function calculateQuadArea(vertices: [Point, Point, Point, Point]): number {
  const [A, B, C, D] = vertices
  return Math.abs(
    (A.x * B.y - B.x * A.y) +
    (B.x * C.y - C.x * B.y) +
    (C.x * D.y - D.x * C.y) +
    (D.x * A.y - A.x * D.y)
  ) / 2
}

/**
 * 判定平行四边形：对边平行且相等
 */
function checkParallelogram(vertices: [Point, Point, Point, Point]): boolean {
  const [A, B, C, D] = vertices

  const AB = distance(A, B)
  const CD = distance(C, D)
  const BC = distance(B, C)
  const DA = distance(D, A)

  const tolerance = 0.01
  return (
    Math.abs(AB - CD) < tolerance &&
    Math.abs(BC - DA) < tolerance
  )
}

/**
 * 判定矩形：平行四边形 + 一个直角
 */
function checkRectangle(
  vertices: [Point, Point, Point, Point],
  isParallelogram: boolean
): boolean {
  if (!isParallelogram) return false

  const [A, B, C] = vertices
  const angleABC = angle(A, B, C)

  return Math.abs(angleABC - Math.PI / 2) < 0.01
}

/**
 * 判定菱形：平行四边形 + 四边相等
 */
function checkRhombus(
  vertices: [Point, Point, Point, Point],
  isParallelogram: boolean
): boolean {
  if (!isParallelogram) return false

  const [A, B, C, D] = vertices
  const AB = distance(A, B)
  const BC = distance(B, C)
  const CD = distance(C, D)
  const DA = distance(D, A)

  const tolerance = 0.01
  return (
    Math.abs(AB - BC) < tolerance &&
    Math.abs(BC - CD) < tolerance &&
    Math.abs(CD - DA) < tolerance
  )
}

/**
 * 判定梯形：一组对边平行
 */
function checkTrapezoid(vertices: [Point, Point, Point, Point]): boolean {
  const [A, B, C, D] = vertices

  const AB = { x: B.x - A.x, y: B.y - A.y }
  const CD = { x: D.x - C.x, y: D.y - C.y }
  const BC = { x: C.x - B.x, y: C.y - B.y }
  const DA = { x: A.x - D.x, y: A.y - D.y }

  const cross1 = Math.abs(AB.x * CD.y - AB.y * CD.x)
  const cross2 = Math.abs(BC.x * DA.y - BC.y * DA.x)

  const tolerance = 0.01
  return cross1 < tolerance || cross2 < tolerance
}
