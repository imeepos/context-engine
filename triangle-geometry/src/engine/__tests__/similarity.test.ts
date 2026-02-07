// 相似三角形测试
import { describe, it, expect } from 'vitest'
import {
  checkAA,
  checkSimilarSAS,
  checkSSS,
  checkAllSimilarity,
  areaRatio,
} from '../similarity'

describe('Similarity', () => {
  // Similar triangles (ratio 2:1)
  const triangle1 = [
    { x: 0, y: 0 },
    { x: 6, y: 0 },
    { x: 0, y: 4 },
  ] as [any, any, any]

  const triangle2 = [
    { x: 0, y: 0 },
    { x: 3, y: 0 },
    { x: 0, y: 2 },
  ] as [any, any, any]

  // Different triangles (not similar)
  const triangle3 = [
    { x: 0, y: 0 },
    { x: 5, y: 0 },
    { x: 0, y: 3 },
  ] as [any, any, any]

  describe('checkAA', () => {
    it('should return true for similar triangles', () => {
      const result = checkAA(triangle1, triangle2)

      expect(result.satisfied).toBe(true)
      expect(result.name).toBe('AA')
      expect(result.ratio).toBeCloseTo(2, 2)
    })

    it('should return false for different triangles', () => {
      const result = checkAA(triangle1, triangle3)
      expect(result.satisfied).toBe(false)
    })
  })

  describe('checkSimilarSAS', () => {
    it('should return true for similar triangles with proportional sides', () => {
      const result = checkSimilarSAS(triangle1, triangle2)
      expect(result.satisfied).toBe(true)
      expect(result.name).toBe('SAS')
    })

    it('should return false for non-similar triangles', () => {
      const result = checkSimilarSAS(triangle1, triangle3)
      expect(result.satisfied).toBe(false)
    })
  })

  describe('checkSSS', () => {
    it('should return true for similar triangles', () => {
      const result = checkSSS(triangle1, triangle2)
      expect(result.satisfied).toBe(true)
      expect(result.ratio).toBeCloseTo(2, 2)
    })

    it('should return false for non-similar triangles', () => {
      const result = checkSSS(triangle1, triangle3)
      expect(result.satisfied).toBe(false)
    })
  })

  describe('areaRatio', () => {
    it('should return square of similarity ratio', () => {
      expect(areaRatio(2)).toBe(4)
      expect(areaRatio(3)).toBe(9)
      expect(areaRatio(1.5)).toBe(2.25)
    })
  })

  describe('checkAllSimilarity', () => {
    it('should return all criteria results', () => {
      const results = checkAllSimilarity(triangle1, triangle2)

      expect(results).toHaveLength(3)
      expect(results.map(r => r.name)).toEqual(['AA', 'SAS', 'SSS'])
    })
  })
})
