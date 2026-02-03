import "reflect-metadata";
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createLogger, createPlatform } from '@sker/core';
import type { ExecutionContext } from 'hono';
import { AppModule } from './modules/app.module';
import { registerControllers } from './utils/register-controllers';
import * as pageController from './controllers/page.controller';

// Export Durable Object
export { McpSessionDurableObject } from './mcp/session-durable-object';

async function createApp() {
  const logger = createLogger('App');
  logger.log('Creating Hono app...');
  const app = new Hono<{ Bindings: Env }>();

  // Create platform and bootstrap application
  logger.log('Creating platform...');
  const platform = createPlatform();
  logger.log('Bootstrapping application...');
  const application = platform.bootstrapApplication();
  logger.log('Bootstrapping AppModule...');
  await application.bootstrap(AppModule);
  logger.log('AppModule bootstrapped successfully');

  // Middleware
  logger.log('Registering CORS middleware...');
  app.use('*', cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'mcp-session-id', 'Last-Event-ID', 'mcp-protocol-version'],
    exposeHeaders: ['mcp-session-id', 'mcp-protocol-version']
  }));
  logger.log('Registering injector middleware...');

  // Health check
  logger.log('Registering health check endpoint...');
  app.get('/health', (c) => {
    logger.log('Health check requested');
    return c.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // MCP endpoint - use Durable Object for session management
  logger.log('Registering MCP endpoint...');
  app.all('/mcp', async (c) => {
    logger.log('[MCP] Request received:', c.req.method, c.req.url);

    try {
      // Use Durable Object for persistent session management
      const id = c.env.MCP_SESSION.idFromName('mcp-session-id');

      const stub = c.env.MCP_SESSION.get(id);
      const response = await stub.fetch(c.req.raw);
      logger.log('[MCP] Response status:', response.status);
      return response;
    } catch (error) {
      logger.log('[MCP] Error:', error);
      throw error;
    }
  });

  // Auto-register all controllers
  logger.log('Auto-registering controllers...');
  registerControllers(app, application);
  logger.log('Controllers registered successfully');

  // Page routes (SSR with HTML/Markdown support)
  logger.log('Registering page routes...');
  app.get('/', pageController.renderHomePage);
  app.get('/docs/git', pageController.renderGitDocsPage);

  logger.log('App created successfully');
  return app;
}

// Create app instance at module level
const appInstance = createApp();
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    console.log('[Fetch] START - Incoming request:', request.method, new URL(request.url).pathname);
    const app = await appInstance;
    console.log('[Fetch] Forwarding request to Hono app...');
    const response = await app.fetch(request, env, ctx);
    console.log('[Fetch] Response status:', response.status);
    return response;
  }
};
