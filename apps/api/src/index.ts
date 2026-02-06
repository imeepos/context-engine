import "reflect-metadata";
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createLogger, createPlatform, LoggerLevel } from '@sker/core';
import type { ExecutionContext } from 'hono';
import { AppModule } from './modules/app.module';
import { registerControllers } from './utils/register-controllers';
import { resolveApiLoggerLevel } from './logging/api-log-level';
import { createAuth } from './auth/better-auth.config';

// Export Durable Object
export { McpSessionDurableObject } from './mcp/session-durable-object';

async function createApp(loggerLevel: LoggerLevel) {
  const logger = createLogger('App', loggerLevel);
  logger.debug('Creating Hono app...');
  const app = new Hono<{ Bindings: Env }>();

  // Create platform and bootstrap application
  logger.debug('Creating platform...');
  const platform = createPlatform();
  logger.debug('Bootstrapping application...');
  const application = platform.bootstrapApplication();
  logger.debug('Bootstrapping AppModule...');
  await application.bootstrap(AppModule);
  logger.debug('AppModule bootstrapped successfully');

  // Middleware
  logger.debug('Registering CORS middleware...');
  app.use('*', cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'mcp-session-id', 'Last-Event-ID', 'mcp-protocol-version'],
    exposeHeaders: ['mcp-session-id', 'mcp-protocol-version']
  }));
  logger.debug('Registering injector middleware...');

  // Health check
  logger.debug('Registering health check endpoint...');
  app.get('/health', (c) => {
    return c.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Better Auth endpoints
  app.all('/api/auth/*', async (c) => {
    const auth = createAuth(c.env.DB, {
      baseURL: c.env.SITE_URL,
      secret: c.env.BETTER_AUTH_SECRET,
    });
    return auth.handler(c.req.raw);
  });

  // MCP endpoint - use Durable Object for session management
  logger.debug('Registering MCP endpoint...');
  app.all('/mcp', async (c) => {
    logger.debug('[MCP] Request received:', c.req.method, c.req.url);

    try {
      // Use Durable Object for persistent session management
      const id = c.env.MCP_SESSION.idFromName('mcp-session-id');

      const stub = c.env.MCP_SESSION.get(id);
      const response = await stub.fetch(c.req.raw);
      logger.debug('[MCP] Response status:', response.status);
      return response;
    } catch (error) {
      logger.error('[MCP] Error:', error);
      throw error;
    }
  });

  // Auto-register all controllers
  logger.debug('Auto-registering controllers...');
  registerControllers(app, application, loggerLevel);
  logger.debug('Controllers registered successfully');

  logger.debug('App created successfully');
  return app;
}

let appInstance: Promise<Hono<{ Bindings: Env }>> | null = null;
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const loggerLevel = resolveApiLoggerLevel(env.APP_LOG_LEVEL);
    const logger = createLogger('Request', loggerLevel);
    if (!appInstance) {
      appInstance = createApp(loggerLevel);
    }

    const url = new URL(request.url);
    const start = Date.now();
    try {
      const app = await appInstance;
      const response = await app.fetch(request, env, ctx);
      logger.log(`${request.method} ${url.pathname} -> ${response.status} (${Date.now() - start}ms)`);
      return response;
    } catch (error) {
      logger.error(`${request.method} ${url.pathname} -> 500 (${Date.now() - start}ms)`, error);
      throw error;
    }
  }
};
