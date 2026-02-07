/**
 * 点和向量的基础运算
 */

import type { Point } from '../../types/geometry-base'

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
  const v1 = vector(p2, p1)
  const v2 = vector(p2, p3)

  const dot = dotProduct(v1, v2)
  const mag1 = vectorMagnitude(v1)
  const mag2 = vectorMagnitude(v2)

  if (mag1 === 0 || mag2 === 0) return 0

  const cosAngle = dot / (mag1 * mag2)
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
