import { describe, expect, it, vi } from 'vitest'
import { SqliteDriver } from './index.js'

describe('SqliteDriver', () => {
  it('returns rows from all()', async () => {
    const statement = {
      all: vi.fn().mockReturnValue([{ id: 1 }]),
      get: vi.fn().mockReturnValue({ id: 1 }),
      run: vi.fn().mockReturnValue({ changes: 1, lastInsertRowid: 1 })
    }
    const db = {
      prepare: vi.fn().mockReturnValue(statement),
      exec: vi.fn(),
      close: vi.fn()
    }

    const driver = new SqliteDriver(db)
    const rows = await driver.prepare('SELECT * FROM users').bind().all()

    expect(rows).toEqual([{ id: 1 }])
  })
})
