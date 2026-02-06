import { Injectable, Tool, ToolArg } from '@sker/core'
import { z } from 'zod'
import { MarketplaceApiService } from '../services/marketplace-api.service'
import { PluginRegistryService } from '../services/plugin-registry.service'

@Injectable()
export class UninstallPluginTool {
  constructor(
    private marketplaceApi: MarketplaceApiService,
    private pluginRegistry: PluginRegistryService
  ) {}

  @Tool({
    name: 'uninstall-plugin',
    description: 'Uninstall plugin'
  })
  async execute(
    @ToolArg({ zod: z.string().min(1).describe('Plugin ID'), paramName: 'id' })
    id: string
  ) {
    const remote = await this.marketplaceApi.uninstallPlugin(id)
    const existing = await this.pluginRegistry.getPlugin(id)
    if (existing) {
      await this.pluginRegistry.unregisterPlugin(id)
    }

    return {
      success: true,
      pluginId: id,
      removedLocal: Boolean(existing),
      remote
    }
  }
}

