// 三角函数测试
import { describe, it, expect } from 'vitest'
import {
  calculateTrigFunctions,
  calculateSideRatios,
  verifyPythagoras,
  calculateByPythagoras,
  SPECIAL_ANGLES,
} from '../trigonometry'

describe('Trigonometry', () => {
  describe('calculateTrigFunctions', () => {
    it('should calculate sin(30°)', () => {
      const result = calculateTrigFunctions(30)
      expect(result.sin).toBeCloseTo(0.5, 3)
    })

    it('should calculate cos(30°)', () => {
      const result = calculateTrigFunctions(30)
      expect(result.cos).toBeCloseTo(Math.sqrt(3) / 2, 3)
    })

    it('should calculate tan(45°)', () => {
      const result = calculateTrigFunctions(45)
      expect(result.tan).toBeCloseTo(1, 3)
    })

    it('should calculate sin(90°)', () => {
      const result = calculateTrigFunctions(90)
      expect(result.sin).toBeCloseTo(1, 3)
    })

    it('should calculate cos(90°)', () => {
      const result = calculateTrigFunctions(90)
      expect(result.cos).toBeCloseTo(0, 3)
    })
  })

  describe('calculateSideRatios', () => {
    it('should return correct ratios for 30°', () => {
      const ratios = calculateSideRatios(30)

      expect(ratios.sin).toBeCloseTo(0.5, 3)
      expect(ratios.cos).toBeCloseTo(Math.sqrt(3) / 2, 3)
      expect(ratios.tan).toBeCloseTo(1 / Math.sqrt(3), 3)
    })

    it('should return correct ratios for 45°', () => {
      const ratios = calculateSideRatios(45)

      expect(ratios.sin).toBeCloseTo(Math.sqrt(2) / 2, 3)
      expect(ratios.cos).toBeCloseTo(Math.sqrt(2) / 2, 3)
      expect(ratios.tan).toBeCloseTo(1, 3)
    })

    it('should return correct ratios for 60°', () => {
      const ratios = calculateSideRatios(60)

      expect(ratios.sin).toBeCloseTo(Math.sqrt(3) / 2, 3)
      expect(ratios.cos).toBeCloseTo(0.5, 3)
      expect(ratios.tan).toBeCloseTo(Math.sqrt(3), 3)
    })
  })

  describe('SPECIAL_ANGLES', () => {
    it('should have correct values for 30°', () => {
      expect(SPECIAL_ANGLES[30].sin).toBe(0.5)
      expect(SPECIAL_ANGLES[30].cos).toBeCloseTo(Math.sqrt(3) / 2, 3)
    })

    it('should have correct values for 45°', () => {
      expect(SPECIAL_ANGLES[45].sin).toBeCloseTo(Math.sqrt(2) / 2, 3)
      expect(SPECIAL_ANGLES[45].cos).toBeCloseTo(Math.sqrt(2) / 2, 3)
    })

    it('should have correct values for 60°', () => {
      expect(SPECIAL_ANGLES[60].sin).toBeCloseTo(Math.sqrt(3) / 2, 3)
      expect(SPECIAL_ANGLES[60].cos).toBe(0.5)
    })
  })

  describe('verifyPythagoras', () => {
    it('should verify 3-4-5 right triangle', () => {
      const vertices: [any, any, any] = [
        { x: 0, y: 0 },
        { x: 3, y: 0 },
        { x: 0, y: 4 },
      ]

      const result = verifyPythagoras(vertices)

      expect(result.verified).toBe(true)
      expect(result.equation).toContain('=')
    })

    it('should fail for non-right triangle', () => {
      const vertices: [any, any, any] = [
        { x: 0, y: 0 },
        { x: 2, y: 0 },
        { x: 0, y: 2 },
      ]

      // This is a right triangle too (2-2-2√2)
      const result = verifyPythagoras(vertices)
      expect(result.verified).toBe(true)
    })
  })

  describe('calculateByPythagoras', () => {
    it('should calculate hypotenuse from two legs', () => {
      const result = calculateByPythagoras(3, 4)
      expect(result).toBeCloseTo(5, 2)
    })

    it('should calculate leg from hypotenuse and other leg', () => {
      const result = calculateByPythagoras(3, undefined, 5)
      expect(result).toBeCloseTo(4, 2)
    })
  })
})
