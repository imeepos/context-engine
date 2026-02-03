import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createPlatform } from '@sker/core';
import type { ExecutionContext } from 'hono';
import { injectorMiddleware } from './middleware/injector';
import { AppModule } from './modules/app.module';
import { MCP_TRANSPORT } from './modules/mcp.module';
import { GitController } from './controllers/git.controller';
import * as pageController from './controllers/page.controller';

async function createApp() {
  const app = new Hono();

  // Create platform and bootstrap application
  const platform = createPlatform();
  const application = platform.bootstrapApplication();
  await application.bootstrap(AppModule);


  // Middleware
  app.use('*', cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'mcp-session-id', 'Last-Event-ID', 'mcp-protocol-version'],
    exposeHeaders: ['mcp-session-id', 'mcp-protocol-version']
  }));
  app.use('*', injectorMiddleware(application.injector));

  // Health check
  app.get('/health', (c) => {
    return c.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // MCP SSE endpoint (requires Accept: text/event-stream)
  app.all('/mcp', (c) => {
    const mcpTransport = c.get('injector').get(MCP_TRANSPORT);
    return mcpTransport.handleRequest(c.req.raw);
  });

  // Git API routes
  app.post('/api/git/connect', async (c) => {
    const controller = c.get('injector').get(GitController);
    const body = await c.req.json();
    const result = await controller.connectRepository(body);
    return c.json({ success: true, data: result });
  });

  app.post('/api/git/sync/:connectionId', async (c) => {
    const controller = c.get('injector').get(GitController);
    const connectionId = c.req.param('connectionId');
    const result = await controller.syncRepository(connectionId);
    return c.json({ success: true, data: result });
  });

  app.get('/api/git/sync/:connectionId/status', async (c) => {
    const controller = c.get('injector').get(GitController);
    const connectionId = c.req.param('connectionId');
    const result = await controller.getSyncStatus(connectionId);
    return c.json({ success: true, data: result });
  });

  app.post('/api/git/webhook/:providerId', async (c) => {
    const controller = c.get('injector').get(GitController);
    const providerId = c.req.param('providerId');
    const payload = await c.req.json();
    const result = await controller.handleWebhook(providerId, payload);
    return c.json(result);
  });

  app.get('/api/git/connections/:repositoryId', async (c) => {
    const controller = c.get('injector').get(GitController);
    const repositoryId = c.req.param('repositoryId');
    const result = await controller.getConnections(repositoryId);
    return c.json({ success: true, data: result });
  });

  // Page routes (SSR with HTML/Markdown support)
  app.get('/', pageController.renderHomePage);
  app.get('/docs/git', pageController.renderGitDocsPage);

  return app;
}

// Create app instance at module level
let appInstance: Awaited<ReturnType<typeof createApp>> | null = null;

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    if (!appInstance) {
      appInstance = await createApp();
    }
    return appInstance.fetch(request, env, ctx);
  }
};
