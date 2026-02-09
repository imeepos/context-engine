import { describe, it, expect, beforeEach, vi } from 'vitest'
import { QueryBuilder } from './QueryBuilder.js'
import { TableMetadata } from '../metadata/types.js'

describe('QueryBuilder', () => {
  let mockDb: D1Database
  let metadata: TableMetadata

  beforeEach(() => {
    // Mock D1Database
    mockDb = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({ results: [] }),
          first: vi.fn().mockResolvedValue(null),
          run: vi.fn().mockResolvedValue({ success: true })
        })
      })
    } as any

    // Mock table metadata
    metadata = {
      name: 'users',
      columns: [
        { name: 'id', type: 'INTEGER', primary: true },
        { name: 'name', type: 'TEXT', primary: false },
        { name: 'email', type: 'TEXT', primary: false },
        { name: 'age', type: 'INTEGER', primary: false },
        { name: 'status', type: 'TEXT', primary: false }
      ],
      relations: []
    }
  })

  describe('select()', () => {
    it('应该选择所有列（默认）', async () => {
      const qb = new QueryBuilder<any>(mockDb, metadata)
      await qb.execute()

      expect(mockDb.prepare).toHaveBeenCalledWith('SELECT * FROM users')
    })

    it('应该选择指定的列', async () => {
      const qb = new QueryBuilder<any>(mockDb, metadata)
      await qb.select('id', 'name').execute()

      expect(mockDb.prepare).toHaveBeenCalledWith('SELECT id, name FROM users')
    })

    it('应该支持链式调用', () => {
      const qb = new QueryBuilder<any>(mockDb, metadata)
      const result = qb.select('id', 'name')

      expect(result).toBe(qb)
    })
  })

  describe('where()', () => {
    it('应该支持简单的相等条件', async () => {
      const qb = new QueryBuilder(mockDb, metadata)
      await qb.where({ status: 'active' }).execute()

      const prepare = mockDb.prepare as any
      expect(prepare).toHaveBeenCalledWith('SELECT * FROM users WHERE status = ?')
      expect(prepare().bind).toHaveBeenCalledWith('active')
    })

    it('应该支持多个条件（AND）', async () => {
      const qb = new QueryBuilder(mockDb, metadata)
      await qb.where({ status: 'active', age: 18 }).execute()

      const prepare = mockDb.prepare as any
      expect(prepare).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE status = ? AND age = ?'
      )
      expect(prepare().bind).toHaveBeenCalledWith('active', 18)
    })
  })

  describe('orderBy()', () => {
    it('应该支持单列排序', async () => {
      const qb = new QueryBuilder<any>(mockDb, metadata)
      await qb.orderBy('name', 'ASC').execute()

      expect(mockDb.prepare).toHaveBeenCalledWith(
        'SELECT * FROM users ORDER BY name ASC'
      )
    })

    it('应该支持降序排序', async () => {
      const qb = new QueryBuilder<any>(mockDb, metadata)
      await qb.orderBy('age', 'DESC').execute()

      expect(mockDb.prepare).toHaveBeenCalledWith(
        'SELECT * FROM users ORDER BY age DESC'
      )
    })
  })

  describe('limit() 和 offset()', () => {
    it('应该支持 LIMIT', async () => {
      const qb = new QueryBuilder(mockDb, metadata)
      await qb.limit(10).execute()

      const prepare = mockDb.prepare as any
      expect(prepare).toHaveBeenCalledWith('SELECT * FROM users LIMIT ?')
      expect(prepare().bind).toHaveBeenCalledWith(10)
    })

    it('应该支持 OFFSET', async () => {
      const qb = new QueryBuilder(mockDb, metadata)
      await qb.offset(20).execute()

      const prepare = mockDb.prepare as any
      expect(prepare).toHaveBeenCalledWith('SELECT * FROM users OFFSET ?')
      expect(prepare().bind).toHaveBeenCalledWith(20)
    })

    it('应该支持 LIMIT 和 OFFSET 组合', async () => {
      const qb = new QueryBuilder(mockDb, metadata)
      await qb.limit(10).offset(20).execute()

      const prepare = mockDb.prepare as any
      expect(prepare).toHaveBeenCalledWith(
        'SELECT * FROM users LIMIT ? OFFSET ?'
      )
      expect(prepare().bind).toHaveBeenCalledWith(10, 20)
    })
  })

  describe('复杂查询组合', () => {
    it('应该支持完整的查询链', async () => {
      const qb = new QueryBuilder<any>(mockDb, metadata)
      await qb
        .select('id', 'name', 'email')
        .where({ status: 'active' })
        .orderBy('name', 'ASC')
        .limit(10)
        .offset(20)
        .execute()

      const prepare = mockDb.prepare as any
      expect(prepare).toHaveBeenCalledWith(
        'SELECT id, name, email FROM users WHERE status = ? ORDER BY name ASC LIMIT ? OFFSET ?'
      )
      expect(prepare().bind).toHaveBeenCalledWith('active', 10, 20)
    })
  })

  describe('execute()', () => {
    it('应该返回查询结果', async () => {
      const mockResults = [
        { id: 1, name: 'John', email: 'john@example.com' },
        { id: 2, name: 'Jane', email: 'jane@example.com' }
      ]

      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({ results: mockResults })
        })
      }) as any

      const qb = new QueryBuilder(mockDb, metadata)
      const results = await qb.execute()

      expect(results).toEqual(mockResults)
    })

    it('应该处理空结果', async () => {
      const qb = new QueryBuilder(mockDb, metadata)
      const results = await qb.execute()

      expect(results).toEqual([])
    })
  })
})
