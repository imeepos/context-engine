import { Injectable, Inject } from '@sker/core'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import type { IMcpClient } from '../mcp/types'
import { MCP_CLIENT } from '../tokens'

@Injectable()
export class RemoteToolProxy {
  constructor(
    @Inject(MCP_CLIENT) private mcpClient: IMcpClient
  ) {}

  async callRemoteTool(
    name: string,
    args: Record<string, unknown>
  ): Promise<CallToolResult> {
    try {
      return await this.mcpClient.callTool(name, args)
    } catch (error) {
      console.error(`远程工具调用失败 [${name}]:`, error)
      throw new Error(`远程工具 ${name} 不可用`)
    }
  }

  async getRemoteTools() {
    return await this.mcpClient.listTools()
  }

  async hasRemoteTool(name: string): Promise<boolean> {
    const tools = await this.getRemoteTools()
    return tools.some(tool => tool.name === name)
  }
}
