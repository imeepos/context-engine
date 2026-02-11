import { describe, it, expect, beforeEach, vi } from 'vitest'
import { QueryBuilder } from './QueryBuilder.js'
import type { DatabaseDriver } from '../driver/types.js'
import type { TableMetadata } from '../metadata/types.js'
import { like, or } from '../operators/index.js'

describe('QueryBuilder - Advanced Features', () => {
  let mockDb: DatabaseDriver
  let metadata: TableMetadata

  beforeEach(() => {
    mockDb = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({ results: [] }),
          first: vi.fn().mockResolvedValue(null),
          run: vi.fn().mockResolvedValue({ success: true })
        })
      })
    } as any

    metadata = {
      name: 'users',
      columns: [
        { name: 'id', type: 'INTEGER', primary: true },
        { name: 'name', type: 'TEXT', primary: false },
        { name: 'email', type: 'TEXT', primary: false },
      ],
      relations: []
    }
  })

  describe('LIKE operator', () => {
    it('should build SQL with LIKE', async () => {
      const qb = new QueryBuilder(mockDb, metadata)
      await qb.where(like<any>('name', '%john%')).execute()

      const prepareMock = mockDb.prepare as any
      expect(prepareMock.mock.calls[0][0]).toBe('SELECT * FROM users WHERE name LIKE ?')
    })
  })

  describe('OR operator', () => {
    it('should build SQL with OR conditions', async () => {
      const qb = new QueryBuilder(mockDb, metadata)
      await qb.where(or<any>(
        { type: 'eq', column: 'name', value: 'John' },
        { type: 'eq', column: 'email', value: 'john@example.com' }
      )).execute()

      const prepareMock = mockDb.prepare as any
      expect(prepareMock.mock.calls[0][0]).toBe('SELECT * FROM users WHERE (name = ? OR email = ?)')
    })

    it('should build SQL with complex OR and LIKE', async () => {
      const qb = new QueryBuilder(mockDb, metadata)
      await qb.where(or<any>(
        like<any>('name', '%john%'),
        like<any>('email', '%john%')
      )).execute()

      const prepareMock = mockDb.prepare as any
      expect(prepareMock.mock.calls[0][0]).toBe('SELECT * FROM users WHERE (name LIKE ? OR email LIKE ?)')
    })
  })

  describe('Raw SQL expressions', () => {
    it('should support raw SQL in select', async () => {
      const qb = new QueryBuilder(mockDb, metadata)
      await qb.addSelectRaw('COUNT(*)', 'count').execute()

      const prepareMock = mockDb.prepare as any
      expect(prepareMock.mock.calls[0][0]).toBe('SELECT COUNT(*) AS count FROM users')
    })

    it('should support raw SQL without alias', async () => {
      const qb = new QueryBuilder(mockDb, metadata)
      await qb.addSelectRaw('COALESCE(AVG(rating), 0)').execute()

      const prepareMock = mockDb.prepare as any
      expect(prepareMock.mock.calls[0][0]).toBe('SELECT COALESCE(AVG(rating), 0) FROM users')
    })

    it('should combine regular select with raw expressions', async () => {
      const qb = new QueryBuilder<any>(mockDb, metadata)
      await qb
        .select('name')
        .addSelectRaw('COUNT(*)', 'count')
        .groupBy('name')
        .execute()

      const prepareMock = mockDb.prepare as any
      expect(prepareMock.mock.calls[0][0]).toBe('SELECT name, COUNT(*) AS count FROM users GROUP BY name')
    })
  })
})
