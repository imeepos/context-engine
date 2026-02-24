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
  RequirePermissions,
  UnauthorizedError,
} from '@sker/core';
import { z } from 'zod';
import { AUTH_SESSION, type AuthSession } from '../auth/session.token';
import { errorResponse, successResponse } from '../utils/api-response';
import type { ApiKeyPermission } from '../entities/api-key.entity';

const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  permissions: z.array(z.enum(['read', 'write', 'admin'])).min(1),
  expiresAt: z.string().datetime().optional(),
});

@Controller('/api-keys')
@Injectable({ providedIn: 'auto' })
export class ApiKeyController {
  constructor(
    @Optional(AUTH_SESSION) private session?: AuthSession
  ) {}

  /**
   * List all API keys for current user
   */
  @Get('/')
  @RequirePermissions({ roles: 'user' })
  async listApiKeys(env: Env) {
    try {
      const session = this.requireSession();
      const result = await env.DB
        .prepare(`
          SELECT id, name, permissions, expires_at, created_at, last_used_at, is_active
          FROM api_keys
          WHERE user_id = ?
          ORDER BY created_at DESC
        `)
        .bind(session.user.id)
        .all();

      // Mask sensitive data
      const keys = (result.results || []).map((key: any) => ({
        ...key,
        // Don't return the actual key for security
      }));

      return successResponse(200, { keys });
    } catch (error) {
      return errorResponse(error);
    }
  }

  /**
   * Create a new API key
   */
  @Post('/')
  @RequirePermissions({ roles: 'user' })
  async createApiKey(
    @Body(createApiKeySchema) body: z.infer<typeof createApiKeySchema>,
    env: Env
  ) {
    try {
      const session = this.requireSession();
      const id = crypto.randomUUID();

      // Generate secure API key: sker_<32 random chars>
      const randomBytes = new Uint8Array(24);
      crypto.getRandomValues(randomBytes);
      const keySuffix = Array.from(randomBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
        .slice(0, 32);
      const key = `sker_${keySuffix}`;

      // Hash the key for storage (we'll return the plain key only once)
      const keyHash = await this.hashKey(key);

      const now = new Date().toISOString();

      await env.DB
        .prepare(`
          INSERT INTO api_keys (id, user_id, key, name, permissions, expires_at, created_at, is_active)
          VALUES (?, ?, ?, ?, ?, ?, ?, 1)
        `)
        .bind(
          id,
          session.user.id,
          keyHash,
          body.name,
          JSON.stringify(body.permissions),
          body.expiresAt || null,
          now
        )
        .run();

      return successResponse(201, {
        id,
        name: body.name,
        key, // Return the plain key only once!
        permissions: body.permissions,
        expiresAt: body.expiresAt || null,
        createdAt: now,
        warning: 'Store this API key securely. It will not be shown again.',
      });
    } catch (error) {
      return errorResponse(error);
    }
  }

  /**
   * Delete/revoke an API key
   */
  @Delete('/:id')
  @RequirePermissions({ roles: 'user' })
  async deleteApiKey(@Param('id') id: string, env: Env) {
    try {
      const session = this.requireSession();

      const result = await env.DB
        .prepare('DELETE FROM api_keys WHERE id = ? AND user_id = ?')
        .bind(id, session.user.id)
        .run();

      if (result.meta.changes === 0) {
        return errorResponse(new Error('API key not found'));
      }

      return successResponse(200, { deleted: true });
    } catch (error) {
      return errorResponse(error);
    }
  }

  /**
   * Deactivate an API key without deleting
   */
  @Post('/:id/deactivate')
  @RequirePermissions({ roles: 'user' })
  async deactivateApiKey(@Param('id') id: string, env: Env) {
    try {
      const session = this.requireSession();

      const result = await env.DB
        .prepare('UPDATE api_keys SET is_active = 0 WHERE id = ? AND user_id = ?')
        .bind(id, session.user.id)
        .run();

      if (result.meta.changes === 0) {
        return errorResponse(new Error('API key not found'));
      }

      return successResponse(200, { deactivated: true });
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

  private async hashKey(key: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(key);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}
