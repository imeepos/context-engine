/**
 * 多边形计算引擎测试
 */

import { describe, it, expect } from 'vitest'
import { calculatePolygonProperties, calculatePolygonArea, checkConvex, checkRegular } from './polygon'
import type { Point } from '../../types/geometry-base'

describe('多边形计算引擎', () => {
  describe('calculatePolygonArea', () => {
    it('应该正确计算正方形面积', () => {
      const vertices: Point[] = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
      ]
      const area = calculatePolygonArea(vertices)
      expect(area).toBeCloseTo(100, 1)
    })

    it('应该正确计算三角形面积', () => {
      const vertices: Point[] = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 5, y: 10 },
      ]
      const area = calculatePolygonArea(vertices)
      expect(area).toBeCloseTo(50, 1)
    })

    it('应该正确计算不规则多边形面积', () => {
      const vertices: Point[] = [
        { x: 0, y: 0 },
        { x: 4, y: 0 },
        { x: 4, y: 3 },
        { x: 2, y: 5 },
        { x: 0, y: 3 },
      ]
      const area = calculatePolygonArea(vertices)
      expect(area).toBeGreaterThan(0)
    })
  })

  describe('checkConvex', () => {
    it('应该识别凸多边形（正方形）', () => {
      const vertices: Point[] = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
      ]
      expect(checkConvex(vertices)).toBe(true)
    })

    it('应该识别凸多边形（正五边形）', () => {
      const vertices: Point[] = [
        { x: 5, y: 0 },
        { x: 9.51, y: 3.09 },
        { x: 7.94, y: 8.09 },
        { x: 2.06, y: 8.09 },
        { x: 0.49, y: 3.09 },
      ]
      expect(checkConvex(vertices)).toBe(true)
    })
  })

  describe('checkRegular', () => {
    it('应该识别正多边形（正方形）', () => {
      const vertices: Point[] = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
      ]
      const sideLengths = [10, 10, 10, 10]
      expect(checkRegular(vertices, sideLengths)).toBe(true)
    })

    it('应该识别不规则多边形（矩形）', () => {
      const vertices: Point[] = [
        { x: 0, y: 0 },
        { x: 20, y: 0 },
        { x: 20, y: 10 },
        { x: 0, y: 10 },
      ]
      const sideLengths = [20, 10, 20, 10]
      expect(checkRegular(vertices, sideLengths)).toBe(false)
    })
  })

  describe('calculatePolygonProperties', () => {
    it('应该正确计算正方形属性', () => {
      const vertices: Point[] = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
      ]
      const props = calculatePolygonProperties(vertices)

      expect(props.sideCount).toBe(4)
      expect(props.perimeter).toBeCloseTo(40, 1)
      expect(props.area).toBeCloseTo(100, 1)
      expect(props.isConvex).toBe(true)
      expect(props.isRegular).toBe(true)
      expect(props.sideLengths).toHaveLength(4)
      expect(props.angles).toHaveLength(4)
    })

    it('应该正确计算三角形属性', () => {
      const vertices: Point[] = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 5, y: 10 },
      ]
      const props = calculatePolygonProperties(vertices)

      expect(props.sideCount).toBe(3)
      expect(props.area).toBeCloseTo(50, 1)
      expect(props.isConvex).toBe(true)
    })
  })
})