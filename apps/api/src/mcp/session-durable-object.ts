import { DurableObject } from 'cloudflare:workers'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { createMcpServer } from './server'
import { getPlatformInjector, PlatformRef } from '@sker/core'
import { AppModule } from '../modules/app.module'

export class McpSessionDurableObject extends DurableObject<Env> {
  private server: McpServer | null = null
  private transport: WebStandardStreamableHTTPServerTransport | null = null

  async fetch(request: Request): Promise<Response> {
    // 首次请求时初始化 server 和 transport
    if (!this.server) {
      // 在 Durable Object 内部创建 injector
      const platformInjector = getPlatformInjector()
      const platform = platformInjector.get(PlatformRef)
      const application = platform.bootstrapApplication()
      await application.bootstrap(AppModule)

      this.server = createMcpServer(application.injector)

      this.transport = new WebStandardStreamableHTTPServerTransport({
        sessionIdGenerator: () => this.ctx.id.toString(),
        onsessioninitialized: (id) => {
          console.log('[MCP DO] Session initialized:', id)
        },
        onsessionclosed: (id) => {
          console.log('[MCP DO] Session closed:', id)
        },
        enableJsonResponse: false
      })

      await this.server.connect(this.transport)
    }

    // 处理 MCP 请求
    return this.transport!.handleRequest(request)
  }
}
