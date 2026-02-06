import { Injectable, Tool, ToolArg } from '@sker/core'
import { z } from 'zod'
import { MarketplaceApiService } from '../services/marketplace-api.service'

@Injectable()
export class PublishVersionTool {
  constructor(private marketplaceApi: MarketplaceApiService) {}

  @Tool({
    name: 'publish-version',
    description: 'Publish a new version for existing plugin'
  })
  async execute(
    @ToolArg({ zod: z.string().min(1).describe('Plugin ID'), paramName: 'id' })
    id: string,
    @ToolArg({ zod: z.string().min(1).describe('Semver version'), paramName: 'version' })
    version: string,
    @ToolArg({ zod: z.string().min(1).describe('Plugin source code'), paramName: 'sourceCode' })
    sourceCode: string,
    @ToolArg({ zod: z.string().optional().describe('Schema'), paramName: 'schema' })
    schema?: string,
    @ToolArg({ zod: z.string().optional().describe('Changelog'), paramName: 'changelog' })
    changelog?: string
  ) {
    if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z-.]+)?(?:\+[0-9A-Za-z-.]+)?$/.test(version)) {
      return {
        success: false,
        code: 'marketplace.invalid_semver',
        message: `Invalid semver version: ${version}`
      }
    }

    const result = await this.marketplaceApi.publishVersion(id, {
      version,
      sourceCode,
      schema,
      changelog
    })

    return {
      success: true,
      data: result
    }
  }
}

