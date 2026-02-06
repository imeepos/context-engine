import { Body, Controller, Delete, Get, Inject, Injectable, Param, Post, Put, Query, REQUEST } from '@sker/core';
import { z } from 'zod';
import { MarketplaceError, MarketplaceService } from '../services/marketplace.service';
import { AuthSessionError, getAuthSessionFromRequest } from '../auth/session-auth';
import { RequireAuthSession } from '../auth/require-auth.decorator';

const listPluginsQuerySchema = z.object({
  q: z.string().min(1).optional(),
  tag: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  sort: z.enum(['newest', 'popular', 'rating']).optional().default('newest'),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});

const createPluginSchema = z.object({
  slug: z.string().min(1).max(64),
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  category: z.string().min(1).max(50).optional(),
  tags: z.array(z.string().min(1).max(30)).max(20).optional(),
  version: z.string().min(1),
  sourceCode: z.string().min(1),
  schema: z.string().optional(),
  changelog: z.string().optional(),
});

const updatePluginSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).optional(),
  category: z.string().min(1).max(50).optional(),
  tags: z.array(z.string().min(1).max(30)).max(20).optional(),
  status: z.enum(['active', 'archived']).optional(),
});

const createVersionSchema = z.object({
  version: z.string().min(1),
  sourceCode: z.string().min(1),
  schema: z.string().optional(),
  changelog: z.string().optional(),
});

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  feedback: z.string().max(2000).optional(),
});

@Controller('/plugins')
@Injectable({ providedIn: 'auto' })
export class MarketplaceController {
  constructor(
    @Inject(MarketplaceService) private marketplaceService: MarketplaceService,
    @Inject(REQUEST) private request: Request
  ) {}

  @Get('/status')
  getStatus() {
    return {
      service: 'marketplace',
      status: 'ready',
    };
  }

  @Get('/')
  async listPlugins(@Query() query: Record<string, unknown>) {
    try {
      const validated = listPluginsQuerySchema.parse(query);
      const result = await this.marketplaceService.listPlugins(validated);
      return this.successResponse(200, result);
    } catch (error) {
      return this.errorResponse(error);
    }
  }

  @Get('/:id')
  async getPluginDetail(@Param('id') id: string) {
    try {
      const result = await this.marketplaceService.getPluginDetail(id);
      return this.successResponse(200, result);
    } catch (error) {
      return this.errorResponse(error);
    }
  }

  @Post('/')
  @RequireAuthSession()
  async createPlugin(@Body(createPluginSchema) body: z.infer<typeof createPluginSchema>) {
    try {
      const session = getAuthSessionFromRequest(this.request);
      const created = await this.marketplaceService.createPlugin({
        ...body,
        authorId: session.user.id,
      });
      return this.successResponse(201, created);
    } catch (error) {
      return this.errorResponse(error);
    }
  }

  @Put('/:id')
  @RequireAuthSession()
  async updatePlugin(@Param('id') id: string, @Body(updatePluginSchema) body: z.infer<typeof updatePluginSchema>) {
    try {
      const session = getAuthSessionFromRequest(this.request);
      const result = await this.marketplaceService.updatePlugin({
        id,
        actorId: session.user.id,
        ...body,
      });
      return this.successResponse(200, result);
    } catch (error) {
      return this.errorResponse(error);
    }
  }

  @Post('/:id/versions')
  @RequireAuthSession()
  async createPluginVersion(@Param('id') id: string, @Body(createVersionSchema) body: z.infer<typeof createVersionSchema>) {
    try {
      const session = getAuthSessionFromRequest(this.request);
      const result = await this.marketplaceService.createPluginVersion({
        pluginId: id,
        actorId: session.user.id,
        ...body,
      });
      return this.successResponse(201, result);
    } catch (error) {
      return this.errorResponse(error);
    }
  }

  @Post('/:id/install')
  @RequireAuthSession()
  async installPlugin(@Param('id') id: string, @Query('version') version?: string) {
    try {
      const session = getAuthSessionFromRequest(this.request);
      const result = await this.marketplaceService.installPlugin({
        pluginId: id,
        userId: session.user.id,
        version,
      });
      return this.successResponse(200, result);
    } catch (error) {
      return this.errorResponse(error);
    }
  }

  @Delete('/:id/install')
  @RequireAuthSession()
  async uninstallPlugin(@Param('id') id: string) {
    try {
      const session = getAuthSessionFromRequest(this.request);
      const result = await this.marketplaceService.uninstallPlugin(id, session.user.id);
      if (!result.removed) {
        return new Response(null, { status: 204 });
      }
      return this.successResponse(200, result);
    } catch (error) {
      return this.errorResponse(error);
    }
  }

  @Get('/installed')
  @RequireAuthSession()
  async listInstalledPlugins() {
    try {
      const session = getAuthSessionFromRequest(this.request);
      const result = await this.marketplaceService.listInstalledPlugins(session.user.id);
      return this.successResponse(200, result);
    } catch (error) {
      return this.errorResponse(error);
    }
  }

  @Get('/published')
  @RequireAuthSession()
  async listPublishedPlugins() {
    try {
      const session = getAuthSessionFromRequest(this.request);
      const result = await this.marketplaceService.listPublishedPlugins(session.user.id);
      return this.successResponse(200, result);
    } catch (error) {
      return this.errorResponse(error);
    }
  }

  @Get('/updates')
  @RequireAuthSession()
  async checkPluginUpdates() {
    try {
      const session = getAuthSessionFromRequest(this.request);
      const result = await this.marketplaceService.checkPluginUpdates(session.user.id);
      return this.successResponse(200, result);
    } catch (error) {
      return this.errorResponse(error);
    }
  }

  @Post('/:id/reviews')
  @RequireAuthSession()
  async submitReview(@Param('id') id: string, @Body(reviewSchema) body: z.infer<typeof reviewSchema>) {
    try {
      const session = getAuthSessionFromRequest(this.request);
      const result = await this.marketplaceService.submitReview({
        pluginId: id,
        userId: session.user.id,
        rating: body.rating,
        feedback: body.feedback,
      });
      return this.successResponse(200, result);
    } catch (error) {
      return this.errorResponse(error);
    }
  }

  private successResponse(status: number, data: unknown) {
    return new Response(
      JSON.stringify({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      }),
      {
        status,
        headers: { 'content-type': 'application/json' },
      }
    );
  }

  private errorResponse(error: unknown) {
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'validation.invalid_query',
            message: 'Invalid query parameters',
            details: error.issues,
          },
          timestamp: new Date().toISOString(),
        }),
        {
          status: 422,
          headers: { 'content-type': 'application/json' },
        }
      );
    }

    const knownError = error instanceof MarketplaceError || error instanceof AuthSessionError
      ? error
      : new MarketplaceError(
          500,
          'marketplace.internal_error',
          error instanceof Error ? error.message : 'Unexpected error'
        );

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: knownError.code,
          message: knownError.message,
        },
        timestamp: new Date().toISOString(),
      }),
      {
        status: knownError.status,
        headers: { 'content-type': 'application/json' },
      }
    );
  }
}
