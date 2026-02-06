import 'reflect-metadata'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import * as fs from 'fs/promises'
import * as os from 'os'
import * as path from 'path'
import { JsonFileStorage } from '../storage/json-file-storage'
import { PluginRegistryService } from '../services/plugin-registry.service'
import { InstallPluginTool } from './InstallPluginTool'
import { UninstallPluginTool } from './UninstallPluginTool'
import { UpdatePluginTool } from './UpdatePluginTool'
import { PublishVersionTool } from './PublishVersionTool'

class FakeMarketplaceApi {
  private installedVersion = '1.0.0'

  async installPlugin(_id: string, version?: string) {
    if (version) this.installedVersion = version
    return { installedVersion: this.installedVersion, changed: true }
  }

  async uninstallPlugin(id: string) {
    return { pluginId: id, removed: true }
  }

  async getPluginDetail(id: string) {
    return {
      id,
      name: 'Plugin One',
      description: 'Demo plugin',
      latestVersion: this.installedVersion
    }
  }

  async publishVersion(_id: string, input: { version: string }) {
    this.installedVersion = input.version
    return { id: 'ver-1', version: input.version }
  }
}

describe('Marketplace tools integration', () => {
  let tempDir: string
  let storage: JsonFileStorage
  let registry: PluginRegistryService
  let api: FakeMarketplaceApi

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sker-market-tools-'))
    storage = new JsonFileStorage(tempDir)
    await storage.init()
    registry = new PluginRegistryService(storage)
    await registry.init()
    api = new FakeMarketplaceApi()
  })

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  it('install-plugin should sync local plugin registry', async () => {
    const tool = new InstallPluginTool(api as any, registry)
    const result = await tool.execute('plugin-1')

    expect(result.success).toBe(true)
    const plugin = await registry.getPlugin('plugin-1')
    expect(plugin?.metadata.name).toBe('Plugin One')
    expect(plugin?.metadata.version).toBe('1.0.0')
  })

  it('update-plugin should replace plugin version in local registry', async () => {
    const installTool = new InstallPluginTool(api as any, registry)
    await installTool.execute('plugin-1', '1.0.0')

    const updateTool = new UpdatePluginTool(api as any, registry)
    const result = await updateTool.execute('plugin-1', '1.1.0')

    expect(result.success).toBe(true)
    const plugin = await registry.getPlugin('plugin-1')
    expect(plugin?.metadata.version).toBe('1.1.0')
  })

  it('uninstall-plugin should remove local plugin registry entry', async () => {
    const installTool = new InstallPluginTool(api as any, registry)
    await installTool.execute('plugin-1')

    const uninstallTool = new UninstallPluginTool(api as any, registry)
    const result = await uninstallTool.execute('plugin-1')

    expect(result.success).toBe(true)
    await expect(registry.getPlugin('plugin-1')).resolves.toBeNull()
  })

  it('publish-version should reject invalid semver', async () => {
    const tool = new PublishVersionTool(api as any)
    const result = await tool.execute('plugin-1', 'invalid', 'export const x = 1')

    expect(result.success).toBe(false)
    expect((result as any).code).toBe('marketplace.invalid_semver')
  })
})

