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
    await storage.write('registry', { version: 1, tasks: { a: { id: 'a' } } })
    const value = await storage.read<any>('registry')
    expect(value?.version).toBe(1)
    expect(value?.tasks?.a?.id).toBe('a')
  })

  it('creates and tracks schema via migrations table', async () => {
    const migrationRows = await (storage as any).driver
      .prepare('SELECT name, timestamp FROM migrations ORDER BY timestamp ASC')
      .bind()
      .all()
    const rows = Array.isArray(migrationRows) ? migrationRows : (migrationRows.results || [])

    expect(rows.length).toBeGreaterThan(0)
    expect(rows[0]?.name).toBe('InitStorageSchema')
  })

  it('does not re-run migration on repeated init', async () => {
    const beforeRaw = await (storage as any).driver
      .prepare('SELECT COUNT(1) as count FROM migrations')
      .bind()
      .first()
    const before = beforeRaw?.count ?? 0

    await storage.init()

    const afterRaw = await (storage as any).driver
      .prepare('SELECT COUNT(1) as count FROM migrations')
      .bind()
      .first()
    const after = afterRaw?.count ?? 0

    expect(after).toBe(before)
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

  it('reads and writes agents via structured tables', async () => {
    await storage.write('agents', {
      agents: {
        'agent-1': {
          id: 'agent-1',
          pid: 1234,
          startTime: 1000,
          lastHeartbeat: 2000,
          status: 'online'
        }
      },
      nextId: 2
    })

    const value = await storage.read<any>('agents')
    expect(value?.nextId).toBe(2)
    expect(value?.agents?.['agent-1']?.lastHeartbeat).toBe(2000)
  })

  it('reads and writes tasks via structured tables with dependencies', async () => {
    const now = Date.now()
    await storage.write('tasks', {
      version: 3,
      tasks: {
        task1: {
          id: 'task1',
          parentId: null,
          title: 'Task 1',
          description: 'Desc 1',
          version: 1,
          status: 'pending',
          assignedTo: null,
          createdBy: 'agent-1',
          createdAt: now,
          updatedAt: now,
          claimedAt: null,
          completedAt: null,
          dependencies: ['dep-a', 'dep-b'],
          metadata: { priority: 'high' }
        }
      }
    })

    const value = await storage.read<any>('tasks')
    expect(value?.version).toBe(3)
    expect(value?.tasks?.task1?.dependencies).toEqual(['dep-a', 'dep-b'])
    expect(value?.tasks?.task1?.metadata?.priority).toBe('high')
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
