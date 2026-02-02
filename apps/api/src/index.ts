import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { EnvironmentInjector } from '@sker/core';
import { injectorMiddleware } from './middleware/injector';
import { ToolExecutor } from './mcp/tool-executor';
import { ResourceRenderer } from './mcp/resource-renderer';
import { PromptService } from './services/prompt.service';
import { JsonRpcProcessor } from './mcp/json-rpc';

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
    { provide: ToolExecutor, useClass: ToolExecutor },
    { provide: ResourceRenderer, useClass: ResourceRenderer },
    { provide: PromptService, useClass: PromptService }
  ]);
  await appInjector.init();

  // Middleware
  app.use('*', cors());
  app.use('*', injectorMiddleware(appInjector));

  // Health check
  app.get('/health', (c) => {
    return c.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Unified JSON-RPC endpoint
  app.post('/mcp', async (c) => {
    const request = await c.req.json();
    const injector = c.get('injector');
    const processor = new JsonRpcProcessor();

    // Register MCP methods
    processor.register('initialize', async () => ({
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {},
        resources: {},
        prompts: {}
      },
      serverInfo: {
        name: 'sker-mcp-api',
        version: '1.0.0'
      }
    }));

    processor.register('tools/list', async () => {
      const executor = injector.get(ToolExecutor);
      return { tools: executor.listTools() };
    });

    processor.register('tools/call', async (params) => {
      const { name, arguments: args } = params;
      const executor = injector.get(ToolExecutor);
      const result = await executor.executeTool(name, args, injector);
      return result;
    });

    processor.register('resources/list', async () => {
      const renderer = injector.get(ResourceRenderer);
      return { resources: renderer.listResources() };
    });

    processor.register('resources/read', async (params) => {
      const { uri } = params;
      const renderer = injector.get(ResourceRenderer);
      return await renderer.readResource(uri);
    });

    processor.register('prompts/list', async () => {
      const promptService = injector.get(PromptService);
      return { prompts: promptService.listPrompts() };
    });

    processor.register('prompts/get', async (params) => {
      const { name, arguments: args } = params;
      const promptService = injector.get(PromptService);
      const messages = await promptService.getPrompt(name, args);
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: messages
            }
          }
        ]
      };
    });

    const response = await processor.process(request);
    return c.json(response);
  });

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
