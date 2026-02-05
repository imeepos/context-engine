import { Inject, Injectable } from '@sker/core'
import type { Storage } from '../storage/storage.interface'
import { STORAGE_TOKEN } from '../storage/storage.interface'
import { Agent, AgentRegistry } from '../types/agent'

@Injectable({ providedIn: 'auto' })
export class AgentRegistryService {
  private currentAgent: Agent | null = null
  private heartbeatInterval: NodeJS.Timeout | null = null
  private agentListChangeCallbacks: Array<(agents: Agent[]) => void> = []

  constructor(@Inject(STORAGE_TOKEN) private storage: Storage) { }

  async register(customId?: string): Promise<Agent> {
    const registry = await this.getRegistry()

    let agentId: string
    if (customId) {
      agentId = customId
    } else {
      agentId = `agent-${registry.nextId}`
      registry.nextId++
    }

    const agent: Agent = {
      id: agentId,
      pid: process.pid,
      startTime: Date.now(),
      lastHeartbeat: Date.now(),
      status: 'online'
    }

    registry.agents[agentId] = agent
    await this.storage.write('agents', registry)

    this.currentAgent = agent
    this.startHeartbeat()
    this.watchRegistry()

    return agent
  }

  async unregister(): Promise<void> {
    if (!this.currentAgent) return

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
    }

    const registry = await this.getRegistry()
    const agent = registry.agents[this.currentAgent.id]
    if (agent) {
      agent.status = 'offline'
      await this.storage.write('agents', registry)
    }
  }

  async getOnlineAgents(): Promise<Agent[]> {
    const registry = await this.getRegistry()
    const now = Date.now()
    const timeout = 10000

    return Object.values(registry.agents).filter(agent => {
      return agent.status === 'online' && (now - agent.lastHeartbeat) < timeout
    })
  }

  getCurrentAgent(): Agent | null {
    return this.currentAgent
  }

  onAgentListChange(callback: (agents: Agent[]) => void): void {
    this.agentListChangeCallbacks.push(callback)
  }

  private async getRegistry(): Promise<AgentRegistry> {
    const registry = await this.storage.read<AgentRegistry>('agents')
    return registry || { agents: {}, nextId: 0 }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(async () => {
      if (!this.currentAgent) return

      const registry = await this.getRegistry()
      const agent = registry.agents[this.currentAgent.id]
      if (agent) {
        agent.lastHeartbeat = Date.now()
        await this.storage.write('agents', registry)
      }
    }, 3000)
  }

  private watchRegistry(): void {
    this.storage.watch('agents', async () => {
      const agents = await this.getOnlineAgents()
      this.agentListChangeCallbacks.forEach(callback => callback(agents))
    })
  }
}
