import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { EnvironmentInjector } from '@sker/core';
import { injectorMiddleware } from './middleware/injector';
import { PromptService } from './services/prompt.service';
import { createMcpServer, createMcpTransport } from './mcp/server';

// Import services to trigger decorators
import './www/prompts/hello.prompt';
import './www/resources/docs.resource';
import './controllers/mcp.controller';

async function createApp() {
  const app = new Hono();

  // Setup platform and application injectors
  const platformInjector = EnvironmentInjector.createPlatformInjector([]);
  await platformInjector.init();
  const appInjector = EnvironmentInjector.createApplicationInjector([
    { provide: PromptService, useClass: PromptService }
  ]);
  await appInjector.init();

  // Create MCP server and transport
  const mcpServer = createMcpServer(appInjector);
  const mcpTransport = createMcpTransport();
  await mcpServer.connect(mcpTransport);

  // Middleware
  app.use('*', cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'mcp-session-id', 'Last-Event-ID', 'mcp-protocol-version'],
    exposeHeaders: ['mcp-session-id', 'mcp-protocol-version']
  }));
  app.use('*', injectorMiddleware(appInjector));

  // Health check
  app.get('/health', (c) => {
    return c.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // MCP SSE endpoint (requires Accept: text/event-stream)
  app.all('/mcp', (c) => mcpTransport.handleRequest(c.req.raw));

  return app;
}

// Create app instance at module level
let appInstance: Awaited<ReturnType<typeof createApp>> | null = null;

export default {
  async fetch(request: Request, env: any, ctx: any) {
    if (!appInstance) {
      appInstance = await createApp();
    }
    return appInstance.fetch(request, env, ctx);
  }
};
