import { describe, expect, it, vi } from 'vitest'
import { DataSource } from './DataSource.js'

describe('DataSource transaction', () => {
  it('runs commit flow', async () => {
    const run = vi.fn().mockResolvedValue({ success: true })
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({ run })
      })
    } as any

    const dataSource = new DataSource(mockDb)

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

    const dataSource = new DataSource(mockDb)

    await expect(
      dataSource.transaction(async () => {
        throw new Error('boom')
      })
    ).rejects.toThrow('boom')

    const sqls = (mockDb.prepare as any).mock.calls.map((call: any[]) => call[0])
    expect(sqls).toContain('ROLLBACK')
  })
})
