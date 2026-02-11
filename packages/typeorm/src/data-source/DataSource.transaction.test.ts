import { describe, expect, it, vi } from 'vitest'
import { DataSource } from './DataSource.js'
import type { SqlDialect } from '../driver/types.js'

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

describe('DataSource transaction', () => {
  it('runs commit flow', async () => {
    const run = vi.fn().mockResolvedValue({ success: true })
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({ run })
      })
    } as any

    const dataSource = new DataSource(mockDb, mockDialect)

    await dataSource.transaction(async () => {
      return 'ok'
    })

    const sqls = (mockDb.prepare as any).mock.calls.map((call: any[]) => call[0])
    expect(sqls).toContain('BEGIN TRANSACTION')
    expect(sqls).toContain('COMMIT')
  })

  it('runs rollback flow on error', async () => {
    const run = vi.fn().mockResolvedValue({ success: true })
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({ run })
      })
    } as any

    const dataSource = new DataSource(mockDb, mockDialect)

    await expect(
      dataSource.transaction(async () => {
        throw new Error('boom')
      })
    ).rejects.toThrow('boom')

    const sqls = (mockDb.prepare as any).mock.calls.map((call: any[]) => call[0])
    expect(sqls).toContain('ROLLBACK')
  })
})
