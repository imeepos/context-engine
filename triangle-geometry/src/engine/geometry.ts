// 几何基础计算函数
import { Point } from '../types/geometry'

/**
 * 计算两点之间的欧几里得距离
 */
export function distance(p1: Point, p2: Point): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2))
}

/**
 * 计算向量
 */
export function vector(p1: Point, p2: Point): Point {
  return { x: p2.x - p1.x, y: p2.y - p1.y }
}

/**
 * 计算向量的模（长度）
 */
export function vectorMagnitude(v: Point): number {
  return Math.sqrt(v.x * v.x + v.y * v.y)
}

/**
 * 向量点积
 */
export function dotProduct(v1: Point, v2: Point): number {
  return v1.x * v2.x + v1.y * v2.y
}

/**
 * 向量叉积 (2D)
 */
export function crossProduct(v1: Point, v2: Point): number {
  return v1.x * v2.y - v1.y * v2.x
}

/**
 * 计算三点构成的角 BAC 的角度（弧度）
 * @param p1 点A
 * @param p2 点B（顶点）
 * @param p3 点C
 */
export function angle(p1: Point, p2: Point, p3: Point): number {
  // 计算从顶点 p2 到两边的向量
  const v1 = vector(p2, p1) // p2 -> p1
  const v2 = vector(p2, p3) // p2 -> p3

  const dot = dotProduct(v1, v2)
  const mag1 = vectorMagnitude(v1)
  const mag2 = vectorMagnitude(v2)

  if (mag1 === 0 || mag2 === 0) return 0

  const cosAngle = dot / (mag1 * mag2)
  // 处理浮点误差
  const clamped = Math.max(-1, Math.min(1, cosAngle))
  return Math.acos(clamped)
}

/**
 * 角度转弧度
 */
export function degreesToRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

/**
 * 弧度转角度
 */
export function radiansToDegrees(radians: number): number {
  return radians * (180 / Math.PI)
}

/**
 * 计算中点
 */
export function midpoint(p1: Point, p2: Point): Point {
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
  }
}

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
export function pointOnSegment(p: Point, a: Point, b: Point, tolerance: number = 1e-6): boolean {
  const cross = crossProduct(vector(a, b), vector(a, p))
  if (Math.abs(cross) > tolerance) return false

  const dot = dotProduct(vector(a, p), vector(b, p))
  return dot <= tolerance
}

/**
 * 计算三角形面积（海伦公式）
 */
export function triangleArea(a: number, b: number, c: number): number {
  const s = (a + b + c) / 2
  const areaSquared = s * (s - a) * (s - b) * (s - c)

  if (areaSquared < 0) return 0
  return Math.sqrt(areaSquared)
}

/**
 * 验证三角形不等式
 */
export function validateTriangleInequality(AB: number, BC: number, CA: number): boolean {
  return AB + BC > CA && AB + CA > BC && BC + CA > AB
}

/**
 * 根据坐标计算三角形面积
 */
export function triangleAreaByPoints(p1: Point, p2: Point, p3: Point): number {
  return Math.abs(
    (p1.x * (p2.y - p3.y) + p2.x * (p3.y - p1.y) + p3.x * (p1.y - p2.y)) / 2
  )
}

/**
 * 计算点到直线的距离
 */
export function pointToLineDistance(p: Point, a: Point, b: Point): number {
  const area = Math.abs(
    (a.x * (b.y - p.y) + b.x * (p.y - a.y) + p.x * (a.y - b.y)) / 2
  )
  const base = distance(a, b)
  return base > 0 ? (2 * area) / base : 0
}

/**
 * 旋转向量
 */
export function rotateVector(v: Point, angleRad: number): Point {
  return {
    x: v.x * Math.cos(angleRad) - v.y * Math.sin(angleRad),
    y: v.x * Math.sin(angleRad) + v.y * Math.cos(angleRad),
  }
}

/**
 * 计算两条直线的交点
 */
export function lineIntersection(
  p1: Point,
  p2: Point,
  p3: Point,
  p4: Point
): Point | null {
  const d1 = crossProduct(vector(p1, p2), vector(p1, p3))
  const d2 = crossProduct(vector(p1, p2), vector(p1, p4))

  if (Math.abs(d1 - d2) < 1e-6) return null // 平行或重合

  const t = crossProduct(vector(p1, p3), vector(p1, p4)) / (d1 - d2)

  return {
    x: p1.x + t * (p2.x - p1.x),
    y: p1.y + t * (p2.y - p1.y),
  }
}

/**
 * 缩放点（以原点为中心）
 */
export function scalePoint(p: Point, scale: number, center: Point = { x: 0, y: 0 }): Point {
  return {
    x: center.x + (p.x - center.x) * scale,
    y: center.y + (p.y - center.y) * scale,
  }
}

/**
 * 平移点
 */
export function translatePoint(p: Point, dx: number, dy: number): Point {
  return { x: p.x + dx, y: p.y + dy }
}
