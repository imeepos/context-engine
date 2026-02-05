import { InjectionToken } from '@sker/core'
import { InterAgentMessage } from './types/message'
import type { IMcpClient, McpClientConfig } from './mcp/types'

export const MESSAGE_SUBSCRIBER = new InjectionToken<(callback: (messages: InterAgentMessage[]) => void) => () => void>('app.message-subscriber')
export const CURRENT_AGENT_ID = new InjectionToken<string>('app.current-agent-id')

export const MCP_CLIENT_CONFIG = new InjectionToken<McpClientConfig>('MCP_CLIENT_CONFIG')
export const MCP_CLIENT = new InjectionToken<IMcpClient>('MCP_CLIENT')
