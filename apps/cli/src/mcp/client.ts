import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import { Injectable, Inject } from '@sker/core'
import { MCP_CLIENT_CONFIG } from '../tokens'
import { McpConnectionState } from './types'
import type {
  IMcpClient,
  McpClientConfig
} from './types'
import type { Tool, Resource, Prompt, CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import {
  McpConnectionError,
  McpToolExecutionError,
  McpTimeoutError,
  handleMcpError
} from './errors'

@Injectable()
export class McpClient implements IMcpClient {
  private client: Client | null = null
  private transport: SSEClientTransport | null = null
  private state: McpConnectionState = McpConnectionState.DISCONNECTED
  private reconnectTimer: NodeJS.Timeout | null = null

  private toolsCache: Tool[] | null = null
  private resourcesCache: Resource[] | null = null
  private promptsCache: Prompt[] | null = null

  constructor(
    @Inject(MCP_CLIENT_CONFIG) private config: McpClientConfig
  ) {}

  async connect(): Promise<void> {
    if (this.state === McpConnectionState.CONNECTED) {
      return
    }

    this.state = McpConnectionState.CONNECTING

    try {
      this.transport = new SSEClientTransport(
        new URL('/mcp', this.config.baseUrl)
      )

      this.client = new Client({
        name: 'sker-cli',
        version: '0.1.0'
      }, {
        capabilities: {}
      })

      await this.client.connect(this.transport)

      this.state = McpConnectionState.CONNECTED

      await this.loadTools()

      console.log('✓ 已连接到远程 MCP 服务器:', this.config.baseUrl)
    } catch (error) {
      this.state = McpConnectionState.ERROR
      const mcpError = handleMcpError(error)

      this.scheduleReconnect()
      throw new McpConnectionError(
        `连接 MCP 服务器失败: ${mcpError.message}`,
        mcpError
      )
    }
  }

  async disconnect(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (this.client) {
      await this.client.close()
      this.client = null
    }

    this.transport = null
    this.state = McpConnectionState.DISCONNECTED
    this.clearCache()
  }

  getState(): McpConnectionState {
    return this.state
  }

  async listTools(): Promise<Tool[]> {
    if (this.toolsCache) {
      return this.toolsCache
    }

    await this.ensureConnected()

    const response = await this.client!.listTools()
    this.toolsCache = response.tools
    return this.toolsCache
  }

  async callTool(
    name: string,
    args: Record<string, unknown>
  ): Promise<CallToolResult> {
    await this.ensureConnected()

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new McpTimeoutError(`工具调用超时: ${name}`))
      }, this.config.timeout || 30000)
    })

    try {
      const result = await Promise.race([
        this.client!.callTool({ name, arguments: args }),
        timeoutPromise
      ])
      return result
    } catch (error) {
      const mcpError = handleMcpError(error)
      throw new McpToolExecutionError(
        name,
        `调用远程工具失败: ${mcpError.message}`,
        mcpError
      )
    }
  }

  async listResources(): Promise<Resource[]> {
    if (this.resourcesCache) {
      return this.resourcesCache
    }

    await this.ensureConnected()

    const response = await this.client!.listResources()
    this.resourcesCache = response.resources
    return this.resourcesCache
  }

  async readResource(uri: string): Promise<string> {
    await this.ensureConnected()

    const response = await this.client!.readResource({ uri })
    return response.contents[0]?.text || ''
  }

  async listPrompts(): Promise<Prompt[]> {
    if (this.promptsCache) {
      return this.promptsCache
    }

    await this.ensureConnected()

    const response = await this.client!.listPrompts()
    this.promptsCache = response.prompts
    return this.promptsCache
  }

  async getPrompt(
    name: string,
    args?: Record<string, unknown>
  ): Promise<string> {
    await this.ensureConnected()

    const response = await this.client!.getPrompt({
      name,
      arguments: args
    })

    return response.messages
      .map(msg => msg.content.text)
      .join('\n')
  }

  private async ensureConnected(): Promise<void> {
    if (this.state !== McpConnectionState.CONNECTED) {
      await this.connect()
    }
  }

  private async loadTools(): Promise<void> {
    try {
      await this.listTools()
    } catch (error) {
      console.warn('预加载工具列表失败:', error)
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return
    }

    const delay = this.config.retryDelay || 1000

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null
      this.state = McpConnectionState.RECONNECTING

      try {
        await this.connect()
      } catch (error) {
        this.scheduleReconnect()
      }
    }, delay)
  }

  private clearCache(): void {
    this.toolsCache = null
    this.resourcesCache = null
    this.promptsCache = null
  }
}
