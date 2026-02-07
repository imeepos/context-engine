// 辅助线计算：中线、高线、角平分线、中位线
import { Point, AuxiliaryLineType } from '../types/geometry'
import { midpoint, perpendicularFoot, distance, angle } from './geometry'

export interface AuxiliaryLineResult {
  start: Point
  end: Point
  foot?: Point // 垂足（用于高线）
  length?: number
}

/**
 * 计算中线
 * 从顶点到对边中点的连线
 */
export function median(vertices: [Point, Point, Point], fromVertex: number): AuxiliaryLineResult {
  const oppositeIndex = (fromVertex + 1) % 3
  const nextIndex = (fromVertex + 2) % 3
  const oppositeVertex = vertices[oppositeIndex]
  const nextVertex = vertices[nextIndex]

  // 顶点和下一个顶点构成的对边的中点
  const mid = midpoint(oppositeVertex, nextVertex)

  return {
    start: vertices[fromVertex],
    end: mid,
  }
}

/**
 * 计算高线（altitude）
 * 从顶点垂直于对边的线段
 */
export function altitude(vertices: [Point, Point, Point], fromVertex: number): AuxiliaryLineResult {
  const oppositeIndex = (fromVertex + 1) % 3
  const nextIndex = (fromVertex + 2) % 3

  const foot = perpendicularFoot(
    vertices[fromVertex],
    vertices[oppositeIndex],
    vertices[nextIndex]
  )

  return {
    start: vertices[fromVertex],
    end: foot,
    foot,
    length: distance(vertices[fromVertex], foot),
  }
}

/**
 * 计算角平分线
 * 将角度平分的射线
 * 使用角平分线定理：它将对边分成与邻边成比例的线段
 */
export function bisector(vertices: [Point, Point, Point], fromVertex: number): AuxiliaryLineResult {
  const oppositeIndex = (fromVertex + 1) % 3
  const nextIndex = (fromVertex + 2) % 3

  // 邻边长度
  const adj1 = distance(vertices[fromVertex], vertices[oppositeIndex])
  const adj2 = distance(vertices[fromVertex], vertices[nextIndex])

  if (adj1 < 1e-6 || adj2 < 1e-6) {
    return { start: vertices[fromVertex], end: vertices[fromVertex] }
  }

  // 对边被角平分线分成的比例
  const ratio = adj1 / (adj1 + adj2)

  // 计算对边上的分点
  const foot = {
    x: vertices[oppositeIndex].x + ratio * (vertices[nextIndex].x - vertices[oppositeIndex].x),
    y: vertices[oppositeIndex].y + ratio * (vertices[nextIndex].y - vertices[oppositeIndex].y),
  }

  // 角平分线的方向向量
  const direction = {
    x: foot.x - vertices[fromVertex].x,
    y: foot.y - vertices[fromVertex].y,
  }

  // 延长线段以便显示完整
  const extendFactor = 2
  const extendedEnd = {
    x: vertices[fromVertex].x + direction.x * extendFactor,
    y: vertices[fromVertex].y + direction.y * extendFactor,
  }

  return {
    start: vertices[fromVertex],
    end: extendedEnd,
  }
}

/**
 * 计算中位线
 * 连接两边中点的线段
 * 中位线平行于第三边且长度为第三边的一半
 */
export function midline(vertices: [Point, Point, Point], side: number): AuxiliaryLineResult {
  // side: 0 = AB, 1 = BC, 2 = CA (这是中位线平行的那条边)
  // 中位线连接另外两边的中点
  // side=0 (平行于AB): 连接 AC 和 BC 的中点
  // side=1 (平行于BC): 连接 AB 和 AC 的中点
  // side=2 (平行于CA): 连接 AB 和 BC 的中点

  let mid1: Point
  let mid2: Point

  if (side === 0) {
    // 平行于 AB，连接 AC 和 BC 的中点
    mid1 = midpoint(vertices[0], vertices[2]) // AC 中点
    mid2 = midpoint(vertices[1], vertices[2]) // BC 中点
  } else if (side === 1) {
    // 平行于 BC，连接 AB 和 AC 的中点
    mid1 = midpoint(vertices[0], vertices[1]) // AB 中点
    mid2 = midpoint(vertices[0], vertices[2]) // AC 中点
  } else {
    // side === 2，平行于 CA，连接 AB 和 BC 的中点
    mid1 = midpoint(vertices[0], vertices[1]) // AB 中点
    mid2 = midpoint(vertices[1], vertices[2]) // BC 中点
  }

  return {
    start: mid1,
    end: mid2,
    length: distance(mid1, mid2),
  }
}

/**
 * 根据类型计算辅助线
 */
export function calculateAuxiliaryLine(
  vertices: [Point, Point, Point],
  type: AuxiliaryLineType,
  fromVertex: number
): AuxiliaryLineResult {
  switch (type) {
    case 'median':
      return median(vertices, fromVertex)
    case 'altitude':
      return altitude(vertices, fromVertex)
    case 'bisector':
      return bisector(vertices, fromVertex)
    case 'midline':
      return midline(vertices, fromVertex)
    default:
      throw new Error(`Unknown auxiliary line type: ${type}`)
  }
}

/**
 * 计算所有辅助线的长度
 */
export function calculateAllAuxLengths(
  vertices: [Point, Point, Point]
): Record<string, number> {
  const lengths: Record<string, number> = {}

  for (let i = 0; i < 3; i++) {
    const medianResult = median(vertices, i)
    const altitudeResult = altitude(vertices, i)

    lengths[`median_${i}`] = distance(medianResult.start, medianResult.end)
    lengths[`altitude_${i}`] = altitudeResult.length || 0
  }

  // 中位线
  for (let i = 0; i < 3; i++) {
    const midlineResult = midline(vertices, i)
    lengths[`midline_${i}`] = midlineResult.length || 0
  }

  return lengths
}
