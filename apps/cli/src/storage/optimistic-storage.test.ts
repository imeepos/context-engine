import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { JsonFileStorage } from './json-file-storage'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'

describe('JsonFileStorage - Optimistic Locking', () => {
  let storage: JsonFileStorage
  let testDir: string

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `test-storage-${Date.now()}`)
    storage = new JsonFileStorage(testDir)
    await storage.init()
  })

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true })
  })

  it('should write data when version matches', async () => {
    const data = { version: 0, value: 'initial' }
    await storage.write('test', data)

    const updated = { version: 1, value: 'updated' }
    const success = await storage.writeIfVersion('test', updated, 0)

    expect(success).toBe(true)
    const result = await storage.read<typeof updated>('test')
    expect(result?.version).toBe(1)
    expect(result?.value).toBe('updated')
  })

  it('should fail to write when version does not match', async () => {
    const data = { version: 0, value: 'initial' }
    await storage.write('test', data)

    const updated = { version: 1, value: 'updated' }
    const success = await storage.writeIfVersion('test', updated, 5)

    expect(success).toBe(false)
    const result = await storage.read<typeof data>('test')
    expect(result?.version).toBe(0)
    expect(result?.value).toBe('initial')
  })

  it('should handle concurrent writes with version conflicts', async () => {
    const initial = { version: 0, value: 'initial' }
    await storage.write('test', initial)

    const update1 = { version: 1, value: 'update1' }
    const update2 = { version: 1, value: 'update2' }

    const [success1, success2] = await Promise.all([
      storage.writeIfVersion('test', update1, 0),
      storage.writeIfVersion('test', update2, 0)
    ])

    expect(success1 !== success2).toBe(true)
    const result = await storage.read<typeof update1>('test')
    expect(result?.version).toBe(1)
    expect(['update1', 'update2']).toContain(result?.value)
  })

  it('should create file when version is 0 and file does not exist', async () => {
    const data = { version: 0, value: 'new' }
    const success = await storage.writeIfVersion('new-file', data, 0)

    expect(success).toBe(true)
    const result = await storage.read<typeof data>('new-file')
    expect(result?.version).toBe(0)
    expect(result?.value).toBe('new')
  })
})
