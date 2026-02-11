import { describe, it, expect, beforeEach, vi } from 'vitest'
import { QueryBuilder } from './QueryBuilder.js'
import type { DatabaseDriver } from '../driver/types.js'
import type { TableMetadata } from '../metadata/types.js'

describe('QueryBuilder - GROUP BY and HAVING', () => {
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
        { name: 'age', type: 'INTEGER', primary: false },
        { name: 'city', type: 'TEXT', primary: false },
      ],
      relations: []
    }
  })

  it('should build SQL with GROUP BY', async () => {
    const qb = new QueryBuilder(mockDb, metadata)
    await qb.addSelect('city', 'COUNT(*) as count').groupBy('city').execute()

    expect(mockDb.prepare).toHaveBeenCalledWith(
      'SELECT city, COUNT(*) as count FROM users GROUP BY city'
    )
  })

  it('should build SQL with multiple GROUP BY columns', async () => {
    const qb = new QueryBuilder(mockDb, metadata)
    await qb.addSelect('city', 'age', 'COUNT(*) as count').groupBy('city', 'age').execute()

    expect(mockDb.prepare).toHaveBeenCalledWith(
      'SELECT city, age, COUNT(*) as count FROM users GROUP BY city, age'
    )
  })

  it('should build SQL with GROUP BY and HAVING', async () => {
    const qb = new QueryBuilder(mockDb, metadata)
    await qb.addSelect('city', 'COUNT(*) as count').groupBy('city').having({ count: 5 }).execute()

    const prepareMock = mockDb.prepare as any
    const call = prepareMock.mock.calls[0]
    expect(call[0]).toBe('SELECT city, COUNT(*) as count FROM users GROUP BY city HAVING count = ?')
  })

  it('should build SQL with WHERE, GROUP BY, HAVING, and ORDER BY', async () => {
    const qb = new QueryBuilder(mockDb, metadata)
    await qb
      .addSelect('city', 'COUNT(*) as count')
      .where({ age: 25 })
      .groupBy('city')
      .having({ count: 5 })
      .orderBy('count', 'DESC')
      .execute()

    const prepareMock = mockDb.prepare as any
    const call = prepareMock.mock.calls[0]
    expect(call[0]).toBe(
      'SELECT city, COUNT(*) as count FROM users WHERE age = ? GROUP BY city HAVING count = ? ORDER BY count DESC'
    )
  })

  it('should build SQL with JOIN and GROUP BY', async () => {
    const qb = new QueryBuilder(mockDb, metadata, 'u')
    await qb
      .addSelect('u.city', 'COUNT(*) as count')
      .leftJoin('orders', 'o', 'o.user_id = u.id')
      .groupBy('u.city')
      .execute()

    expect(mockDb.prepare).toHaveBeenCalledWith(
      'SELECT u.city, COUNT(*) as count FROM users u LEFT JOIN orders o ON o.user_id = u.id GROUP BY u.city'
    )
  })
})
