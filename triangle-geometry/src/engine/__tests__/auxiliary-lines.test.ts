// 辅助线测试
import { describe, it, expect } from 'vitest'
import {
  median,
  altitude,
  bisector,
  midline,
  calculateAuxiliaryLine,
} from '../auxiliary-lines'

describe('Auxiliary Lines', () => {
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

  describe('median', () => {
    it('should calculate median from vertex A', () => {
      const result = median(equilateralVertices, 0)

      // Should start at A (0,0)
      expect(result.start).toEqual({ x: 0, y: 0 })

      // Should end at midpoint of BC
      expect(result.end.x).toBeCloseTo(75, 0)
      expect(result.end.y).toBeCloseTo(43.3, 0)
    })

    it('should calculate median from vertex B', () => {
      const result = median(equilateralVertices, 1)

      expect(result.start).toEqual({ x: 100, y: 0 })
      expect(result.end.x).toBeCloseTo(25, 0)
      expect(result.end.y).toBeCloseTo(43.3, 0)
    })
  })

  describe('altitude', () => {
    it('should calculate altitude from vertex A in right triangle', () => {
      const result = altitude(rightVertices, 0)

      // From A (0,0) perpendicular to BC
      expect(result.start).toEqual({ x: 0, y: 0 })
      expect(result.end).toBeDefined()
    })

    it('should have foot property for altitude', () => {
      const result = altitude(rightVertices, 0)
      expect(result.foot).toBeDefined()
    })
  })

  describe('bisector', () => {
    it('should calculate angle bisector', () => {
      const result = bisector(equilateralVertices, 0)

      expect(result.start).toEqual({ x: 0, y: 0 })
      expect(result.end).toBeDefined()
    })
  })

  describe('midline', () => {
    it('should calculate midline parallel to side', () => {
      const result = midline(equilateralVertices, 0)

      // For side=0 (parallel to AB):
      // Should connect midpoints of AC and BC
      // AC midpoint = ((0+50)/2, (0+86.6)/2) = (25, 43.3)
      // BC midpoint = ((100+50)/2, (0+86.6)/2) = (75, 43.3)
      expect(result.start.x).toBeCloseTo(25, 0)
      expect(result.start.y).toBeCloseTo(43.3, 0)
      expect(result.end.x).toBeCloseTo(75, 0)
      expect(result.end.y).toBeCloseTo(43.3, 0)
    })

    it('should have correct length (half of opposite side)', () => {
      const result = midline(equilateralVertices, 0)

      // Original side AB = 100, midline should be 50
      expect(result.length).toBeCloseTo(50, 0)
    })
  })

  describe('calculateAuxiliaryLine', () => {
    it('should return correct line for each type', () => {
      expect(calculateAuxiliaryLine(equilateralVertices, 'median', 0)).toBeDefined()
      expect(calculateAuxiliaryLine(equilateralVertices, 'altitude', 0)).toBeDefined()
      expect(calculateAuxiliaryLine(equilateralVertices, 'bisector', 0)).toBeDefined()
      expect(calculateAuxiliaryLine(equilateralVertices, 'midline', 0)).toBeDefined()
    })

    it('should throw for unknown type', () => {
      expect(() =>
        calculateAuxiliaryLine(equilateralVertices, 'unknown' as any, 0)
      ).toThrow()
    })
  })
})
