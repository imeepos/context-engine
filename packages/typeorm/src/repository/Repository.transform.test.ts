import { describe, expect, it, vi } from 'vitest'
import type { DatabaseDriver, SqlDialect } from '../driver/types.js'
import type { TableMetadata } from '../metadata/types.js'
import { Repository } from './Repository.js'

const mockDialect: SqlDialect = {
  
  buildUpsert({ table, columns, primaryColumn }) {
    const placeholders = columns.map(() => '?').join(', ')
    const updateClauses = columns
      .filter(column => column !== primaryColumn)
      .map(column => `${column} = excluded.${column}`)
      .join(', ')
    return `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders}) ON CONFLICT(${primaryColumn}) DO UPDATE SET ${updateClauses}`
  },
  beginTransaction() {
    return 'BEGIN TRANSACTION'
  }
}

describe('Repository transforms', () => {
  it('generates uuid for primary generated column on save', async () => {
    const run = vi.fn().mockResolvedValue({ success: true })
    const mockDb: DatabaseDriver = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({ results: [] }),
          first: vi.fn().mockResolvedValue(null),
          run
        })
      })
    } as any

    const metadata: TableMetadata = {
      name: 'sessions',
      columns: [
        { name: 'id', type: 'uuid', primary: true, generated: 'uuid' },
        { name: 'payload', type: 'json' }
      ],
      relations: []
    }

    const repo = new Repository<any>(mockDb, metadata, mockDialect)
    const saved = await repo.save({ payload: { x: 1 } })

    expect(typeof saved.id).toBe('string')
    expect(saved.id).toHaveLength(36)
  })

  it('serializes json for upsert bindings', async () => {
    const bind = vi.fn().mockReturnValue({ run: vi.fn().mockResolvedValue({ success: true }) })
    const mockDb: DatabaseDriver = {
      prepare: vi.fn().mockReturnValue({ bind })
    } as any

    const metadata: TableMetadata = {
      name: 'users',
      columns: [
        { name: 'id', type: 'INTEGER', primary: true },
        { name: 'profile', type: 'json' }
      ],
      relations: []
    }

    const repo = new Repository<any>(mockDb, metadata, mockDialect)
    await repo.upsert({ id: 1, profile: { role: 'admin' } })

    expect(bind).toHaveBeenCalledWith(1, '{"role":"admin"}')
  })
})
