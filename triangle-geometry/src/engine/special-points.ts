// 特殊点计算：重心、垂心、内心、外心
import { Point } from '../types/geometry'
import { midpoint, perpendicularFoot, distance } from './geometry'

/**
 * 计算三角形的重心（Centroid）
 * 三条中线的交点，也是质心
 * 重心坐标 = (A + B + C) / 3
 */
export function centroid(vertices: [Point, Point, Point]): Point {
  return {
    x: (vertices[0].x + vertices[1].x + vertices[2].x) / 3,
    y: (vertices[0].y + vertices[1].y + vertices[2].y) / 3,
  }
}

/**
 * 计算三角形的垂心（Orthocenter）
 * 三条高的交点
 */
export function orthocenter(vertices: [Point, Point, Point]): Point | null {
  const [A, B, C] = vertices

  // 计算三角形面积判断是否退化
  const area = Math.abs(A.x * (B.y - C.y) + B.x * (C.y - A.y) + C.x * (A.y - B.y)) / 2
  if (area < 1e-6) return null

  // 检查是否是直角三角形
  const AB = distance(A, B)
  const BC = distance(B, C)
  const CA = distance(C, A)

  // 使用余弦定理检查直角
  const cosA = (AB * AB + CA * CA - BC * BC) / (2 * AB * CA)
  const cosB = (AB * AB + BC * BC - CA * CA) / (2 * AB * BC)
  const cosC = (BC * BC + CA * CA - AB * AB) / (2 * BC * CA)

  const tolerance = 1e-6

  if (Math.abs(cosA) < tolerance) return A // 直角在A
  if (Math.abs(cosB) < tolerance) return B // 直角在B
  if (Math.abs(cosC) < tolerance) return C // 直角在C

  // 一般三角形的垂心计算
  // 使用公式：H = A + B + C - 2 * O，其中O是外心
  // 但我们需要先计算外心

  // 计算外心
  const D = 2 * (A.x * (B.y - C.y) + B.x * (C.y - A.y) + C.x * (A.y - B.y))

  if (Math.abs(D) < tolerance) return null

  const a2 = A.x * A.x + A.y * A.y
  const b2 = B.x * B.x + B.y * B.y
  const c2 = C.x * C.x + C.y * C.y

  const Ox = (1 / D) * (a2 * (B.y - C.y) + b2 * (C.y - A.y) + c2 * (A.y - B.y))
  const Oy = (1 / D) * (a2 * (C.x - B.x) + b2 * (A.x - C.x) + c2 * (B.x - A.x))

  // 垂心 = A + B + C - 2 * 外心
  return {
    x: A.x + B.x + C.x - 2 * Ox,
    y: A.y + B.y + C.y - 2 * Oy,
  }
}

/**
 * 计算三角形的内心（Incenter）
 * 三条角平分线的交点，也是内切圆圆心
 * 内心坐标 = (a*A + b*B + c*C) / (a + b + c)
 * 其中 a, b, c 分别是BC, CA, AB的长度
 */
export function incenter(vertices: [Point, Point, Point]): Point | null {
  const [A, B, C] = vertices

  // 计算边长
  const a = distance(B, C) // BC
  const b = distance(C, A) // CA
  const c = distance(A, B) // AB

  const perimeter = a + b + c

  if (perimeter < 1e-6) return null // 退化三角形

  return {
    x: (a * A.x + b * B.x + c * C.x) / perimeter,
    y: (a * A.y + b * B.y + c * C.y) / perimeter,
  }
}

/**
 * 计算三角形的外心（Circumcenter)
 * 三条垂直平分线的交点，也是外接圆圆心
 */
export function circumcenter(vertices: [Point, Point, Point]): Point | null {
  const [A, B, C] = vertices

  // 计算三角形面积的两倍
  const D = 2 * (A.x * (B.y - C.y) + B.x * (C.y - A.y) + C.x * (A.y - B.y))

  if (Math.abs(D) < 1e-6) return null // 退化三角形

  const a2 = A.x * A.x + A.y * A.y
  const b2 = B.x * B.x + B.y * B.y
  const c2 = C.x * C.x + C.y * C.y

  const Ux = (1 / D) * (a2 * (B.y - C.y) + b2 * (C.y - A.y) + c2 * (A.y - B.y))
  const Uy = (1 / D) * (a2 * (C.x - B.x) + b2 * (A.x - C.x) + c2 * (B.x - A.x))

  return { x: Ux, y: Uy }
}

/**
 * 计算九点圆心（Nine-point Center）
 * 九点圆心是垂心和外心的中点
 */
export function ninePointCenter(vertices: [Point, Point, Point]): Point | null {
  const ortho = orthocenter(vertices)
  const circum = circumcenter(vertices)

  if (!ortho || !circum) return null

  return midpoint(ortho, circum)
}

/**
 * 计算欧拉线上的点
 * 欧拉线经过重心、垂心、外心
 * 重心将垂心到外心的距离分为 2:1
 */
export function eulerLinePoint(vertices: [Point, Point, Point], ratio: number = 0.5): Point | null {
  const ortho = orthocenter(vertices)
  const circum = circumcenter(vertices)

  if (!ortho || !circum) return null

  return {
    x: ortho.x + ratio * (circum.x - ortho.x),
    y: ortho.y + ratio * (circum.y - ortho.y),
  }
}
