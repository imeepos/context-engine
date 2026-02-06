import { describe, it, expect } from 'vitest'
import { like, ilike, inArray, between } from './index.js'

describe('模糊匹配操作符', () => {
  describe('like()', () => {
    it('应该创建 LIKE 操作符', () => {
      const op = like('email', '%@gmail.com')
      expect(op).toEqual({
        type: 'like',
        column: 'email',
        value: '%@gmail.com'
      })
    })
  })

  describe('ilike()', () => {
    it('应该创建不区分大小写的 LIKE 操作符', () => {
      const op = ilike('name', '%john%')
      expect(op).toEqual({
        type: 'ilike',
        column: 'name',
        value: '%john%'
      })
    })
  })
})

describe('范围操作符', () => {
  describe('inArray()', () => {
    it('应该创建 IN 操作符', () => {
      const op = inArray('status', ['active', 'pending'])
      expect(op).toEqual({
        type: 'in',
        column: 'status',
        values: ['active', 'pending']
      })
    })
  })

  describe('between()', () => {
    it('应该创建 BETWEEN 操作符', () => {
      const op = between('age', 18, 65)
      expect(op).toEqual({
        type: 'between',
        column: 'age',
        min: 18,
        max: 65
      })
    })
  })
})
