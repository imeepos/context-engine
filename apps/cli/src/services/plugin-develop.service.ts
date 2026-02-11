import { Inject, Injectable } from '@sker/core'
import { Storage, STORAGE_TOKEN } from '../storage/storage.interface'
import { PluginRegistryService } from './plugin-registry.service'
import { PluginCompilerService, BuildResult } from './plugin-compiler.service'
import type { PluginMetadata } from '@sker/plugin/runtime'

@Injectable({ providedIn: 'auto' })
export class PluginDevelopService {
  constructor(
    @Inject(STORAGE_TOKEN) private storage: Storage,
    private registryService: PluginRegistryService,
    private compilerService: PluginCompilerService
  ) {}

  async createPlugin(metadata: PluginMetadata): Promise<{ id: string; status: string }> {
    await this.registryService.registerPlugin(metadata)
    await this.registryService.updatePluginStatus(metadata.id, 'developing')

    const indexTemplate = `
export const config = {
  metadata: {
    id: '${metadata.id}',
    name: '${metadata.name}',
    version: '${metadata.version}',
    description: '${metadata.description}'
  },
  routes: [],
  navigation: []
}
`

    await this.storage.write(`plugins/${metadata.id}/src/index.ts`, indexTemplate.trim())

    return {
      id: metadata.id,
      status: 'developing'
    }
  }

  async savePageCode(pluginId: string, path: string, code: string): Promise<void> {
    const fileName = path.replace(/^\//, '').replace(/\//g, '-')
    const filePath = `plugins/${pluginId}/src/pages/${fileName}.tsx`
    await this.storage.write(filePath, code)
  }

  async buildPlugin(pluginId: string): Promise<BuildResult> {
    const result = await this.compilerService.buildPlugin(pluginId)

    if (result.success) {
      await this.registryService.updatePluginStatus(pluginId, 'built')
    }

    return result
  }
}

