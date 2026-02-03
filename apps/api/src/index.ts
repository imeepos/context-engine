import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createPlatform } from '@sker/core';
import type { ExecutionContext } from 'hono';
import { injectorMiddleware } from './middleware/injector';
import { AppModule } from './modules/app.module';
import { MCP_TRANSPORT } from './modules/mcp.module';

// Import services to trigger decorators
import './www/prompts/hello.prompt';
import './www/resources/docs.resource';
import './controllers/mcp.controller';

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
