/**
 * 圆形计算引擎的单元测试
 */

import { describe, it, expect } from 'vitest'
import {
  calculateCircleProperties,
  circleFromThreePoints,
  isPointInCircle,
  isPointOnCircle,
} from '../shapes/circle'

describe('Circle Operations', () => {
  describe('calculateCircleProperties', () => {
    it('should calculate circle properties correctly', () => {
      const center = { x: 0, y: 0 }
      const radius = 10

      const props = calculateCircleProperties(center, radius)

      expect(props.radius).toBe(10)
      expect(props.diameter).toBe(20)
      expect(props.circumference).toBeCloseTo(2 * Math.PI * 10, 5)
      expect(props.area).toBeCloseTo(Math.PI * 100, 5)
    })
  })

  describe('circleFromThreePoints', () => {
    it('should find circle from three points', () => {
      const p1 = { x: 0, y: 10 }
      const p2 = { x: 10, y: 0 }
      const p3 = { x: 0, y: -10 }

      const result = circleFromThreePoints(p1, p2, p3)

      expect(result).not.toBeNull()
      if (result) {
        expect(result.center.x).toBeCloseTo(0, 1)
        expect(result.center.y).toBeCloseTo(0, 1)
        expect(result.radius).toBeCloseTo(10, 1)
      }
    })

    it('should return null for collinear points', () => {
      const p1 = { x: 0, y: 0 }
      const p2 = { x: 1, y: 1 }
      const p3 = { x: 2, y: 2 }

      const result = circleFromThreePoints(p1, p2, p3)

      expect(result).toBeNull()
    })
  })

  describe('isPointInCircle', () => {
    it('should return true for point inside circle', () => {
      const center = { x: 0, y: 0 }
      const radius = 10
      const point = { x: 5, y: 5 }

      expect(isPointInCircle(point, center, radius)).toBe(true)
    })

    it('should return false for point outside circle', () => {
      const center = { x: 0, y: 0 }
      const radius = 10
      const point = { x: 15, y: 15 }

      expect(isPointInCircle(point, center, radius)).toBe(false)
    })

    it('should return true for point on circle boundary', () => {
      const center = { x: 0, y: 0 }
      const radius = 10
      const point = { x: 10, y: 0 }

      expect(isPointInCircle(point, center, radius)).toBe(true)
    })
  })

  describe('isPointOnCircle', () => {
    it('should return true for point on circle', () => {
      const center = { x: 0, y: 0 }
      const radius = 10
      const point = { x: 10, y: 0 }

      expect(isPointOnCircle(point, center, radius)).toBe(true)
    })

    it('should return false for point not on circle', () => {
      const center = { x: 0, y: 0 }
      const radius = 10
      const point = { x: 5, y: 5 }

      expect(isPointOnCircle(point, center, radius)).toBe(false)
    })
  })
})
