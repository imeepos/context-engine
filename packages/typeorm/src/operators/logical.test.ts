import { describe, it, expect } from 'vitest'
import { and, or, not, eq, gt, like } from './index.js'

describe('逻辑操作符', () => {
  describe('and()', () => {
    it('应该组合多个条件（AND）', () => {
      const op = and<any>(
        eq('status', 'active'),
        gt('age', 18)
      )
      expect(op).toEqual({
        type: 'and',
        conditions: [
          { type: 'eq', column: 'status', value: 'active' },
          { type: 'gt', column: 'age', value: 18 }
        ]
      })
    })

    it('应该支持嵌套条件', () => {
      const op = and<any>(
        eq('status', 'active'),
        or(
          like('email', '%@gmail.com'),
          like('email', '%@outlook.com')
        )
      )
      expect(op.type).toBe('and')
      expect(op.conditions).toHaveLength(2)
      expect(op.conditions?.[1]?.type).toBe('or')
    })
  })

  describe('or()', () => {
    it('应该组合多个条件（OR）', () => {
      const op = or(
        eq('status', 'active'),
        eq('status', 'pending')
      )
      expect(op).toEqual({
        type: 'or',
        conditions: [
          { type: 'eq', column: 'status', value: 'active' },
          { type: 'eq', column: 'status', value: 'pending' }
        ]
      })
    })
  })

  describe('not()', () => {
    it('应该否定条件', () => {
      const op = not(eq('status', 'deleted'))
      expect(op).toEqual({
        type: 'not',
        condition: { type: 'eq', column: 'status', value: 'deleted' }
      })
    })
  })
})
