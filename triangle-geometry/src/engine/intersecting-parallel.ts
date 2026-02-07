// 相交线与平行线计算引擎
import { Point, Line } from '../types/geometry'
import { vector, dotProduct, vectorMagnitude } from './geometry'

/** 角对信息 */
export interface AnglePair {
  angle1: number
  angle2: number
  type: 'vertical' | 'corresponding' | 'alternate-interior' | 'co-interior'
  label1: string
  label2: string
}

/** 截线形成的 8 个角 */
export interface TransversalAngles {
  upper: [number, number, number, number]
  lower: [number, number, number, number]
}

/**
 * 计算两条直线相交形成的对顶角
 * @param p1 第一条线的端点1
 * @param p2 第一条线的端点2
 * @param p3 第二条线的端点1
 * @param p4 第二条线的端点2
 * @param intersection 交点
 */
export function verticalAngles(
  p1: Point,
  p2: Point,
  p3: Point,
  p4: Point,
  intersection: Point,
): AnglePair[] {
  const v1 = vector(intersection, p1)
  const v2 = vector(intersection, p3)
  const mag1 = vectorMagnitude(v1)
  const mag2 = vectorMagnitude(v2)

  if (mag1 === 0 || mag2 === 0) return []

  const cosAngle = Math.max(-1, Math.min(1, dotProduct(v1, v2) / (mag1 * mag2)))
  const angleDeg = Math.acos(cosAngle) * (180 / Math.PI)
  const supplementary = 180 - angleDeg

  return [
    { angle1: angleDeg, angle2: angleDeg, type: 'vertical', label1: '∠1', label2: '∠3' },
    { angle1: supplementary, angle2: supplementary, type: 'vertical', label1: '∠2', label2: '∠4' },
  ]
}

/**
 * 计算截线与两条直线形成的 8 个角
 * 每条直线与截线交点处形成 4 个角（左上、右上、右下、左下）
 */
export function transversalAngles(
  line1: Line,
  line2: Line,
  transversal: Line,
): TransversalAngles {
  const calcFourAngles = (
    line: Line,
    trans: Line,
  ): [number, number, number, number] => {
    const vLine = vector(line.start, line.end)
    const vTrans = vector(trans.start, trans.end)
    const magL = vectorMagnitude(vLine)
    const magT = vectorMagnitude(vTrans)

    if (magL === 0 || magT === 0) return [0, 0, 0, 0]

    const cos = Math.max(
      -1,
      Math.min(1, dotProduct(vLine, vTrans) / (magL * magT)),
    )
    const deg = Math.acos(cos) * (180 / Math.PI)
    const sup = 180 - deg
    return [sup, deg, sup, deg]
  }

  return {
    upper: calcFourAngles(line1, transversal),
    lower: calcFourAngles(line2, transversal),
  }
}

/**
 * 分类角对：同位角、内错角、同旁内角
 * 索引约定：0=左上, 1=右上, 2=右下, 3=左下
 */
export function classifyAnglePairs(
  angles: TransversalAngles,
): AnglePair[] {
  const { upper: u, lower: l } = angles

  return [
    // 同位角（位置相同）
    { angle1: u[0], angle2: l[0], type: 'corresponding', label1: '∠1', label2: '∠5' },
    { angle1: u[1], angle2: l[1], type: 'corresponding', label1: '∠2', label2: '∠6' },
    { angle1: u[2], angle2: l[2], type: 'corresponding', label1: '∠3', label2: '∠7' },
    { angle1: u[3], angle2: l[3], type: 'corresponding', label1: '∠4', label2: '∠8' },
    // 内错角（内侧交叉）
    { angle1: u[2], angle2: l[0], type: 'alternate-interior', label1: '∠3', label2: '∠5' },
    { angle1: u[3], angle2: l[1], type: 'alternate-interior', label1: '∠4', label2: '∠6' },
    // 同旁内角（内侧同旁）
    { angle1: u[2], angle2: l[1], type: 'co-interior', label1: '∠3', label2: '∠6' },
    { angle1: u[3], angle2: l[0], type: 'co-interior', label1: '∠4', label2: '∠5' },
  ]
}

/**
 * 判断两条直线是否平行
 * 通过向量叉积判断方向是否一致
 */
export function areLinesParallel(
  line1: Line,
  line2: Line,
  tolerance: number = 1e-6,
): boolean {
  const v1 = vector(line1.start, line1.end)
  const v2 = vector(line2.start, line2.end)
  const cross = v1.x * v2.y - v1.y * v2.x
  return Math.abs(cross) < tolerance
}
