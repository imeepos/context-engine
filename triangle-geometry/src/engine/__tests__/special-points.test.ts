// 特殊点测试
import { describe, it, expect } from 'vitest'
import {
  centroid,
  orthocenter,
  incenter,
  circumcenter,
} from '../special-points'

describe('Special Points', () => {
  const equilateralVertices: [any, any, any] = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 50, y: 86.6 },
  ]

  const rightVertices: [any, any, any] = [
    { x: 0, y: 0 },
    { x: 3, y: 0 },
    { x: 0, y: 4 },
  ]

  describe('centroid', () => {
    it('should calculate centroid of equilateral triangle', () => {
      const result = centroid(equilateralVertices)

      expect(result.x).toBeCloseTo(50, 0)
      expect(result.y).toBeCloseTo(28.9, 0)
    })

    it('should calculate centroid of right triangle', () => {
      const result = centroid(rightVertices)

      // (0+3+0)/3 = 1, (0+0+4)/3 = 1.33
      expect(result.x).toBeCloseTo(1, 1)
      expect(result.y).toBeCloseTo(1.33, 1)
    })
  })

  describe('orthocenter', () => {
    it('should return same point for equilateral triangle', () => {
      const ortho = orthocenter(equilateralVertices)

      // In equilateral triangle, all special points coincide
      expect(ortho).not.toBeNull()
      expect(ortho?.x).toBeCloseTo(50, 0)
      expect(ortho?.y).toBeCloseTo(28.9, 0)
    })

    it('should return right angle vertex for right triangle', () => {
      const ortho = orthocenter(rightVertices)

      // In right triangle, orthocenter is at the right angle vertex
      expect(ortho).not.toBeNull()
      expect(ortho?.x).toBeCloseTo(0, 1)
      expect(ortho?.y).toBeCloseTo(0, 1)
    })
  })

  describe('incenter', () => {
    it('should calculate incenter of equilateral triangle', () => {
      const result = incenter(equilateralVertices)

      expect(result).not.toBeNull()
      expect(result?.x).toBeCloseTo(50, 0)
      expect(result?.y).toBeCloseTo(28.9, 0)
    })

    it('should calculate incenter of right triangle', () => {
      const result = incenter(rightVertices)

      expect(result).not.toBeNull()
      expect(result?.x).toBeCloseTo(1, 1)
      expect(result?.y).toBeCloseTo(1, 1)
    })
  })

  describe('circumcenter', () => {
    it('should calculate circumcenter of equilateral triangle', () => {
      const result = circumcenter(equilateralVertices)

      expect(result).not.toBeNull()
      expect(result?.x).toBeCloseTo(50, 0)
      expect(result?.y).toBeCloseTo(28.9, 0)
    })

    it('should calculate circumcenter of right triangle', () => {
      const result = circumcenter(rightVertices)

      // In right triangle, circumcenter is midpoint of hypotenuse
      // Hypotenuse from (3,0) to (0,4), midpoint = (1.5, 2)
      expect(result).not.toBeNull()
      expect(result?.x).toBeCloseTo(1.5, 1)
      expect(result?.y).toBeCloseTo(2, 1)
    })
  })
})
