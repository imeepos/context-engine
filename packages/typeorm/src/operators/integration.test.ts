import { describe, it, expect } from 'vitest'
import { eq, gt, lt, and, or, like, inArray } from '../operators/index.js'

describe('操作符集成测试', () => {
  it('应该正确导出所有操作符', () => {
    expect(typeof eq).toBe('function')
    expect(typeof gt).toBe('function')
    expect(typeof lt).toBe('function')
    expect(typeof and).toBe('function')
    expect(typeof or).toBe('function')
    expect(typeof like).toBe('function')
    expect(typeof inArray).toBe('function')
  })

  it('操作符应该返回正确的类型', () => {
    const eqOp = eq('name', 'John')
    expect(eqOp.type).toBe('eq')
    expect(eqOp.column).toBe('name')
    expect(eqOp.value).toBe('John')
  })

  it('应该支持复杂的操作符组合', () => {
    const complexOp = and<any>(
      eq('status', 'active'),
      or(
        gt('age', 18),
        like('role', '%admin%')
      ),
      inArray('country', ['US', 'UK', 'CA'])
    )

    expect(complexOp.type).toBe('and')
    expect(complexOp.conditions).toHaveLength(3)
    expect(complexOp.conditions?.[1]?.type).toBe('or')
  })
})
