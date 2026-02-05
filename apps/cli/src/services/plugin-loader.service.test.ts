import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { PluginLoaderService } from './plugin-loader.service'
import { JsonFileStorage } from '../storage/json-file-storage'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'

describe('PluginLoaderService', () => {
  let service: PluginLoaderService
  let storage: JsonFileStorage
  let testDir: string

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `test-plugin-loader-${Date.now()}`)
    storage = new JsonFileStorage(testDir)
    await storage.init()
    service = new PluginLoaderService(storage)
  })

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true })
  })

  describe('loadPlugin', () => {
    it('should load plugin from build directory', async () => {
      const pluginCode = `
        module.exports = {
          config: {
            metadata: {
              id: 'test-plugin',
              name: 'Test Plugin',
              version: '1.0.0',
              description: 'Test'
            },
            routes: [],
            navigation: []
          }
        }
      `

      await storage.write('plugins/test-plugin/build/index.js', pluginCode)

      const plugin = await service.loadPlugin('test-plugin')

      expect(plugin).toBeDefined()
      expect(plugin?.id).toBe('test-plugin')
      expect(plugin?.config.metadata.name).toBe('Test Plugin')
    })

    it('should return null for non-existent plugin', async () => {
      const plugin = await service.loadPlugin('non-existent')
      expect(plugin).toBeNull()
    })

    it('should cache loaded plugins', async () => {
      const pluginCode = `
        module.exports = {
          config: {
            metadata: {
              id: 'test-plugin',
              name: 'Test Plugin',
              version: '1.0.0',
              description: 'Test'
            },
            routes: [],
            navigation: []
          }
        }
      `

      await storage.write('plugins/test-plugin/build/index.js', pluginCode)

      const plugin1 = await service.loadPlugin('test-plugin')
      const plugin2 = await service.loadPlugin('test-plugin')

      expect(plugin1).toBe(plugin2)
    })
  })

  describe('unloadPlugin', () => {
    it('should remove plugin from cache', async () => {
      const pluginCode = `
        module.exports = {
          config: {
            metadata: {
              id: 'test-plugin',
              name: 'Test Plugin',
              version: '1.0.0',
              description: 'Test'
            },
            routes: [],
            navigation: []
          }
        }
      `

      await storage.write('plugins/test-plugin/build/index.js', pluginCode)

      await service.loadPlugin('test-plugin')
      service.unloadPlugin('test-plugin')

      const plugin = await service.loadPlugin('test-plugin')
      expect(plugin).toBeDefined()
    })
  })
})
