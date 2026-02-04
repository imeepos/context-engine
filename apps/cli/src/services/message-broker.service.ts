import { Injectable } from '@sker/core'
import type { Storage } from '../storage/storage.interface'
import { InterAgentMessage, MessageQueue } from '../types/message'
import { AgentRegistryService } from './agent-registry.service'
import { v4 as uuidv4 } from 'uuid'

@Injectable({ providedIn: 'auto' })
export class MessageBrokerService {
  private messageReceivedCallbacks: Array<(message: InterAgentMessage) => void> = []

  constructor(
    private storage: Storage,
    private agentRegistry: AgentRegistryService
  ) { }

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
      }

      // Mark messages as read
      const updatedQueue = {
        messages: queue.messages.map(m => ({ ...m, read: true }))
      }
      await this.storage.write(queueKey, updatedQueue)
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

    // Write to recipient's queue
    const recipientQueueKey = `messages/${to}`
    const recipientQueue = await this.storage.read<MessageQueue>(recipientQueueKey) || { messages: [] }
    recipientQueue.messages.push(message)
    await this.storage.write(recipientQueueKey, recipientQueue)

    // Write to sender's queue (so sender can see their own sent messages)
    const senderQueueKey = `messages/${currentAgent.id}`
    const senderQueue = await this.storage.read<MessageQueue>(senderQueueKey) || { messages: [] }
    senderQueue.messages.push({ ...message, read: true }) // Mark as read for sender
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

    // Get messages from current agent's queue
    const currentQueueKey = `messages/${currentAgent.id}`
    const currentQueue = await this.storage.read<MessageQueue>(currentQueueKey)
    const currentMessages = currentQueue?.messages || []

    // Get messages from the other agent's queue
    const otherQueueKey = `messages/${withAgent}`
    const otherQueue = await this.storage.read<MessageQueue>(otherQueueKey)
    const otherMessages = otherQueue?.messages || []

    // Combine and filter messages between the two agents
    const allMessages = [...currentMessages, ...otherMessages]
    const filteredMessages = allMessages.filter(m =>
      (m.from === currentAgent.id && m.to === withAgent) ||
      (m.from === withAgent && m.to === currentAgent.id)
    )

    // Deduplicate by message ID
    const uniqueMessages = new Map<string, InterAgentMessage>()
    filteredMessages.forEach(m => {
      if (!uniqueMessages.has(m.id)) {
        uniqueMessages.set(m.id, m)
      }
    })

    return Array.from(uniqueMessages.values()).sort((a, b) => a.timestamp - b.timestamp)
  }
}
