import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DatabaseDriver } from '../driver/types.js'
import type { TableMetadata } from '../metadata/types.js'
import { QueryBuilder } from './QueryBuilder.js'

describe('QueryBuilder transforms', () => {
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
        { name: 'isActive', type: 'boolean' },
        { name: 'profile', type: 'json' }
      ],
      relations: []
    }
  })

  it('serializes boolean/json in where clause', async () => {
    const qb = new QueryBuilder<any>(mockDb, metadata)
    await qb.where({ isActive: true, profile: { role: 'admin' } }).execute()

    const prepare = mockDb.prepare as any
    expect(prepare).toHaveBeenCalledWith('SELECT * FROM users WHERE isActive = ? AND profile = ?')
    expect(prepare().bind).toHaveBeenCalledWith(1, '{"role":"admin"}')
  })

  it('deserializes boolean/json from result rows', async () => {
    mockDb.prepare = vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnValue({
        all: vi.fn().mockResolvedValue({
          results: [{ id: 1, isActive: 1, profile: '{"role":"admin"}' }]
        })
      })
    }) as any

    const qb = new QueryBuilder<any>(mockDb, metadata)
    const rows = await qb.execute()

    expect(rows[0]?.isActive).toBe(true)
    expect(rows[0]?.profile).toEqual({ role: 'admin' })
  })
})
