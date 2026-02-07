// 全等三角形测试
import { describe, it, expect } from 'vitest'
import {
  checkSSS,
  checkSAS,
  checkASA,
  checkAAS,
  checkHL,
  checkAllCongruence,
} from '../congruence'

describe('Congruence', () => {
  // Two identical triangles
  const triangle1 = [
    { x: 0, y: 0 },
    { x: 4, y: 0 },
    { x: 0, y: 3 },
  ] as [any, any, any]

  // Same triangle, different position
  const triangle2 = [
    { x: 10, y: 10 },
    { x: 14, y: 10 },
    { x: 10, y: 13 },
  ] as [any, any, any]

  // Different triangle
  const triangle3 = [
    { x: 0, y: 0 },
    { x: 5, y: 0 },
    { x: 0, y: 3 },
  ] as [any, any, any]

  // Right triangles for HL test
  const rightTriangle1 = [
    { x: 0, y: 0 },
    { x: 3, y: 0 },
    { x: 0, y: 4 },
  ] as [any, any, any]

  const rightTriangle2 = [
    { x: 10, y: 10 },
    { x: 13, y: 10 },
    { x: 10, y: 14 },
  ] as [any, any, any]

  describe('checkSSS', () => {
    it('should return true for congruent triangles', () => {
      const result = checkSSS(triangle1, triangle2)
      expect(result.satisfied).toBe(true)
      expect(result.name).toBe('SSS')
    })

    it('should return false for different triangles', () => {
      const result = checkSSS(triangle1, triangle3)
      expect(result.satisfied).toBe(false)
    })
  })

  describe('checkSAS', () => {
    it('should return true for congruent triangles', () => {
      const result = checkSAS(triangle1, triangle2)
      expect(result.satisfied).toBe(true)
      expect(result.name).toBe('SAS')
    })

    it('should return false for different triangles', () => {
      const result = checkSAS(triangle1, triangle3)
      expect(result.satisfied).toBe(false)
    })
  })

  describe('checkASA', () => {
    it('should return true for congruent triangles', () => {
      const result = checkASA(triangle1, triangle2)
      expect(result.satisfied).toBe(true)
      expect(result.name).toBe('ASA')
    })

    it('should return false for different triangles', () => {
      const result = checkASA(triangle1, triangle3)
      expect(result.satisfied).toBe(false)
    })
  })

  describe('checkAAS', () => {
    it('should return true for congruent triangles', () => {
      const result = checkAAS(triangle1, triangle2)
      expect(result.satisfied).toBe(true)
      expect(result.name).toBe('AAS')
    })

    it('should return false for different triangles', () => {
      const result = checkAAS(triangle1, triangle3)
      expect(result.satisfied).toBe(false)
    })
  })

  describe('checkHL', () => {
    it('should return true for congruent right triangles', () => {
      const result = checkHL(rightTriangle1, rightTriangle2)
      expect(result.satisfied).toBe(true)
      expect(result.name).toBe('HL')
    })

    it('should return false for non-right triangles', () => {
      const result = checkHL(triangle1, triangle3)
      expect(result.satisfied).toBe(false)
      expect(result.name).toBe('HL')
    })
  })

  describe('checkAllCongruence', () => {
    it('should return all criteria results', () => {
      const results = checkAllCongruence(triangle1, triangle2)

      expect(results).toHaveLength(5)
      expect(results.map(r => r.name)).toEqual(['SSS', 'SAS', 'ASA', 'AAS', 'HL'])
    })
  })
})
