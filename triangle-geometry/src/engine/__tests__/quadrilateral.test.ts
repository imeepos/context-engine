/**
 * 四边形计算引擎的单元测试
 */

import { describe, it, expect } from 'vitest'
import { calculateQuadProperties } from '../shapes/quadrilateral'

describe('Quadrilateral Operations', () => {
  describe('calculateQuadProperties', () => {
    it('should calculate properties of a square', () => {
      const vertices: [any, any, any, any] = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 },
      ]

      const props = calculateQuadProperties(vertices)

      expect(props.sideLengths.AB).toBeCloseTo(100, 1)
      expect(props.sideLengths.BC).toBeCloseTo(100, 1)
      expect(props.sideLengths.CD).toBeCloseTo(100, 1)
      expect(props.sideLengths.DA).toBeCloseTo(100, 1)
      expect(props.perimeter).toBeCloseTo(400, 1)
      expect(props.area).toBeCloseTo(10000, 1)
      expect(props.isSquare).toBe(true)
      expect(props.isRectangle).toBe(true)
      expect(props.isRhombus).toBe(true)
      expect(props.isParallelogram).toBe(true)
    })

    it('should calculate properties of a rectangle', () => {
      const vertices: [any, any, any, any] = [
        { x: 0, y: 0 },
        { x: 150, y: 0 },
        { x: 150, y: 100 },
        { x: 0, y: 100 },
      ]

      const props = calculateQuadProperties(vertices)

      expect(props.sideLengths.AB).toBeCloseTo(150, 1)
      expect(props.sideLengths.BC).toBeCloseTo(100, 1)
      expect(props.isRectangle).toBe(true)
      expect(props.isParallelogram).toBe(true)
      expect(props.isSquare).toBe(false)
      expect(props.isRhombus).toBe(false)
    })

    it('should calculate properties of a rhombus', () => {
      // 创建一个菱形（不是正方形）- 使用不等长的对角线
      const vertices: [any, any, any, any] = [
        { x: 50, y: 0 },
        { x: 100, y: 30 },
        { x: 50, y: 60 },
        { x: 0, y: 30 },
      ]

      const props = calculateQuadProperties(vertices)

      // 所有边应该相等
      const sideLength = Math.sqrt(50 * 50 + 30 * 30)
      expect(props.sideLengths.AB).toBeCloseTo(sideLength, 1)
      expect(props.sideLengths.BC).toBeCloseTo(sideLength, 1)
      expect(props.sideLengths.CD).toBeCloseTo(sideLength, 1)
      expect(props.sideLengths.DA).toBeCloseTo(sideLength, 1)
      expect(props.isRhombus).toBe(true)
      expect(props.isParallelogram).toBe(true)
      expect(props.isSquare).toBe(false)
      expect(props.isRectangle).toBe(false)
    })

    it('should calculate properties of a parallelogram', () => {
      const vertices: [any, any, any, any] = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 150, y: 50 },
        { x: 50, y: 50 },
      ]

      const props = calculateQuadProperties(vertices)

      expect(props.isParallelogram).toBe(true)
      expect(props.isRectangle).toBe(false)
      expect(props.isRhombus).toBe(false)
      expect(props.isSquare).toBe(false)
    })

    it('should calculate properties of a trapezoid', () => {
      const vertices: [any, any, any, any] = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 80, y: 50 },
        { x: 20, y: 50 },
      ]

      const props = calculateQuadProperties(vertices)

      expect(props.isTrapezoid).toBe(true)
      expect(props.isParallelogram).toBe(false)
    })

    it('should calculate area correctly', () => {
      const vertices: [any, any, any, any] = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 },
      ]

      const props = calculateQuadProperties(vertices)

      expect(props.area).toBeCloseTo(10000, 1)
    })

    it('should calculate perimeter correctly', () => {
      const vertices: [any, any, any, any] = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 },
      ]

      const props = calculateQuadProperties(vertices)

      expect(props.perimeter).toBeCloseTo(400, 1)
    })

    it('should calculate diagonal lengths correctly', () => {
      const vertices: [any, any, any, any] = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 },
      ]

      const props = calculateQuadProperties(vertices)

      const diagonal = Math.sqrt(100 * 100 + 100 * 100)
      expect(props.diagonals.AC).toBeCloseTo(diagonal, 1)
      expect(props.diagonals.BD).toBeCloseTo(diagonal, 1)
    })
  })
})

