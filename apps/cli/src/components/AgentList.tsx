import React from 'react'
import { Injector } from '@sker/core'
import { Agent } from '../types/agent'

interface AgentListProps {
  injector: Injector
}

export function AgentListComponent({ injector }: AgentListProps) {
  const agents = injector.get<Agent[]>('AGENTS')
  const currentAgentId = injector.get<string>('CURRENT_AGENT_ID')

  return (
    <div>
      <h2>在线Agent列表</h2>
      {agents.map(agent => (
        <div key={agent.id}>
          - {agent.id}{agent.id === currentAgentId ? ' (你)' : ''} [在线]
        </div>
      ))}
    </div>
  )
}
