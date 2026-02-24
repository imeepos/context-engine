import { Context, Next } from 'hono';
import { createLogger } from '@sker/core';

const logger = createLogger('ApiKeyAuth');

export interface ApiKeyPayload {
  id: string;
  userId: string;
  name: string;
  permissions: string[];
  expiresAt: Date | null;
}

/**
 * Validate API Key format
 */
export function isValidApiKeyFormat(key: string): boolean {
  // API Key format: sker_<32 alphanumeric chars>
  return /^sker_[a-zA-Z0-9]{32}$/.test(key);
}

/**
 * Extract API Key from request
 */
export function extractApiKey(c: Context): string | null {
  // 1. Check Authorization header: Bearer <api_key>
  const authHeader = c.req.header('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }

  // 2. Check X-API-Key header
  const apiKeyHeader = c.req.header('X-API-Key');
  if (apiKeyHeader) {
    return apiKeyHeader.trim();
  }

  // 3. Check query parameter
  const queryKey = c.req.query('api_key');
  if (queryKey) {
    return queryKey.trim();
  }

  return null;
}

/**
 * Create API Key authentication middleware
 *
 * This middleware checks for API Key in:
 * 1. Authorization: Bearer <api_key>
 * 2. X-API-Key header
 * 3. api_key query parameter
 */
export function createApiKeyAuthMiddleware(db: D1Database) {
  return async (c: Context, next: Next) => {
    const apiKey = extractApiKey(c);

    if (!apiKey) {
      // No API key provided, continue without authentication
      return next();
    }

    if (!isValidApiKeyFormat(apiKey)) {
      logger.warn('Invalid API key format');
      return c.json({ error: 'Invalid API key format' }, 401);
    }

    try {
      // Query API key from database
      const result = await db
        .prepare(`
          SELECT id, user_id, key, name, permissions, expires_at, is_active
          FROM api_keys
          WHERE key = ? AND is_active = 1
        `)
        .bind(apiKey)
        .first<{
          id: string;
          user_id: string;
          key: string;
          name: string;
          permissions: string;
          expires_at: string | null;
          is_active: number;
        }>();

      if (!result) {
        logger.warn('API key not found or inactive');
        return c.json({ error: 'Invalid API key' }, 401);
      }

      // Check expiration
      if (result.expires_at) {
        const expiresAt = new Date(result.expires_at);
        if (expiresAt < new Date()) {
          logger.warn('API key expired');
          return c.json({ error: 'API key expired' }, 401);
        }
      }

      // Update last_used_at
      await db
        .prepare('UPDATE api_keys SET last_used_at = ? WHERE id = ?')
        .bind(new Date().toISOString(), result.id)
        .run();

      // Parse permissions
      const permissions = result.permissions ? JSON.parse(result.permissions) : [];

      // Set API key payload in context
      const payload: ApiKeyPayload = {
        id: result.id,
        userId: result.user_id,
        name: result.name,
        permissions,
        expiresAt: result.expires_at ? new Date(result.expires_at) : null,
      };

      c.set('apiKeyPayload', payload);
      logger.debug(`API key authenticated for user: ${payload.userId}`);
    } catch (error) {
      logger.error('API key validation error:', error);
      return c.json({ error: 'Authentication failed' }, 500);
    }

    return next();
  };
}

/**
 * Check if request has API key authentication
 */
export function hasApiKeyAuth(c: Context): boolean {
  return !!c.get('apiKeyPayload');
}

/**
 * Get API key payload from context
 */
export function getApiKeyPayload(c: Context): ApiKeyPayload | undefined {
  return c.get('apiKeyPayload');
}
