import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { PluginRegistryService } from './plugin-registry.service'
import { JsonFileStorage } from '../storage/json-file-storage'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'

describe('PluginRegistryService', () => {
  let service: PluginRegistryService
  let storage: JsonFileStorage
  let testDir: string

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `test-plugins-${Date.now()}`)
    storage = new JsonFileStorage(testDir)
    await storage.init()
    service = new PluginRegistryService(storage)
    await service.init()
  })

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true })
  })

  describe('registerPlugin', () => {
    it('should register a new plugin', async () => {
      const plugin = await service.registerPlugin({
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        description: 'A test plugin'
      })

      expect(plugin.id).toBe('test-plugin')
      expect(plugin.status).toBe('installed')
      expect(plugin.metadata.name).toBe('Test Plugin')
    })

    it('should throw error when registering duplicate plugin', async () => {
      await service.registerPlugin({
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        description: 'A test plugin'
      })

      await expect(
        service.registerPlugin({
          id: 'test-plugin',
          name: 'Test Plugin 2',
          version: '2.0.0',
          description: 'Another test plugin'
        })
      ).rejects.toThrow('Plugin test-plugin already registered')
    })
  })

  describe('getPlugin', () => {
    it('should return plugin by id', async () => {
      await service.registerPlugin({
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        description: 'A test plugin'
      })

      const plugin = await service.getPlugin('test-plugin')
      expect(plugin).toBeDefined()
      expect(plugin?.id).toBe('test-plugin')
    })

    it('should return null for non-existent plugin', async () => {
      const plugin = await service.getPlugin('non-existent')
      expect(plugin).toBeNull()
    })
  })

  describe('getAllPlugins', () => {
    it('should return all registered plugins', async () => {
      await service.registerPlugin({
        id: 'plugin-1',
        name: 'Plugin 1',
        version: '1.0.0',
        description: 'First plugin'
      })

      await service.registerPlugin({
        id: 'plugin-2',
        name: 'Plugin 2',
        version: '1.0.0',
        description: 'Second plugin'
      })

      const plugins = await service.getAllPlugins()
      expect(plugins).toHaveLength(2)
      expect(plugins.map(p => p.id)).toContain('plugin-1')
      expect(plugins.map(p => p.id)).toContain('plugin-2')
    })

    it('should return empty array when no plugins registered', async () => {
      const plugins = await service.getAllPlugins()
      expect(plugins).toEqual([])
    })
  })

  describe('unregisterPlugin', () => {
    it('should unregister an existing plugin', async () => {
      await service.registerPlugin({
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        description: 'A test plugin'
      })

      await service.unregisterPlugin('test-plugin')

      const plugin = await service.getPlugin('test-plugin')
      expect(plugin).toBeNull()
    })

    it('should throw error when unregistering non-existent plugin', async () => {
      await expect(
        service.unregisterPlugin('non-existent')
      ).rejects.toThrow('Plugin non-existent not found')
    })
  })

  describe('updatePluginStatus', () => {
    it('should update plugin status', async () => {
      await service.registerPlugin({
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        description: 'A test plugin'
      })

      await service.updatePluginStatus('test-plugin', 'developing')

      const plugin = await service.getPlugin('test-plugin')
      expect(plugin?.status).toBe('developing')
    })

    it('should throw error when updating non-existent plugin', async () => {
      await expect(
        service.updatePluginStatus('non-existent', 'developing')
      ).rejects.toThrow('Plugin non-existent not found')
    })
  })
})
