/**
 * 线段运算的单元测试
 */

import { describe, it, expect } from 'vitest'
import {
  perpendicularPoint,
  perpendicularFoot,
  pointOnSegment,
} from '../core/line'

describe('Line Operations', () => {
  describe('perpendicularPoint', () => {
    it('should calculate perpendicular point from midpoint', () => {
      const lineStart = { x: 0, y: 0 }
      const lineEnd = { x: 4, y: 0 }
      const perpPoint = perpendicularPoint(lineStart, lineEnd, 3)

      expect(perpPoint.x).toBeCloseTo(2, 5)
      expect(perpPoint.y).toBeCloseTo(3, 5)
    })
  })

  describe('perpendicularFoot', () => {
    it('should calculate perpendicular foot from point to line', () => {
      const p = { x: 2, y: 3 }
      const a = { x: 0, y: 0 }
      const b = { x: 4, y: 0 }
      const foot = perpendicularFoot(p, a, b)

      expect(foot.x).toBeCloseTo(2, 5)
      expect(foot.y).toBeCloseTo(0, 5)
    })

    it('should clamp to segment endpoints', () => {
      const p = { x: 5, y: 3 }
      const a = { x: 0, y: 0 }
      const b = { x: 2, y: 0 }
      const foot = perpendicularFoot(p, a, b)

      // Should clamp to endpoint b
      expect(foot.x).toBeCloseTo(2, 5)
      expect(foot.y).toBeCloseTo(0, 5)
    })
  })

  describe('pointOnSegment', () => {
    it('should return true for point on segment', () => {
      const p = { x: 2, y: 0 }
      const a = { x: 0, y: 0 }
      const b = { x: 4, y: 0 }

      expect(pointOnSegment(p, a, b)).toBe(true)
    })

    it('should return false for point not on segment', () => {
      const p = { x: 2, y: 1 }
      const a = { x: 0, y: 0 }
      const b = { x: 4, y: 0 }

      expect(pointOnSegment(p, a, b)).toBe(false)
    })

    it('should return false for point on line but outside segment', () => {
      const p = { x: 5, y: 0 }
      const a = { x: 0, y: 0 }
      const b = { x: 4, y: 0 }

      expect(pointOnSegment(p, a, b)).toBe(false)
    })
  })
})
