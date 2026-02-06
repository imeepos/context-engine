import { describe, it, expect } from 'vitest'
import { eq, gt, lt, gte, lte, ne } from './index.js'

describe('比较操作符', () => {
  describe('eq()', () => {
    it('应该创建相等操作符', () => {
      const op = eq('status', 'active')
      expect(op).toEqual({
        type: 'eq',
        column: 'status',
        value: 'active'
      })
    })
  })

  describe('gt()', () => {
    it('应该创建大于操作符', () => {
      const op = gt('age', 18)
      expect(op).toEqual({
        type: 'gt',
        column: 'age',
        value: 18
      })
    })
  })

  describe('lt()', () => {
    it('应该创建小于操作符', () => {
      const op = lt('age', 65)
      expect(op).toEqual({
        type: 'lt',
        column: 'age',
        value: 65
      })
    })
  })

  describe('gte()', () => {
    it('应该创建大于等于操作符', () => {
      const op = gte('score', 60)
      expect(op).toEqual({
        type: 'gte',
        column: 'score',
        value: 60
      })
    })
  })

  describe('lte()', () => {
    it('应该创建小于等于操作符', () => {
      const op = lte('price', 100)
      expect(op).toEqual({
        type: 'lte',
        column: 'price',
        value: 100
      })
    })
  })

  describe('ne()', () => {
    it('应该创建不等于操作符', () => {
      const op = ne('status', 'deleted')
      expect(op).toEqual({
        type: 'ne',
        column: 'status',
        value: 'deleted'
      })
    })
  })
})
