import { Injectable, Tool, ToolArg } from '@sker/core'
import { z } from 'zod'
import { MarketplaceApiService } from '../services/marketplace-api.service'

@Injectable()
export class PublishPluginTool {
  constructor(private marketplaceApi: MarketplaceApiService) {}

  @Tool({
    name: 'publish-plugin',
    description: 'Publish a new plugin to marketplace'
  })
  async execute(
    @ToolArg({ zod: z.string().min(1).describe('Plugin slug'), paramName: 'slug' })
    slug: string,
    @ToolArg({ zod: z.string().min(1).describe('Plugin name'), paramName: 'name' })
    name: string,
    @ToolArg({ zod: z.string().min(1).describe('Semver version'), paramName: 'version' })
    version: string,
    @ToolArg({ zod: z.string().min(1).describe('Plugin source code'), paramName: 'sourceCode' })
    sourceCode: string,
    @ToolArg({ zod: z.string().optional().describe('Description'), paramName: 'description' })
    description?: string,
    @ToolArg({ zod: z.string().optional().describe('Category'), paramName: 'category' })
    category?: string,
    @ToolArg({ zod: z.array(z.string()).optional().describe('Tags'), paramName: 'tags' })
    tags?: string[],
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

    const result = await this.marketplaceApi.publishPlugin({
      slug,
      name,
      version,
      sourceCode,
      description,
      category,
      tags,
      schema,
      changelog
    })

    return {
      success: true,
      data: result
    }
  }
}

