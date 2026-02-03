import "reflect-metadata";
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createLogger, createPlatform, EnvironmentInjector } from '@sker/core';
import type { ExecutionContext } from 'hono';
import { AppModule } from './modules/app.module';
import { MCP_TRANSPORT } from './modules/mcp.module';
import { registerControllers } from './utils/register-controllers';
import * as pageController from './controllers/page.controller';

async function createApp() {
  const logger = createLogger('App');
  logger.log('Creating Hono app...');
  const app = new Hono();

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

  // MCP SSE endpoint (requires Accept: text/event-stream)
  logger.log('Registering MCP endpoint...');
  app.all('/mcp', (c) => {
    const mcpTransport = application.injector.get(MCP_TRANSPORT);
    return mcpTransport.handleRequest(c.req.raw);
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
