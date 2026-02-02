import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { EnvironmentInjector } from '@sker/core';
import { injectorMiddleware } from './middleware/injector';
import { ToolExecutor } from './mcp/tool-executor';
import { ResourceRenderer, MCP_RESOURCES } from './mcp/resource-renderer';
import { SSEStream } from './sse/stream';
import { PromptRendererService, PROMPT_ROUTES } from './services/prompt-renderer.service';
import { HelloPrompt } from './prompts/hello.prompt';
import { ApiDocsResource } from './resources/docs.resource';

// Import controllers to trigger decorators
import './controllers/mcp.controller';

const app = new Hono();

// Setup application injector
const appInjector = EnvironmentInjector.createApplicationInjector([
  { provide: ToolExecutor, useClass: ToolExecutor },
  { provide: MCP_RESOURCES, useValue: [
    { uri: 'docs://api', name: 'API Documentation', description: 'MCP API usage documentation', component: ApiDocsResource }
  ]},
  { provide: ResourceRenderer, useClass: ResourceRenderer },
  { provide: PROMPT_ROUTES, useValue: [
    { path: '/hello/:name', component: HelloPrompt, params: {} }
  ]},
  { provide: PromptRendererService, useClass: PromptRendererService }
]);

// Middleware
app.use('*', cors());
app.use('*', injectorMiddleware(appInjector));

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// MCP endpoints
app.post('/mcp/initialize', (c) => {
  return c.json({
    protocolVersion: '2024-11-05',
    capabilities: {
      tools: {},
      resources: {}
    },
    serverInfo: {
      name: 'sker-mcp-api',
      version: '1.0.0'
    }
  });
});

app.get('/mcp/tools/list', (c) => {
  const injector = c.get('injector');
  const executor = injector.get(ToolExecutor);
  const tools = executor.listTools();

  return c.json({ tools });
});

app.post('/mcp/tools/call', async (c) => {
  const { name, arguments: args } = await c.req.json();
  const injector = c.get('injector');
  const executor = injector.get(ToolExecutor);

  try {
    const result = await executor.executeTool(name, args, injector);
    return c.json(result);
  } catch (error) {
    return c.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

app.get('/mcp/resources/list', (c) => {
  const injector = c.get('injector');
  const renderer = injector.get(ResourceRenderer);
  const resources = renderer.listResources();

  return c.json({ resources });
});

app.post('/mcp/resources/read', async (c) => {
  const { uri } = await c.req.json();
  const injector = c.get('injector');
  const renderer = injector.get(ResourceRenderer);

  try {
    const result = await renderer.readResource(uri);
    return c.json(result);
  } catch (error) {
    return c.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 404);
  }
});

// Prompt rendering endpoint
app.get('/prompt/*', (c) => {
  const path = c.req.path.replace('/prompt', '');
  const injector = c.get('injector');
  const renderer = injector.get(PromptRendererService);

  try {
    const markdown = renderer.render(path);
    return c.text(markdown, 200, {
      'Content-Type': 'text/markdown'
    });
  } catch (error) {
    return c.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 404);
  }
});

// SSE endpoint for streaming tool execution
app.get('/mcp/tools/stream/:name', async (c) => {
  const name = c.req.param('name');
  const args = c.req.query();

  const stream = new SSEStream();
  const injector = c.get('injector');
  const executor = injector.get(ToolExecutor);

  // Execute tool and stream results
  (async () => {
    try {
      stream.send('start', { tool: name });
      const result = await executor.executeTool(name, args, injector);
      stream.send('result', result);
      stream.send('done', {});
    } catch (error) {
      stream.send('error', {
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      stream.close();
    }
  })();

  return c.body(stream.stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
});

export default app;
