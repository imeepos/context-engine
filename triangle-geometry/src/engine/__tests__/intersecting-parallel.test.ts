// 相交线与平行线计算测试
import { describe, it, expect } from 'vitest'
import {
  verticalAngles,
  transversalAngles,
  classifyAnglePairs,
  areLinesParallel,
} from '../intersecting-parallel'

describe('Intersecting & Parallel Lines', () => {
  describe('verticalAngles', () => {
    it('should calculate vertical angle pairs for perpendicular lines', () => {
      const intersection = { x: 0, y: 0 }
      const p1 = { x: 1, y: 0 }
      const p2 = { x: -1, y: 0 }
      const p3 = { x: 0, y: 1 }
      const p4 = { x: 0, y: -1 }

      const pairs = verticalAngles(p1, p2, p3, p4, intersection)
      expect(pairs).toHaveLength(2)
      expect(pairs[0].angle1).toBeCloseTo(90)
      expect(pairs[1].angle1).toBeCloseTo(90)
    })

    it('should return equal angles for each vertical pair', () => {
      const intersection = { x: 0, y: 0 }
      const p1 = { x: 2, y: 1 }
      const p2 = { x: -2, y: -1 }
      const p3 = { x: -1, y: 2 }
      const p4 = { x: 1, y: -2 }

      const pairs = verticalAngles(p1, p2, p3, p4, intersection)
      expect(pairs[0].angle1).toBe(pairs[0].angle2)
      expect(pairs[1].angle1).toBe(pairs[1].angle2)
    })

    it('should have supplementary relationship between pairs', () => {
      const intersection = { x: 0, y: 0 }
      const p1 = { x: 3, y: 1 }
      const p2 = { x: -3, y: -1 }
      const p3 = { x: -1, y: 3 }
      const p4 = { x: 1, y: -3 }

      const pairs = verticalAngles(p1, p2, p3, p4, intersection)
      expect(pairs[0].angle1 + pairs[1].angle1).toBeCloseTo(180)
    })

    it('should return empty array for zero-length vectors', () => {
      const p = { x: 0, y: 0 }
      const pairs = verticalAngles(p, p, p, p, p)
      expect(pairs).toHaveLength(0)
    })
  })

  describe('transversalAngles', () => {
    it('should calculate 8 angles for two lines cut by transversal', () => {
      const line1 = { start: { x: 0, y: 0 }, end: { x: 10, y: 0 } }
      const line2 = { start: { x: 0, y: 5 }, end: { x: 10, y: 5 } }
      const trans = { start: { x: 0, y: -5 }, end: { x: 5, y: 10 } }

      const angles = transversalAngles(line1, line2, trans)
      expect(angles.upper).toHaveLength(4)
      expect(angles.lower).toHaveLength(4)
    })

    it('should have supplementary adjacent angles', () => {
      const line1 = { start: { x: 0, y: 0 }, end: { x: 10, y: 0 } }
      const line2 = { start: { x: 0, y: 5 }, end: { x: 10, y: 5 } }
      const trans = { start: { x: 2, y: -3 }, end: { x: 8, y: 8 } }

      const angles = transversalAngles(line1, line2, trans)
      expect(angles.upper[0] + angles.upper[1]).toBeCloseTo(180)
      expect(angles.lower[0] + angles.lower[1]).toBeCloseTo(180)
    })

    it('should produce equal angles for parallel lines', () => {
      const line1 = { start: { x: 0, y: 0 }, end: { x: 10, y: 0 } }
      const line2 = { start: { x: 0, y: 5 }, end: { x: 10, y: 5 } }
      const trans = { start: { x: 3, y: -2 }, end: { x: 7, y: 12 } }

      const angles = transversalAngles(line1, line2, trans)
      // 平行线被截线所截，同位角相等
      expect(angles.upper[0]).toBeCloseTo(angles.lower[0])
      expect(angles.upper[1]).toBeCloseTo(angles.lower[1])
    })
  })

  describe('classifyAnglePairs', () => {
    it('should classify all angle pair types', () => {
      const line1 = { start: { x: 0, y: 0 }, end: { x: 10, y: 0 } }
      const line2 = { start: { x: 0, y: 5 }, end: { x: 10, y: 5 } }
      const trans = { start: { x: 3, y: -2 }, end: { x: 7, y: 12 } }

      const angles = transversalAngles(line1, line2, trans)
      const pairs = classifyAnglePairs(angles)

      const corresponding = pairs.filter((p) => p.type === 'corresponding')
      const alternateInterior = pairs.filter((p) => p.type === 'alternate-interior')
      const coInterior = pairs.filter((p) => p.type === 'co-interior')

      expect(corresponding).toHaveLength(4)
      expect(alternateInterior).toHaveLength(2)
      expect(coInterior).toHaveLength(2)
    })

    it('should have co-interior angles sum to 180 for parallel lines', () => {
      const line1 = { start: { x: 0, y: 0 }, end: { x: 10, y: 0 } }
      const line2 = { start: { x: 0, y: 5 }, end: { x: 10, y: 5 } }
      const trans = { start: { x: 3, y: -2 }, end: { x: 7, y: 12 } }

      const angles = transversalAngles(line1, line2, trans)
      const pairs = classifyAnglePairs(angles)
      const coInterior = pairs.filter((p) => p.type === 'co-interior')

      for (const pair of coInterior) {
        expect(pair.angle1 + pair.angle2).toBeCloseTo(180)
      }
    })
  })

  describe('areLinesParallel', () => {
    it('should detect parallel horizontal lines', () => {
      const line1 = { start: { x: 0, y: 0 }, end: { x: 10, y: 0 } }
      const line2 = { start: { x: 0, y: 5 }, end: { x: 10, y: 5 } }
      expect(areLinesParallel(line1, line2)).toBe(true)
    })

    it('should detect parallel diagonal lines', () => {
      const line1 = { start: { x: 0, y: 0 }, end: { x: 3, y: 4 } }
      const line2 = { start: { x: 1, y: 0 }, end: { x: 4, y: 4 } }
      expect(areLinesParallel(line1, line2)).toBe(true)
    })

    it('should detect non-parallel lines', () => {
      const line1 = { start: { x: 0, y: 0 }, end: { x: 10, y: 0 } }
      const line2 = { start: { x: 0, y: 0 }, end: { x: 10, y: 5 } }
      expect(areLinesParallel(line1, line2)).toBe(false)
    })

    it('should detect perpendicular lines as non-parallel', () => {
      const line1 = { start: { x: 0, y: 0 }, end: { x: 10, y: 0 } }
      const line2 = { start: { x: 5, y: -5 }, end: { x: 5, y: 5 } }
      expect(areLinesParallel(line1, line2)).toBe(false)
    })
  })
})
