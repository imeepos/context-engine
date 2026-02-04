import React from 'react'
import { Injector } from '@sker/core'
import { Tool } from '@sker/prompt-renderer'
import { CURRENT_AGENT_ID } from '../tokens'
import { NavigateTool } from '../tools/NavigateTool'
import { AgentRegistryService } from '../services/agent-registry.service'
import { MessageBrokerService } from '../services/message-broker.service'

interface AgentListProps {
  injector: Injector
}

export async function AgentListComponent({ injector }: AgentListProps) {
  const currentAgentId = injector.get(CURRENT_AGENT_ID)
  const agentRegistryService = injector.get(AgentRegistryService)
  const messageBrokerService = injector.get(MessageBrokerService)

  const agents = await agentRegistryService.getOnlineAgents()

  const allMessagesPromises = agents.map(agent =>
    messageBrokerService.getMessageHistory(agent.id)
  )
  const allMessagesArrays = await Promise.all(allMessagesPromises)
  const allMessages = allMessagesArrays.flat()

  return (
    <div>
      <h2>在线Agent列表</h2>
      {agents.map(agent => {
        // 计算与该agent的未读消息数和最新消息
        const messagesWithAgent = allMessages.filter(m =>
          (m.from === agent.id && m.to === currentAgentId && !m.read) ||
          (m.from === currentAgentId && m.to === agent.id) ||
          (m.from === agent.id && m.to === currentAgentId && m.read)
        ).sort((a, b) => b.timestamp - a.timestamp)

        const unreadCount = allMessages.filter(m =>
          m.from === agent.id && m.to === currentAgentId && !m.read
        ).length

        const latestMessage = messagesWithAgent[0]

        const info = [
          agent.id,
          agent.id === currentAgentId ? '(你)' : null,
          agent.id !== currentAgentId && unreadCount > 0 ? `[${unreadCount}未读]` : null,
          latestMessage ? `${latestMessage.content.substring(0, 15)}${latestMessage.content.length > 15 ? '...' : ''}` : null
        ].filter(Boolean).join(' ')

        return (
          <div key={agent.id}>
            {info} <Tool name={`view_${agent.id}`} description={`查看与${agent.id}的对话`} execute={async (params, injector) => {
              await injector.get(NavigateTool).execute(`/chat/${agent.id}`)
            }} >查看</Tool>
          </div>
        )
      })}
    </div>
  )
}
