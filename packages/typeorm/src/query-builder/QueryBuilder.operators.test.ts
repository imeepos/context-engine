import { describe, it, expect, beforeEach, vi } from 'vitest'
import { QueryBuilder } from './QueryBuilder.js'
import { TableMetadata } from '../metadata/types.js'
import { eq, gt, and, or, like } from '../operators/index.js'

describe('QueryBuilder with Operators', () => {
  let mockDb: D1Database
  let metadata: TableMetadata

  beforeEach(() => {
    mockDb = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({ results: [] })
        })
      })
    } as any

    metadata = {
      name: 'users',
      columns: [
        { name: 'id', type: 'INTEGER', primary: true },
        { name: 'name', type: 'TEXT', primary: false },
        { name: 'email', type: 'TEXT', primary: false },
        { name: 'age', type: 'INTEGER', primary: false },
        { name: 'status', type: 'TEXT', primary: false }
      ]
    }
  })

  describe('where() with operators', () => {
    it('应该支持 eq 操作符', async () => {
      const qb = new QueryBuilder(mockDb, metadata)
      await qb.where(eq<any>('status', 'active')).execute()

      const prepare = mockDb.prepare as any
      expect(prepare).toHaveBeenCalledWith('SELECT * FROM users WHERE status = ?')
      expect(prepare().bind).toHaveBeenCalledWith('active')
    })

    it('应该支持 gt 操作符', async () => {
      const qb = new QueryBuilder(mockDb, metadata)
      await qb.where(gt<any>('age', 18)).execute()

      const prepare = mockDb.prepare as any
      expect(prepare).toHaveBeenCalledWith('SELECT * FROM users WHERE age > ?')
      expect(prepare().bind).toHaveBeenCalledWith(18)
    })

    it('应该支持 like 操作符', async () => {
      const qb = new QueryBuilder(mockDb, metadata)
      await qb.where(like<any>('email', '%@gmail.com')).execute()

      const prepare = mockDb.prepare as any
      expect(prepare).toHaveBeenCalledWith('SELECT * FROM users WHERE email LIKE ?')
      expect(prepare().bind).toHaveBeenCalledWith('%@gmail.com')
    })

    it('应该支持 and 操作符', async () => {
      const qb = new QueryBuilder(mockDb, metadata)
      await qb.where(and<any>(
        eq('status', 'active'),
        gt('age', 18)
      )).execute()

      const prepare = mockDb.prepare as any
      expect(prepare).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE (status = ? AND age > ?)'
      )
      expect(prepare().bind).toHaveBeenCalledWith('active', 18)
    })

    it('应该支持 or 操作符', async () => {
      const qb = new QueryBuilder(mockDb, metadata)
      await qb.where(or<any>(
        eq('status', 'active'),
        eq('status', 'pending')
      )).execute()

      const prepare = mockDb.prepare as any
      expect(prepare).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE (status = ? OR status = ?)'
      )
      expect(prepare().bind).toHaveBeenCalledWith('active', 'pending')
    })

    it('应该支持嵌套操作符', async () => {
      const qb = new QueryBuilder(mockDb, metadata)
      await qb.where(and<any>(
        eq('status', 'active'),
        or(
          like('email', '%@gmail.com'),
          like('email', '%@outlook.com')
        )
      )).execute()

      const prepare = mockDb.prepare as any
      expect(prepare).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE (status = ? AND (email LIKE ? OR email LIKE ?))'
      )
      expect(prepare().bind).toHaveBeenCalledWith('active', '%@gmail.com', '%@outlook.com')
    })
  })
})
