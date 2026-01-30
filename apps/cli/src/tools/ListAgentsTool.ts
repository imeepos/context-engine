import { Tool } from '@sker/core'
import { AgentRegistryService } from '../services/agent-registry.service'

export class ListAgentsTool {
  constructor(private agentRegistry: AgentRegistryService) {}

  @Tool({
    name: 'list_agents',
    description: '获取当前在线的所有agent列表'
  })
  async execute() {
    const agents = await this.agentRegistry.getOnlineAgents()
    const currentAgent = this.agentRegistry.getCurrentAgent()

    return {
      agents: agents.map(agent => ({
        id: agent.id,
        isCurrent: agent.id === currentAgent?.id,
        status: agent.status
      })),
      total: agents.length
    }
  }
}
