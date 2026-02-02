import React from 'react'
import { Injector } from '@sker/core'
import { Agent } from '../types/agent'
import { Tool } from '@sker/prompt-renderer'
import { AGENTS, CURRENT_AGENT_ID, NAVIGATE, MESSAGES } from '../tokens'
import { NavigateTool } from '../tools/NavigateTool'

interface AgentListProps {
  injector: Injector
}

export function AgentListComponent({ injector }: AgentListProps) {
  const agents = injector.get(AGENTS)
  const currentAgentId = injector.get(CURRENT_AGENT_ID)
  const navigate = injector.get(NAVIGATE)
  const allMessages = injector.get(MESSAGES)

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

        return (
          <div key={agent.id}>
            - {agent.id}{agent.id === currentAgentId ? ' (你)' : ''} [在线]
            {agent.id !== currentAgentId && ` [${unreadCount}条未读]`}
            {latestMessage && ` - ${latestMessage.content.substring(0, 20)}${latestMessage.content.length > 20 ? '...' : ''}`}
            {' '}
            <Tool
              use={NavigateTool}
              boundParams={{ path: `/chat/${agent.id}` }}
              key={`navigate-${agent.id}`}
            >
              查看
            </Tool>
          </div>
        )
      })}
    </div>
  )
}
