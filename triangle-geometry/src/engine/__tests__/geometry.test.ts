// 几何基础计算测试
import { describe, it, expect } from 'vitest'
import {
  distance,
  angle,
  midpoint,
  perpendicularFoot,
  triangleAreaByPoints,
  rotateVector,
  translatePoint,
  scalePoint,
} from '../geometry'

describe('Geometry Functions', () => {
  describe('distance', () => {
    it('should calculate distance between two points', () => {
      const p1 = { x: 0, y: 0 }
      const p2 = { x: 3, y: 4 }
      expect(distance(p1, p2)).toBe(5)
    })

    it('should return 0 for same point', () => {
      const p = { x: 5, y: 5 }
      expect(distance(p, p)).toBe(0)
    })

    it('should calculate horizontal distance', () => {
      const p1 = { x: 0, y: 0 }
      const p2 = { x: 5, y: 0 }
      expect(distance(p1, p2)).toBe(5)
    })

    it('should calculate vertical distance', () => {
      const p1 = { x: 0, y: 0 }
      const p2 = { x: 0, y: 7 }
      expect(distance(p1, p2)).toBe(7)
    })
  })

  describe('angle', () => {
    it('should calculate 90 degree angle', () => {
      // angle(p1, p2, p3) calculates angle at p1 (vertex)
      // For 90 degree at origin with points (1,0) and (0,1)
      const p1 = { x: 0, y: 0 }
      const p2 = { x: 1, y: 0 }
      const p3 = { x: 0, y: 1 }
      const result = angle(p2, p1, p3) // angle at p1 (origin)
      expect(result).toBeCloseTo(Math.PI / 2, 5)
    })

    it('should calculate 45 degree angle', () => {
      // For 45 degree at origin with points (1,1) and (2,0)
      const p1 = { x: 0, y: 0 }
      const p2 = { x: 1, y: 1 }
      const p3 = { x: 2, y: 0 }
      const result = angle(p2, p1, p3) // angle at p1 (origin)
      expect(result).toBeCloseTo(Math.PI / 4, 5)
    })

    it('should return 0 for same points', () => {
      const p = { x: 1, y: 1 }
      expect(angle(p, p, p)).toBe(0)
    })
  })

  describe('midpoint', () => {
    it('should calculate midpoint correctly', () => {
      const p1 = { x: 0, y: 0 }
      const p2 = { x: 4, y: 6 }
      const mid = midpoint(p1, p2)
      expect(mid).toEqual({ x: 2, y: 3 })
    })

    it('should handle negative coordinates', () => {
      const p1 = { x: -2, y: -4 }
      const p2 = { x: 2, y: 4 }
      const mid = midpoint(p1, p2)
      expect(mid).toEqual({ x: 0, y: 0 })
    })
  })

  describe('perpendicularFoot', () => {
    it('should find perpendicular foot on horizontal line', () => {
      const p = { x: 2, y: 2 }
      const a = { x: 0, y: 0 }
      const b = { x: 4, y: 0 }
      const foot = perpendicularFoot(p, a, b)
      expect(foot).toEqual({ x: 2, y: 0 })
    })

    it('should find perpendicular foot on vertical line', () => {
      const p = { x: 2, y: 2 }
      const a = { x: 0, y: 0 }
      const b = { x: 0, y: 4 }
      const foot = perpendicularFoot(p, a, b)
      expect(foot).toEqual({ x: 0, y: 2 })
    })
  })

  describe('triangleAreaByPoints', () => {
    it('should calculate area of right triangle', () => {
      const p1 = { x: 0, y: 0 }
      const p2 = { x: 3, y: 0 }
      const p3 = { x: 0, y: 4 }
      expect(triangleAreaByPoints(p1, p2, p3)).toBe(6)
    })

    it('should calculate area of equilateral triangle', () => {
      // Equilateral triangle with side 2
      const p1 = { x: 0, y: 0 }
      const p2 = { x: 2, y: 0 }
      const p3 = { x: 1, y: Math.sqrt(3) }
      const area = triangleAreaByPoints(p1, p2, p3)
      expect(area).toBeCloseTo(Math.sqrt(3), 3)
    })

    it('should return 0 for collinear points', () => {
      const p1 = { x: 0, y: 0 }
      const p2 = { x: 1, y: 1 }
      const p3 = { x: 2, y: 2 }
      expect(triangleAreaByPoints(p1, p2, p3)).toBe(0)
    })
  })

  describe('rotateVector', () => {
    it('should rotate 90 degrees counterclockwise', () => {
      const v = { x: 1, y: 0 }
      const rotated = rotateVector(v, Math.PI / 2)
      expect(rotated.x).toBeCloseTo(0, 5)
      expect(rotated.y).toBeCloseTo(1, 5)
    })

    it('should rotate 45 degrees', () => {
      const v = { x: 1, y: 0 }
      const rotated = rotateVector(v, Math.PI / 4)
      expect(rotated.x).toBeCloseTo(Math.sqrt(2) / 2, 3)
      expect(rotated.y).toBeCloseTo(Math.sqrt(2) / 2, 3)
    })
  })

  describe('translatePoint', () => {
    it('should translate point by given offset', () => {
      const p = { x: 2, y: 3 }
      const translated = translatePoint(p, 5, -2)
      expect(translated).toEqual({ x: 7, y: 1 })
    })
  })

  describe('scalePoint', () => {
    it('should scale point from origin', () => {
      const p = { x: 2, y: 4 }
      const scaled = scalePoint(p, 2, { x: 0, y: 0 })
      expect(scaled).toEqual({ x: 4, y: 8 })
    })

    it('should scale point from center', () => {
      const p = { x: 3, y: 5 }
      const scaled = scalePoint(p, 2, { x: 1, y: 1 })
      expect(scaled).toEqual({ x: 5, y: 9 })
    })
  })
})
