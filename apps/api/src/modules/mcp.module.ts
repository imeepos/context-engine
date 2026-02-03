import { Module, APP_INITIALIZER, InjectionToken, Injector } from '@sker/core';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { createMcpServer, createMcpTransport } from '../mcp/server';

export const MCP_SERVER = new InjectionToken<McpServer>('MCP_SERVER');
export const MCP_TRANSPORT = new InjectionToken<WebStandardStreamableHTTPServerTransport>('MCP_TRANSPORT');

/**
 * McpModule - Application 层模块
 * 提供 MCP Server 和 Transport（应用级服务）
 */
@Module({
  providers: [
    {
      provide: MCP_SERVER,
      useFactory: (injector) => createMcpServer(injector),
      deps: [Injector]
    },
    {
      provide: MCP_TRANSPORT,
      useFactory: () => createMcpTransport()
    },
    {
      provide: APP_INITIALIZER,
      useFactory: (server: McpServer, transport: WebStandardStreamableHTTPServerTransport) => async () => {
        await server.connect(transport);
      },
      deps: [MCP_SERVER, MCP_TRANSPORT],
      multi: true
    }
  ],
  exports: [MCP_SERVER, MCP_TRANSPORT]
})
export class McpModule { }
