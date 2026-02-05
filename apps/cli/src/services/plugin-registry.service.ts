import { Inject, Injectable } from '@sker/core'
import { Storage, STORAGE_TOKEN } from '../storage/storage.interface'
import type { PluginMetadata } from '@sker/plugin-runtime'

export interface PluginRegistryEntry {
  id: string
  metadata: PluginMetadata
  status: 'developing' | 'testing' | 'built' | 'deployed' | 'installed'
  installedAt: number
}

interface PluginRegistry {
  plugins: Record<string, PluginRegistryEntry>
  version: number
}

@Injectable({ providedIn: 'auto' })
export class PluginRegistryService {
  private readonly STORAGE_KEY = 'plugins/registry'

  constructor(@Inject(STORAGE_TOKEN) private storage: Storage) {}

  async init(): Promise<void> {
    const registry = await this.storage.read<PluginRegistry>(this.STORAGE_KEY)
    if (!registry) {
      await this.storage.write(this.STORAGE_KEY, { plugins: {}, version: 0 })
    }
  }

  async registerPlugin(metadata: PluginMetadata): Promise<PluginRegistryEntry> {
    const registry = await this.getRegistry()

    if (registry.plugins[metadata.id]) {
      throw new Error(`Plugin ${metadata.id} already registered`)
    }

    const entry: PluginRegistryEntry = {
      id: metadata.id,
      metadata,
      status: 'installed',
      installedAt: Date.now()
    }

    registry.plugins[metadata.id] = entry
    registry.version++
    await this.storage.write(this.STORAGE_KEY, registry)

    return entry
  }

  async getPlugin(id: string): Promise<PluginRegistryEntry | null> {
    const registry = await this.getRegistry()
    return registry.plugins[id] || null
  }

  async getAllPlugins(): Promise<PluginRegistryEntry[]> {
    const registry = await this.getRegistry()
    return Object.values(registry.plugins)
  }

  async unregisterPlugin(id: string): Promise<void> {
    const registry = await this.getRegistry()

    if (!registry.plugins[id]) {
      throw new Error(`Plugin ${id} not found`)
    }

    delete registry.plugins[id]
    registry.version++
    await this.storage.write(this.STORAGE_KEY, registry)
  }

  async updatePluginStatus(
    id: string,
    status: PluginRegistryEntry['status']
  ): Promise<void> {
    const registry = await this.getRegistry()

    if (!registry.plugins[id]) {
      throw new Error(`Plugin ${id} not found`)
    }

    registry.plugins[id] = {
      ...registry.plugins[id],
      status
    }
    registry.version++
    await this.storage.write(this.STORAGE_KEY, registry)
  }

  private async getRegistry(): Promise<PluginRegistry> {
    const registry = await this.storage.read<PluginRegistry>(this.STORAGE_KEY)
    return registry || { plugins: {}, version: 0 }
  }
}
