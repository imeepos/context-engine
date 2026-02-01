import { InjectionToken } from '@sker/core'
import { InterAgentMessage } from './types/message'
import { Agent } from './types/agent'

export const MESSAGES = new InjectionToken<InterAgentMessage[]>('app.messages')
export const MESSAGE_SUBSCRIBER = new InjectionToken<(callback: (messages: InterAgentMessage[]) => void) => () => void>('app.message-subscriber')
export const AGENTS = new InjectionToken<Agent[]>('app.agents')
export const CURRENT_AGENT_ID = new InjectionToken<string>('app.current-agent-id')
export const NAVIGATE = new InjectionToken<(url: string) => void>('app.navigate')
