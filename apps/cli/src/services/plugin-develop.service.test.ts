import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { PluginDevelopService } from './plugin-develop.service'
import { PluginRegistryService } from './plugin-registry.service'
import { PluginCompilerService } from './plugin-compiler.service'
import { JsonFileStorage } from '../storage/json-file-storage'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'

describe('PluginDevelopService', () => {
  let service: PluginDevelopService
  let registryService: PluginRegistryService
  let compilerService: PluginCompilerService
  let storage: JsonFileStorage
  let testDir: string

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `test-plugin-develop-${Date.now()}`)
    storage = new JsonFileStorage(testDir)
    await storage.init()
    registryService = new PluginRegistryService(storage)
    await registryService.init()
    compilerService = new PluginCompilerService(storage)
    service = new PluginDevelopService(storage, registryService, compilerService)
  })

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true })
  })

  describe('createPlugin', () => {
    it('should create a new plugin with initial structure', async () => {
      const plugin = await service.createPlugin({
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        description: 'A test plugin'
      })

      expect(plugin.id).toBe('test-plugin')
      expect(plugin.status).toBe('developing')
    })
  })

  describe('savePageCode', () => {
    it('should save page code to plugin directory', async () => {
      await service.createPlugin({
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        description: 'Test'
      })

      await service.savePageCode('test-plugin', '/home', 'export default function HomePage() {}')

      const code = await storage.read<string>('plugins/test-plugin/src/pages/home.tsx')
      expect(code).toContain('HomePage')
    })
  })

  describe('buildPlugin', () => {
    it('should build plugin and update status', async () => {
      await service.createPlugin({
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        description: 'Test'
      })

      const indexCode = `
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
      await storage.write('plugins/test-plugin/src/index.ts', indexCode)

      const result = await service.buildPlugin('test-plugin')

      expect(result.success).toBe(true)
    })
  })
})
