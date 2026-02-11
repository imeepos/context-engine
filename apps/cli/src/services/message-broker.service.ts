import { Inject, Injectable } from '@sker/core'
import { STORAGE_TOKEN, type Storage } from '../storage/storage.interface'
import { InterAgentMessage, MessageQueue } from '../types/message'
import { AgentRegistryService } from './agent-registry.service'
import { v4 as uuidv4 } from 'uuid'

export const ERR_AGENT_NOT_REGISTERED = 'ERR_AGENT_NOT_REGISTERED'
export const ERR_TARGET_AGENT_OFFLINE = 'ERR_TARGET_AGENT_OFFLINE'

@Injectable({ providedIn: 'auto' })
export class MessageBrokerService {
  private messageReceivedCallbacks: Array<(message: InterAgentMessage) => void> = []
  private unwatchFn?: () => void

  constructor(
    @Inject(STORAGE_TOKEN) private storage: Storage,
    @Inject(AgentRegistryService) private agentRegistry: AgentRegistryService
  ) {}

  async init(): Promise<void> {
    const currentAgent = this.agentRegistry.getCurrentAgent()
    if (!currentAgent) return

    const queueKey = `messages/${currentAgent.id}`
    const existingQueue = await this.storage.read<MessageQueue>(queueKey)
    if (!existingQueue) {
      await this.storage.write(queueKey, { messages: [] })
    }

    this.unwatchFn = this.storage.watch(queueKey, async (queue: MessageQueue) => {
      if (!queue || !queue.messages) return

      const unreadMessages = queue.messages.filter(m => !m.read)
      if (unreadMessages.length === 0) return

      for (const message of unreadMessages) {
        this.messageReceivedCallbacks.forEach(callback => callback(message))
      }

      const updatedQueue: MessageQueue = {
        messages: queue.messages.map(m => ({ ...m, read: true }))
      }
      await this.storage.write(queueKey, updatedQueue)
    })
  }

  destroy(): void {
    if (this.unwatchFn) {
      this.unwatchFn()
      this.unwatchFn = undefined
    }
  }

  async sendMessage(to: string, content: string): Promise<void> {
    const currentAgent = this.agentRegistry.getCurrentAgent()
    if (!currentAgent) {
      throw new Error(`${ERR_AGENT_NOT_REGISTERED}: Current agent is not registered`)
    }

    const onlineAgents = await this.agentRegistry.getOnlineAgents()
    const targetAgent = onlineAgents.find(a => a.id === to)
    if (!targetAgent) {
      throw new Error(`${ERR_TARGET_AGENT_OFFLINE}: Agent ${to} is not online`)
    }

    const message: InterAgentMessage = {
      id: uuidv4(),
      from: currentAgent.id,
      to,
      content,
      timestamp: Date.now(),
      read: false
    }

    const recipientQueueKey = `messages/${to}`
    const recipientQueue = await this.storage.read<MessageQueue>(recipientQueueKey) || { messages: [] }
    recipientQueue.messages.push(message)
    await this.storage.write(recipientQueueKey, recipientQueue)

    const senderQueueKey = `messages/${currentAgent.id}`
    const senderQueue = await this.storage.read<MessageQueue>(senderQueueKey) || { messages: [] }
    senderQueue.messages.push({ ...message, read: true })
    await this.storage.write(senderQueueKey, senderQueue)
  }

  onMessageReceived(callback: (message: InterAgentMessage) => void): () => void {
    this.messageReceivedCallbacks.push(callback)
    return () => {
      const index = this.messageReceivedCallbacks.indexOf(callback)
      if (index > -1) {
        this.messageReceivedCallbacks.splice(index, 1)
      }
    }
  }

  async getMessageHistory(withAgent: string): Promise<InterAgentMessage[]> {
    const currentAgent = this.agentRegistry.getCurrentAgent()
    if (!currentAgent) return []

    const currentQueueKey = `messages/${currentAgent.id}`
    const currentQueue = await this.storage.read<MessageQueue>(currentQueueKey)
    const currentMessages = currentQueue?.messages || []

    const otherQueueKey = `messages/${withAgent}`
    const otherQueue = await this.storage.read<MessageQueue>(otherQueueKey)
    const otherMessages = otherQueue?.messages || []

    const allMessages = [...currentMessages, ...otherMessages]
    const filteredMessages = allMessages.filter(m =>
      (m.from === currentAgent.id && m.to === withAgent) ||
      (m.from === withAgent && m.to === currentAgent.id)
    )

    const uniqueMessages = new Map<string, InterAgentMessage>()
    filteredMessages.forEach(m => {
      if (!uniqueMessages.has(m.id)) {
        uniqueMessages.set(m.id, m)
      }
    })

    return Array.from(uniqueMessages.values()).sort((a, b) => a.timestamp - b.timestamp)
  }
}
