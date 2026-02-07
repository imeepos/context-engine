// 三角形属性测试
import { describe, it, expect } from 'vitest'
import {
  calculateTriangleProperties,
  classifyTriangle,
  validateTriangleInequality,
} from '../triangle-properties'

describe('Triangle Properties', () => {
  describe('calculateTriangleProperties', () => {
    it('should calculate properties of equilateral triangle', () => {
      // Use exact values for equilateral triangle
      const vertices: [any, any, any] = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 50, y: 50 * Math.sqrt(3) },
      ]

      const props = calculateTriangleProperties(vertices)

      // All sides should be approximately equal
      expect(props.sideLengths.AB).toBeCloseTo(100, 0)
      expect(props.sideLengths.BC).toBeCloseTo(100, 0)
      expect(props.sideLengths.CA).toBeCloseTo(100, 0)

      // All angles should be approximately 60
      expect(props.anglesInDegrees.A).toBeCloseTo(60, 0)
      expect(props.anglesInDegrees.B).toBeCloseTo(60, 0)
      expect(props.anglesInDegrees.C).toBeCloseTo(60, 0)

      // Should be equilateral
      expect(props.type).toBe('equilateral')
    })

    it('should calculate properties of right triangle', () => {
      const vertices: [any, any, any] = [
        { x: 0, y: 0 },
        { x: 3, y: 0 },
        { x: 0, y: 4 },
      ]

      const props = calculateTriangleProperties(vertices)

      // Sides: AB=3, BC=5, CA=4
      expect(props.sideLengths.AB).toBeCloseTo(3, 1)
      expect(props.sideLengths.BC).toBeCloseTo(5, 1)
      expect(props.sideLengths.CA).toBeCloseTo(4, 1)

      // Angles: A=90, B~53.13, C~36.87 (at vertices A(0,0), B(3,0), C(0,4))
      expect(props.anglesInDegrees.A).toBeCloseTo(90, 0)
      expect(props.anglesInDegrees.B).toBeCloseTo(53, 0)  // at B(3,0)
      expect(props.anglesInDegrees.C).toBeCloseTo(37, 0)  // at C(0,4)

      // Should be right triangle
      expect(props.type).toBe('right')
    })

    it('should calculate area using coordinate method', () => {
      const vertices: [any, any, any] = [
        { x: 0, y: 0 },
        { x: 6, y: 0 },
        { x: 0, y: 8 },
      ]

      const props = calculateTriangleProperties(vertices)

      // Area should be 24 (0.5 * 6 * 8)
      expect(props.area).toBeCloseTo(24, 1)
    })
  })

  describe('classifyTriangle', () => {
    it('should identify equilateral triangle', () => {
      expect(classifyTriangle(5, 5, 5, 60, 60, 60)).toBe('equilateral')
    })

    it('should identify isosceles triangle (without right angle)', () => {
      // Isosceles without right angle - angles are ~70.53, ~70.53, ~38.94
      expect(classifyTriangle(5, 5, 6, 70.5, 70.5, 38.9)).toBe('isosceles')
    })

    it('should identify right triangle', () => {
      // 3-4-5 right triangle
      expect(classifyTriangle(3, 4, 5, 36.87, 53.13, 90)).toBe('right')
    })

    it('should identify scalene triangle', () => {
      expect(classifyTriangle(4, 5, 6, 41.41, 58.99, 80)).toBe('scalene')
    })
  })

  describe('validateTriangleInequality', () => {
    it('should return true for valid triangle', () => {
      expect(validateTriangleInequality(3, 4, 5)).toBe(true)
      expect(validateTriangleInequality(5, 5, 5)).toBe(true)
      expect(validateTriangleInequality(2, 3, 4)).toBe(true)
    })

    it('should return false for degenerate triangle', () => {
      expect(validateTriangleInequality(1, 1, 2)).toBe(false)
      expect(validateTriangleInequality(1, 2, 3)).toBe(false)
    })

    it('should return false for impossible triangle', () => {
      expect(validateTriangleInequality(1, 1, 3)).toBe(false)
    })
  })
})
