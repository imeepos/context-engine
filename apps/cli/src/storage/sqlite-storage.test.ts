import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { SqliteStorage } from './sqlite-storage'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const sqliteAvailable = (() => {
  try {
    const BetterSqlite3 = require('better-sqlite3')
    const db = new BetterSqlite3(':memory:')
    db.close()
    return true
  } catch {
    return false
  }
})()

describe.skipIf(!sqliteAvailable)('SqliteStorage', () => {
  let storage: SqliteStorage
  let testDir: string

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sker-sqlite-'))
    storage = new SqliteStorage(testDir, 'test.db')
    await storage.init()
  })

  afterEach(async () => {
    if (storage.close) {
      await storage.close()
    }
    await fs.rm(testDir, { recursive: true, force: true })
  })

  it('reads and writes key-value payloads', async () => {
    await storage.write('tasks', { version: 1, tasks: { a: { id: 'a' } } })
    const value = await storage.read<any>('tasks')
    expect(value?.version).toBe(1)
    expect(value?.tasks?.a?.id).toBe('a')
  })

  it('supports optimistic writeIfVersion', async () => {
    await storage.write('registry', { version: 0, value: 'a' })

    const success = await storage.writeIfVersion('registry', { version: 1, value: 'b' }, 0)
    expect(success).toBe(true)

    const failed = await storage.writeIfVersion('registry', { version: 2, value: 'c' }, 0)
    expect(failed).toBe(false)
  })

  it('writes file-backed keys to disk for plugin source code', async () => {
    await storage.write('plugins/demo/src/index.ts', 'export const x = 1')
    const exists = await storage.exists('plugins/demo/src/index.ts')
    expect(exists).toBe(true)
    const content = await storage.read<string>('plugins/demo/src/index.ts')
    expect(content).toContain('export const x = 1')
  })

  it('notifies watchers for kv changes', async () => {
    await storage.write('watch/key', { value: 1 })
    await new Promise<void>((resolve) => {
      const unwatch = storage.watch('watch/key', (data) => {
        if (data?.value === 2) {
          unwatch()
          resolve()
        }
      })

      setTimeout(async () => {
        await storage.write('watch/key', { value: 2 })
      }, 50)
    })
  })
})
