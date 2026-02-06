import { ReactiveState } from '../state/reactive-state'
import { AgentRegistryService } from '../services/agent-registry.service'

export interface AppState {
  agents: any[]
  currentAgentId: string
  messages: any[]
}

export class StateManager {
  private reactiveState: ReactiveState<AppState>
  private agentRegistry: AgentRegistryService

  constructor(initialState: AppState, agentRegistry: AgentRegistryService) {
    this.reactiveState = new ReactiveState(initialState)
    this.agentRegistry = agentRegistry
  }

  getState(): AppState {
    return this.reactiveState.getState()
  }

  subscribe(callback: (state: AppState) => void): () => void {
    return this.reactiveState.subscribe(callback)
  }

  async updateState(partial: Partial<AppState>): Promise<void> {
    const updatedAgents = await this.agentRegistry.getOnlineAgents()
    this.reactiveState.setState({
      ...this.reactiveState.getState(),
      agents: updatedAgents,
      ...partial
    })
  }

  async addMessage(message: any): Promise<void> {
    const currentMessages = this.reactiveState.getState().messages
    await this.updateState({ messages: [...currentMessages, message] })
  }
}
