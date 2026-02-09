import { describe, expect, it, vi } from 'vitest'
import { MysqlDriver } from './index.js'

describe('MysqlDriver', () => {
  it('maps run() result from execute header', async () => {
    const executor = {
      execute: vi.fn().mockResolvedValue([{ affectedRows: 2, insertId: 3 }, []]),
      query: vi.fn()
    }

    const driver = new MysqlDriver(executor)
    const result = await driver.prepare('UPDATE users SET name = ?').bind('a').run()

    expect(result).toEqual({ changes: 2, lastInsertId: 3 })
  })
})
