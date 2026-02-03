import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import {
  ToolMetadataKey,
  ToolArgMetadataKey,
  ResourceMetadataKey,
  PromptMetadataKey,
  ToolMetadata,
  ToolArgMetadata,
  ResourceMetadata,
  PromptMetadata,
  Injector
} from '@sker/core';
import { renderComponent } from '../utils/render-component';
import { z } from 'zod';
import React from 'react';


export function createMcpServer(injector: Injector): McpServer {

  const server = new McpServer({
    name: 'sker-mcp-api',
    version: '1.0.0'
  });

  // 注册工具
  const tools = injector.get(ToolMetadataKey) || [];
  const toolArgs = injector.get(ToolArgMetadataKey) || [];

  tools.forEach((tool: ToolMetadata) => {
    const args = toolArgs.filter((a: ToolArgMetadata) =>
      a.target === tool.target && a.propertyKey === tool.propertyKey
    );

    const inputSchema: Record<string, z.ZodType> = {};
    args.forEach((arg: ToolArgMetadata) => {
      if (arg.paramName) {
        inputSchema[arg.paramName] = arg.zod;
      }
    });

    server.registerTool(tool.name, {
      description: tool.description,
      inputSchema: Object.keys(inputSchema).length > 0 ? inputSchema : undefined
    }, async (params: Record<string, unknown>): Promise<CallToolResult> => {
      const instance = injector.get<Record<string, unknown>>(tool.target);
      const method = instance[tool.propertyKey as string];
      if (typeof method === 'function') {
        return await (method as (args: Record<string, unknown>) => Promise<CallToolResult>).call(instance, params);
      }
      throw new Error(`Tool method not found: ${String(tool.propertyKey)}`);
    });
  });

  // 注册资源
  const resources = injector.get(ResourceMetadataKey) || [];

  resources.forEach((resource: ResourceMetadata) => {
    server.registerResource(resource.name, resource.uri, {
      description: resource.description,
      mimeType: resource.mimeType || 'text/markdown'
    }, async () => {
      const instance = injector.get<Record<string, unknown>>(resource.target);
      const method = instance[resource.propertyKey as string];
      if (typeof method === 'function') {
        const component = (method as () => React.ReactElement).call(instance);
        const markdown = renderComponent(() => component);

        return {
          contents: [{
            uri: resource.uri,
            mimeType: resource.mimeType || 'text/markdown',
            text: markdown
          }]
        };
      }
      throw new Error(`Resource method not found: ${String(resource.propertyKey)}`);
    });
  });

  // 注册 Prompts
  const prompts = injector.get(PromptMetadataKey) || [];

  prompts.forEach((prompt: PromptMetadata) => {
    const argsSchema: Record<string, z.ZodType> = {};

    if (prompt.arguments && Array.isArray(prompt.arguments)) {
      prompt.arguments.forEach((arg) => {
        argsSchema[arg.name] = z.string().describe(arg.description || '');
      });
    }

    server.registerPrompt(prompt.name, {
      description: prompt.description,
      argsSchema: Object.keys(argsSchema).length > 0 ? argsSchema : undefined
    }, async (params: Record<string, unknown>) => {
      const instance = injector.get<Record<string, unknown>>(prompt.target);
      const method = instance[prompt.propertyKey as string];
      if (typeof method === 'function') {
        const component = (method as (args: Record<string, unknown>) => React.ReactElement).call(instance, params);
        const markdown = renderComponent(() => component);

        return {
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: markdown
              }
            }
          ]
        };
      }
      throw new Error(`Prompt method not found: ${String(prompt.propertyKey)}`);
    });
  });

  return server;
}

// 会话管理 - 存储每个会话的 server 和 transport
const sessions = new Map<string, { server: McpServer; transport: WebStandardStreamableHTTPServerTransport }>();

// 为每个请求处理 MCP 请求，支持会话管理
export async function handleMcpRequest(injector: Injector, request: Request): Promise<Response> {
  const sessionId = request.headers.get('mcp-session-id');

  // 如果有 session ID 且存在对应的 transport，复用它
  if (sessionId && sessions.has(sessionId)) {
    const { transport } = sessions.get(sessionId)!;
    return transport.handleRequest(request);
  }

  // 创建新的 server 和 transport
  const server = createMcpServer(injector);

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: () => crypto.randomUUID(),
    onsessioninitialized: (id) => {
      sessions.set(id, { server, transport });
      console.log('[MCP] Session initialized:', id);
    },
    onsessionclosed: (id) => {
      sessions.delete(id);
      console.log('[MCP] Session closed:', id);
    },
    enableJsonResponse: false
  });

  // 连接 server 和 transport
  await server.connect(transport);

  // 处理请求
  return transport.handleRequest(request);
}
