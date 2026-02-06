import { Injectable, Tool, ToolArg } from '@sker/core'
import { z } from 'zod'
import { MarketplaceApiService } from '../services/marketplace-api.service'

@Injectable()
export class SearchPluginsTool {
  constructor(private marketplaceApi: MarketplaceApiService) {}

  @Tool({
    name: 'search-plugins',
    description: 'Search plugins from marketplace'
  })
  async execute(
    @ToolArg({ zod: z.string().optional().describe('Search keyword'), paramName: 'q' })
    q?: string,
    @ToolArg({ zod: z.string().optional().describe('Category'), paramName: 'category' })
    category?: string,
    @ToolArg({ zod: z.string().optional().describe('Tag'), paramName: 'tag' })
    tag?: string,
    @ToolArg({ zod: z.enum(['newest', 'popular', 'rating']).optional().describe('Sort order'), paramName: 'sort' })
    sort?: 'newest' | 'popular' | 'rating'
  ) {
    const data = await this.marketplaceApi.listPlugins({
      ...(q ? { q } : {}),
      ...(category ? { category } : {}),
      ...(tag ? { tag } : {}),
      ...(sort ? { sort } : {})
    })

    return {
      success: true,
      data
    }
  }
}

