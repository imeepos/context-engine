import React from 'react'
import { Injector } from '@sker/core'
import { Browser, Tool } from '@sker/prompt-renderer'
import { CURRENT_AGENT_ID } from '../tokens'
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
      <h2>Agent</h2>
      {agents.map(agent => {
        const messagesWithAgent = allMessages.filter(m =>
          (m.from === agent.id && m.to === currentAgentId) ||
          (m.from === currentAgentId && m.to === agent.id)
        ).sort((a, b) => b.timestamp - a.timestamp)

        const unreadCount = allMessages.filter(m =>
          m.from === agent.id && m.to === currentAgentId && !m.read
        ).length

        const latestMessage = messagesWithAgent[0]

        const isSelf = agent.id === currentAgentId
        const badge = isSelf ? '●' : unreadCount > 0 ? `(${unreadCount})` : ''
        const direction = latestMessage ? (latestMessage.from === currentAgentId ? '→' : '←') : ''
        const preview = latestMessage ? `${direction} ${latestMessage.content.substring(0, 20)}${latestMessage.content.length > 20 ? '...' : ''}` : ''

        return (
          <div key={agent.id}>
            <Tool name={`view_${agent.id}`} description={`查看${agent.id}`} execute={async (params, injector) => {
              injector.get(Browser).setCurrentUrl(`/chat/${agent.id}`)
            }}>
              {agent.id} {badge}
            </Tool>
            {preview && <div>  {preview}</div>}
          </div>
        )
      })}
    </div>
  )
}
