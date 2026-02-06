import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Injectable,
  Optional,
  Param,
  Post,
  Put,
  Query,
  RequirePermissions,
  UnauthorizedError,
} from '@sker/core';
import { z } from 'zod';
import { MarketplaceService } from '../services/marketplace.service';
import { AUTH_SESSION, type AuthSession } from '../auth/session.token';
import { errorResponse, successResponse } from '../utils/api-response';

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
    @Optional(AUTH_SESSION) private session?: AuthSession
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
      return successResponse(200, result);
    } catch (error) {
      return errorResponse(error);
    }
  }

  @Get('/:id')
  async getPluginDetail(@Param('id') id: string) {
    try {
      const result = await this.marketplaceService.getPluginDetail(id);
      return successResponse(200, result);
    } catch (error) {
      return errorResponse(error);
    }
  }

  @Post('/')
  @RequirePermissions({ roles: 'user' })
  async createPlugin(@Body(createPluginSchema) body: z.infer<typeof createPluginSchema>) {
    try {
      const session = this.requireSession();
      const created = await this.marketplaceService.createPlugin({
        ...body,
        authorId: session.user.id,
      });
      return successResponse(201, created);
    } catch (error) {
      return errorResponse(error);
    }
  }

  @Put('/:id')
  @RequirePermissions({ roles: 'user' })
  async updatePlugin(@Param('id') id: string, @Body(updatePluginSchema) body: z.infer<typeof updatePluginSchema>) {
    try {
      const session = this.requireSession();
      const result = await this.marketplaceService.updatePlugin({
        id,
        actorId: session.user.id,
        ...body,
      });
      return successResponse(200, result);
    } catch (error) {
      return errorResponse(error);
    }
  }

  @Post('/:id/versions')
  @RequirePermissions({ roles: 'user' })
  async createPluginVersion(@Param('id') id: string, @Body(createVersionSchema) body: z.infer<typeof createVersionSchema>) {
    try {
      const session = this.requireSession();
      const result = await this.marketplaceService.createPluginVersion({
        pluginId: id,
        actorId: session.user.id,
        ...body,
      });
      return successResponse(201, result);
    } catch (error) {
      return errorResponse(error);
    }
  }

  @Post('/:id/install')
  @RequirePermissions({ roles: 'user' })
  async installPlugin(@Param('id') id: string, @Query('version') version?: string) {
    try {
      const session = this.requireSession();
      const result = await this.marketplaceService.installPlugin({
        pluginId: id,
        userId: session.user.id,
        version,
      });
      return successResponse(200, result);
    } catch (error) {
      return errorResponse(error);
    }
  }

  @Delete('/:id/install')
  @RequirePermissions({ roles: 'user' })
  async uninstallPlugin(@Param('id') id: string) {
    try {
      const session = this.requireSession();
      const result = await this.marketplaceService.uninstallPlugin(id, session.user.id);
      if (!result.removed) {
        return new Response(null, { status: 204 });
      }
      return successResponse(200, result);
    } catch (error) {
      return errorResponse(error);
    }
  }

  @Get('/installed')
  @RequirePermissions({ roles: 'user' })
  async listInstalledPlugins() {
    try {
      const session = this.requireSession();
      const result = await this.marketplaceService.listInstalledPlugins(session.user.id);
      return successResponse(200, result);
    } catch (error) {
      return errorResponse(error);
    }
  }

  @Get('/published')
  @RequirePermissions({ roles: 'user' })
  async listPublishedPlugins() {
    try {
      const session = this.requireSession();
      const result = await this.marketplaceService.listPublishedPlugins(session.user.id);
      return successResponse(200, result);
    } catch (error) {
      return errorResponse(error);
    }
  }

  @Get('/updates')
  @RequirePermissions({ roles: 'user' })
  async checkPluginUpdates() {
    try {
      const session = this.requireSession();
      const result = await this.marketplaceService.checkPluginUpdates(session.user.id);
      return successResponse(200, result);
    } catch (error) {
      return errorResponse(error);
    }
  }

  @Post('/:id/reviews')
  @RequirePermissions({ roles: 'user' })
  async submitReview(@Param('id') id: string, @Body(reviewSchema) body: z.infer<typeof reviewSchema>) {
    try {
      const session = this.requireSession();
      const result = await this.marketplaceService.submitReview({
        pluginId: id,
        userId: session.user.id,
        rating: body.rating,
        feedback: body.feedback,
      });
      return successResponse(200, result);
    } catch (error) {
      return errorResponse(error);
    }
  }

  private requireSession() {
    if (!this.session) {
      throw new UnauthorizedError();
    }
    return this.session;
  }
}
