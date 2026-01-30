import 'reflect-metadata'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { JsonFileStorage } from './json-file-storage'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'

describe('JsonFileStorage', () => {
  let storage: JsonFileStorage
  let testDir: string

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `sker-test-${Date.now()}`)
    storage = new JsonFileStorage(testDir)
    await storage.init()
  })

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true })
  })

  describe('read', () => {
    it('returns null for non-existent key', async () => {
      const result = await storage.read('nonexistent')
      expect(result).toBeNull()
    })

    it('returns data for existing key', async () => {
      await storage.write('test', { value: 42 })
      const result = await storage.read<{ value: number }>('test')
      expect(result).toEqual({ value: 42 })
    })
  })

  describe('write', () => {
    it('creates file with data', async () => {
      await storage.write('test', { value: 42 })
      const exists = await storage.exists('test')
      expect(exists).toBe(true)
    })

    it('overwrites existing data', async () => {
      await storage.write('test', { value: 42 })
      await storage.write('test', { value: 100 })
      const result = await storage.read<{ value: number }>('test')
      expect(result).toEqual({ value: 100 })
    })
  })

  describe('delete', () => {
    it('removes existing file', async () => {
      await storage.write('test', { value: 42 })
      await storage.delete('test')
      const exists = await storage.exists('test')
      expect(exists).toBe(false)
    })

    it('does not throw for non-existent file', async () => {
      await expect(storage.delete('nonexistent')).resolves.not.toThrow()
    })
  })

  describe('exists', () => {
    it('returns true for existing file', async () => {
      await storage.write('test', { value: 42 })
      const exists = await storage.exists('test')
      expect(exists).toBe(true)
    })

    it('returns false for non-existent file', async () => {
      const exists = await storage.exists('nonexistent')
      expect(exists).toBe(false)
    })
  })

  describe('list', () => {
    it('returns empty array for empty directory', async () => {
      const files = await storage.list('messages/*')
      expect(files).toEqual([])
    })

    it('returns json files in directory', async () => {
      await storage.write('messages/agent-0', { messages: [] })
      await storage.write('messages/agent-1', { messages: [] })
      const files = await storage.list('messages/*')
      expect(files).toContain('agent-0.json')
      expect(files).toContain('agent-1.json')
    })
  })

  describe('watch', () => {
    it('triggers callback on file change', async () => {
      await storage.write('test', { value: 42 })

      return new Promise<void>((resolve) => {
        const unwatch = storage.watch('test', (data) => {
          expect(data).toEqual({ value: 100 })
          unwatch()
          resolve()
        })

        setTimeout(async () => {
          await storage.write('test', { value: 100 })
        }, 100)
      })
    }, 10000)

    it('stops watching after unwatch is called', async () => {
      await storage.write('test', { value: 42 })

      let callCount = 0
      const unwatch = storage.watch('test', () => {
        callCount++
      })

      await storage.write('test', { value: 100 })
      await new Promise(resolve => setTimeout(resolve, 200))

      unwatch()

      await storage.write('test', { value: 200 })
      await new Promise(resolve => setTimeout(resolve, 200))

      expect(callCount).toBe(1)
    })
  })
})
