import { Injectable, Tool, ToolArg } from '@sker/core'
import { z } from 'zod'
import { MarketplaceApiService } from '../services/marketplace-api.service'
import { PluginRegistryService } from '../services/plugin-registry.service'

@Injectable()
export class InstallPluginTool {
  constructor(
    private marketplaceApi: MarketplaceApiService,
    private pluginRegistry: PluginRegistryService
  ) {}

  @Tool({
    name: 'install-plugin',
    description: 'Install plugin from marketplace'
  })
  async execute(
    @ToolArg({ zod: z.string().min(1).describe('Plugin ID'), paramName: 'id' })
    id: string,
    @ToolArg({ zod: z.string().optional().describe('Version to install'), paramName: 'version' })
    version?: string
  ) {
    const installResult = await this.marketplaceApi.installPlugin(id, version)
    const detail = await this.marketplaceApi.getPluginDetail(id)

    const metadata = {
      id,
      name: String(detail.name ?? id),
      version: String((installResult as any).installedVersion ?? detail.latestVersion ?? version ?? 'unknown'),
      description: String(detail.description ?? '')
    }

    const existing = await this.pluginRegistry.getPlugin(id)
    if (existing) {
      await this.pluginRegistry.unregisterPlugin(id)
    }
    await this.pluginRegistry.registerPlugin(metadata)

    return {
      success: true,
      pluginId: id,
      installedVersion: metadata.version,
      remote: installResult
    }
  }
}

