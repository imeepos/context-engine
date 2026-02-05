import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { PluginCompilerService } from './plugin-compiler.service'
import { JsonFileStorage } from '../storage/json-file-storage'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'

describe('PluginCompilerService', () => {
  let service: PluginCompilerService
  let storage: JsonFileStorage
  let testDir: string

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `test-plugin-compiler-${Date.now()}`)
    storage = new JsonFileStorage(testDir)
    await storage.init()
    service = new PluginCompilerService(storage)
  })

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true })
  })

  describe('buildPlugin', () => {
    it('should build plugin successfully', async () => {
      const pluginCode = `
        export const config = {
          metadata: {
            id: 'test-plugin',
            name: 'Test Plugin',
            version: '1.0.0',
            description: 'Test'
          },
          routes: [],
          navigation: []
        }
      `

      await storage.write('plugins/test-plugin/src/index.ts', pluginCode)

      const result = await service.buildPlugin('test-plugin')

      expect(result.success).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should return error when source file not found', async () => {
      const result = await service.buildPlugin('non-existent')

      expect(result.success).toBe(false)
      expect(result.error).toContain('not found')
    })
  })
})
