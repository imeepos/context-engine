// 坐标转换工具
import { Point } from '../types/geometry'

/**
 * 计算吸附到网格的点
 */
export function calculateSnappedPoint(point: Point, gridSize: number): Point {
  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize,
  }
}

/**
 * 屏幕坐标转换为画布坐标
 */
export function screenToCanvas(
  screenX: number,
  screenY: number,
  offsetX: number,
  offsetY: number,
  zoom: number
): Point {
  return {
    x: (screenX - offsetX) / zoom,
    y: (screenY - offsetY) / zoom,
  }
}

/**
 * 画布坐标转换为屏幕坐标
 */
export function canvasToScreen(
  canvasX: number,
  canvasY: number,
  offsetX: number,
  offsetY: number,
  zoom: number
): Point {
  return {
    x: canvasX * zoom + offsetX,
    y: canvasY * zoom + offsetY,
  }
}
