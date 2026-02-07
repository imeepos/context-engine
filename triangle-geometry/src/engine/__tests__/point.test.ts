/**
 * 点和向量运算的单元测试
 */

import { describe, it, expect } from 'vitest'
import {
  distance,
  vector,
  vectorMagnitude,
  dotProduct,
  crossProduct,
  angle,
  degreesToRadians,
  radiansToDegrees,
  midpoint,
} from '../core/point'

describe('Point and Vector Operations', () => {
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
  })

  describe('vector', () => {
    it('should calculate vector from p1 to p2', () => {
      const p1 = { x: 1, y: 2 }
      const p2 = { x: 4, y: 6 }
      const v = vector(p1, p2)
      expect(v).toEqual({ x: 3, y: 4 })
    })
  })

  describe('vectorMagnitude', () => {
    it('should calculate magnitude of vector', () => {
      const v = { x: 3, y: 4 }
      expect(vectorMagnitude(v)).toBe(5)
    })
  })

  describe('dotProduct', () => {
    it('should calculate dot product', () => {
      const v1 = { x: 2, y: 3 }
      const v2 = { x: 4, y: 5 }
      expect(dotProduct(v1, v2)).toBe(23)
    })
  })

  describe('crossProduct', () => {
    it('should calculate cross product in 2D', () => {
      const v1 = { x: 2, y: 3 }
      const v2 = { x: 4, y: 5 }
      expect(crossProduct(v1, v2)).toBe(-2)
    })
  })

  describe('angle', () => {
    it('should calculate angle between three points', () => {
      const p1 = { x: 1, y: 0 }
      const p2 = { x: 0, y: 0 }
      const p3 = { x: 0, y: 1 }
      const ang = angle(p1, p2, p3)
      expect(ang).toBeCloseTo(Math.PI / 2, 5)
    })
  })

  describe('angle conversions', () => {
    it('should convert degrees to radians', () => {
      expect(degreesToRadians(180)).toBeCloseTo(Math.PI, 5)
      expect(degreesToRadians(90)).toBeCloseTo(Math.PI / 2, 5)
    })

    it('should convert radians to degrees', () => {
      expect(radiansToDegrees(Math.PI)).toBeCloseTo(180, 5)
      expect(radiansToDegrees(Math.PI / 2)).toBeCloseTo(90, 5)
    })
  })

  describe('midpoint', () => {
    it('should calculate midpoint between two points', () => {
      const p1 = { x: 0, y: 0 }
      const p2 = { x: 4, y: 6 }
      const mid = midpoint(p1, p2)
      expect(mid).toEqual({ x: 2, y: 3 })
    })
  })
})
