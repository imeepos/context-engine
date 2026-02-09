import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryBuilder } from './QueryBuilder.js'
import type { DatabaseDriver } from '../driver/types.js'
import { TableMetadata } from '../metadata/types.js'

describe('QueryBuilder advanced features', () => {
  let mockDb: DatabaseDriver
  let metadata: TableMetadata

  beforeEach(() => {
    mockDb = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({ results: [] }),
          first: vi.fn().mockResolvedValue({ count: 2, value: 42 }),
          run: vi.fn().mockResolvedValue({ success: true })
        })
      }),
      batch: vi.fn().mockResolvedValue([])
    } as any

    metadata = {
      name: 'users',
      columns: [{ name: 'id', type: 'INTEGER', primary: true }],
      relations: []
    }
  })

  it('supports join query', async () => {
    await new QueryBuilder<any>(mockDb, metadata)
      .leftJoin('profiles', 'profile', 'users.profile_id = profile.id')
      .execute()

    expect(mockDb.prepare).toHaveBeenCalledWith(
      'SELECT * FROM users LEFT JOIN profiles profile ON users.profile_id = profile.id'
    )
  })

  it('supports raw query', async () => {
    const qb = new QueryBuilder<any>(mockDb, metadata)
    await qb.raw('SELECT 1', [])

    expect(mockDb.prepare).toHaveBeenCalledWith('SELECT 1')
  })

  it('supports aggregate helpers', async () => {
    const qb = new QueryBuilder<any>(mockDb, metadata)
    const count = await qb.count()
    const sum = await qb.sum('id')

    expect(count).toBe(2)
    expect(sum).toBe(42)
  })

  it('supports batch insert with batch API', async () => {
    const qb = new QueryBuilder<any>(mockDb, metadata)
    await qb.batchInsert([{ id: 1 }, { id: 2 }])

    expect((mockDb.batch as any).mock.calls.length).toBe(1)
  })
})
