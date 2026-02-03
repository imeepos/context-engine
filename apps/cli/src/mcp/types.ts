import type {
  Tool,
  Resource,
  Prompt,
  CallToolResult
} from '@modelcontextprotocol/sdk/types.js'

/**
 * MCP 客户端配置
 */
export interface McpClientConfig {
  baseUrl: string          // API 基础 URL (https://mcp.sker.us)
  timeout?: number         // 请求超时时间 (默认 30000ms)
  retryAttempts?: number   // 重试次数 (默认 3)
  retryDelay?: number      // 重试延迟 (默认 1000ms)
}

/**
 * MCP 连接状态
 */
export enum McpConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error'
}

/**
 * MCP 客户端接口
 */
export interface IMcpClient {
  // 连接管理
  connect(): Promise<void>
  disconnect(): Promise<void>
  getState(): McpConnectionState

  // 工具操作
  listTools(): Promise<Tool[]>
  callTool(name: string, args: Record<string, unknown>): Promise<CallToolResult>

  // 资源操作
  listResources(): Promise<Resource[]>
  readResource(uri: string): Promise<string>

  // Prompt 操作
  listPrompts(): Promise<Prompt[]>
  getPrompt(name: string, args?: Record<string, unknown>): Promise<string>
}
