import { Injectable } from '@sker/core'
import type { Storage } from '../storage/storage.interface'
import { InterAgentMessage, MessageQueue } from '../types/message'
import { AgentRegistryService } from './agent-registry.service'
import { v4 as uuidv4 } from 'uuid'

@Injectable({ providedIn: 'root' })
export class MessageBrokerService {
  private messageReceivedCallbacks: Array<(message: InterAgentMessage) => void> = []

  constructor(
    private storage: Storage,
    private agentRegistry: AgentRegistryService
  ) {}

  async init(): Promise<void> {
    const currentAgent = this.agentRegistry.getCurrentAgent()
    if (!currentAgent) return

    const queueKey = `messages/${currentAgent.id}`

    // Ensure queue file exists
    const existingQueue = await this.storage.read<MessageQueue>(queueKey)
    if (!existingQueue) {
      await this.storage.write(queueKey, { messages: [] })
    }

    this.storage.watch(queueKey, async (queue: MessageQueue) => {
      if (!queue || !queue.messages) return

      const unreadMessages = queue.messages.filter(m => !m.read)
      if (unreadMessages.length === 0) return

      for (const message of unreadMessages) {
        this.messageReceivedCallbacks.forEach(callback => callback(message))
        message.read = true
      }

      await this.storage.write(queueKey, queue)
    })
  }

  async sendMessage(to: string, content: string): Promise<void> {
    const currentAgent = this.agentRegistry.getCurrentAgent()
    if (!currentAgent) {
      throw new Error('当前agent未注册')
    }

    const onlineAgents = await this.agentRegistry.getOnlineAgents()
    const targetAgent = onlineAgents.find(a => a.id === to)
    if (!targetAgent) {
      throw new Error(`Agent ${to} 不在线`)
    }

    const message: InterAgentMessage = {
      id: uuidv4(),
      from: currentAgent.id,
      to,
      content,
      timestamp: Date.now(),
      read: false
    }

    const queueKey = `messages/${to}`
    const queue = await this.storage.read<MessageQueue>(queueKey) || { messages: [] }
    queue.messages.push(message)
    await this.storage.write(queueKey, queue)
  }

  onMessageReceived(callback: (message: InterAgentMessage) => void): void {
    this.messageReceivedCallbacks.push(callback)
  }

  async getMessageHistory(withAgent: string): Promise<InterAgentMessage[]> {
    const currentAgent = this.agentRegistry.getCurrentAgent()
    if (!currentAgent) return []

    const queueKey = `messages/${currentAgent.id}`
    const queue = await this.storage.read<MessageQueue>(queueKey)
    if (!queue) return []

    return queue.messages.filter(m =>
      m.from === withAgent || m.to === withAgent
    )
  }
}
