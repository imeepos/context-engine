import { Injectable, OnInit, OnDestroy } from '@sker/core'
import { McpClient } from '../mcp/client'
import { McpConnectionState } from '../mcp/types'

@Injectable()
export class McpClientService implements OnInit, OnDestroy {
  constructor(private mcpClient: McpClient) {}

  async onInit(): Promise<void> {
    try {
      await this.mcpClient.connect()
    } catch (error) {
      console.warn('MCP 服务器连接失败，远程工具将不可用')
    }
  }

  async onDestroy(): Promise<void> {
    await this.mcpClient.disconnect()
  }

  getConnectionState(): McpConnectionState {
    return this.mcpClient.getState()
  }

  isConnected(): boolean {
    return this.mcpClient.getState() === McpConnectionState.CONNECTED
  }
}
