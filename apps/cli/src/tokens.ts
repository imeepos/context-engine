import { InjectionToken } from '@sker/core'
import { InterAgentMessage } from './types/message'
import type { IMcpClient, McpClientConfig } from './mcp/types'

export const MESSAGE_SUBSCRIBER = new InjectionToken<(callback: (messages: InterAgentMessage[]) => void) => () => void>('app.message-subscriber')
export const CURRENT_AGENT_ID = new InjectionToken<string>('app.current-agent-id')

export const MCP_CLIENT_CONFIG = new InjectionToken<McpClientConfig>('MCP_CLIENT_CONFIG')
export const MCP_CLIENT = new InjectionToken<IMcpClient>('MCP_CLIENT')

export interface MarketplaceApiConfig {
  baseUrl: string
  timeout?: number
}

export const MARKETPLACE_API_CONFIG = new InjectionToken<MarketplaceApiConfig>('MARKETPLACE_API_CONFIG')

export interface MarketplaceApiClient {
  listPlugins(query?: Record<string, string | number | boolean>): Promise<Record<string, unknown>>
  listInstalledPlugins(): Promise<Record<string, unknown>[]>
  listPublishedPlugins(): Promise<Record<string, unknown>[]>
  getPluginDetail(id: string): Promise<Record<string, unknown>>
  installPlugin(id: string, version?: string): Promise<Record<string, unknown>>
  uninstallPlugin(id: string): Promise<Record<string, unknown> | null>
  updatePlugin(id: string, input: {
    name?: string
    description?: string
    category?: string
    tags?: string[]
    status?: 'active' | 'archived'
  }): Promise<Record<string, unknown>>
  publishPlugin(input: {
    slug: string
    name: string
    description?: string
    category?: string
    tags?: string[]
    version: string
    sourceCode: string
    schema?: string
    changelog?: string
  }): Promise<Record<string, unknown>>
  publishVersion(id: string, input: {
    version: string
    sourceCode: string
    schema?: string
    changelog?: string
  }): Promise<Record<string, unknown>>
}

export const MARKETPLACE_API_CLIENT = new InjectionToken<MarketplaceApiClient>('MARKETPLACE_API_CLIENT')
