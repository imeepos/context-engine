import React from 'react'
import { Injector } from '@sker/core'
import { Layout } from '../components/Layout'
import { CURRENT_ROUTE, ToolUse } from '@sker/prompt-renderer'
import { CURRENT_AGENT_ID } from '../tokens'
import { NavigateTool } from '../tools/NavigateTool'
import { SendMessageTool } from '../tools/SendMessageTool'
import { AgentRegistryService } from '../services/agent-registry.service'
import { MessageBrokerService } from '../services/message-broker.service'

interface ChatPageProps {
  injector: Injector
}

export async function ChatPageComponent({ injector }: ChatPageProps) {
  const routeMatch = injector.get(CURRENT_ROUTE)
  const currentAgentId = injector.get(CURRENT_AGENT_ID)
  const agentId = routeMatch?.params?.agentId || ''

  const agentRegistryService = injector.get(AgentRegistryService)
  const messageBrokerService = injector.get(MessageBrokerService)

  const agents = await agentRegistryService.getOnlineAgents()
  const messages = agentId ? await messageBrokerService.getMessageHistory(agentId) : []

  return (
    <Layout injector={injector}>
      <ToolUse use={NavigateTool} propertyKey={`execute`}>返回</ToolUse>
      <h2>所有在线的AGENT有：</h2>
      {agents.map(agent => (
        <div key={agent.id}>
          {agent.id === agentId ? '> ' : '- '}
          {agent.id}
          {agent.id === currentAgentId && ' (你)'}
        </div>
      ))}

      {agentId && (
        <div>
          <h2>与 {agentId} 的对话记录</h2>
          {messages.map((msg) => (
            <div key={msg.id}>
              [{msg.from}] {msg.content}
            </div>
          ))}
          <ToolUse use={SendMessageTool} propertyKey={'execute'}>
            发送消息
          </ToolUse>
        </div>
      )}
    </Layout>
  )
}
