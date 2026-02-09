import 'reflect-metadata'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  ERR_AGENT_NOT_REGISTERED,
  ERR_TARGET_AGENT_OFFLINE,
  MessageBrokerService
} from './message-broker.service'
import { AgentRegistryService } from './agent-registry.service'
import { JsonFileStorage } from '../storage/json-file-storage'
import * as path from 'path'
import * as os from 'os'
import * as fs from 'fs/promises'

describe('MessageBrokerService', () => {
  let broker: MessageBrokerService
  let agentRegistry: AgentRegistryService
  let storage: JsonFileStorage
  let testDir: string

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sker-test-'))
    storage = new JsonFileStorage(testDir)
    await storage.init()
    agentRegistry = new AgentRegistryService(storage)
    broker = new MessageBrokerService(storage, agentRegistry)
  })

  afterEach(async () => {
    broker.destroy()
    await agentRegistry.unregister()
    await fs.rm(testDir, { recursive: true, force: true })
  })

  describe('sendMessage', () => {
    it('sends message to online agent', async () => {
      await agentRegistry.register('agent-0')

      const agentRegistry2 = new AgentRegistryService(storage)
      await agentRegistry2.register('agent-1')

      await broker.sendMessage('agent-1', 'Hello agent-1')

      const queue = await storage.read<any>('messages/agent-1')
      expect(queue.messages).toHaveLength(1)
      expect(queue.messages[0].from).toBe('agent-0')
      expect(queue.messages[0].to).toBe('agent-1')
      expect(queue.messages[0].content).toBe('Hello agent-1')
      expect(queue.messages[0].read).toBe(false)
    })

    it('throws error if current agent not registered', async () => {
      await expect(broker.sendMessage('agent-1', 'Hello')).rejects.toThrow(ERR_AGENT_NOT_REGISTERED)
    })

    it('throws error if target agent not online', async () => {
      await agentRegistry.register('test-agent-unique')
      await expect(broker.sendMessage('agent-999', 'Hello')).rejects.toThrow(ERR_TARGET_AGENT_OFFLINE)
    })
  })

  describe('init and message receiving', () => {
    it('receives messages sent to current agent', async () => {
      await agentRegistry.register('agent-0')
      await broker.init()

      const agentRegistry2 = new AgentRegistryService(storage)
      await agentRegistry2.register('agent-1')
      const broker2 = new MessageBrokerService(storage, agentRegistry2)

      return new Promise<void>((resolve) => {
        broker.onMessageReceived((message) => {
          expect(message.from).toBe('agent-1')
          expect(message.to).toBe('agent-0')
          expect(message.content).toBe('Hello agent-0')
          broker2.destroy()
          void agentRegistry2.unregister()
          resolve()
        })

        setTimeout(async () => {
          await broker2.sendMessage('agent-0', 'Hello agent-0')
        }, 100)
      })
    })

    it('marks messages as read after receiving', async () => {
      await agentRegistry.register('agent-0')
      await broker.init()

      const agentRegistry2 = new AgentRegistryService(storage)
      await agentRegistry2.register('agent-1')
      const broker2 = new MessageBrokerService(storage, agentRegistry2)

      await new Promise<void>((resolve) => {
        broker.onMessageReceived(async () => {
          await new Promise(r => setTimeout(r, 500))
          const queue = await storage.read<any>('messages/agent-0')
          expect(queue.messages[0].read).toBe(true)
          broker2.destroy()
          await agentRegistry2.unregister()
          resolve()
        })

        setTimeout(async () => {
          await broker2.sendMessage('agent-0', 'Test message')
        }, 500)
      })
    }, 10000)
  })

  describe('getMessageHistory', () => {
    it('returns empty array when no messages', async () => {
      await agentRegistry.register('agent-0')
      const history = await broker.getMessageHistory('agent-1')
      expect(history).toEqual([])
    })

    it('returns messages with specific agent', async () => {
      await agentRegistry.register('agent-0')
      await broker.init()

      const agentRegistry2 = new AgentRegistryService(storage)
      await agentRegistry2.register('agent-1')
      const broker2 = new MessageBrokerService(storage, agentRegistry2)
      await broker2.init()

      await broker2.sendMessage('agent-0', 'Message 1')
      await new Promise(resolve => setTimeout(resolve, 500))
      await broker2.sendMessage('agent-0', 'Message 2')

      await new Promise(resolve => setTimeout(resolve, 1000))

      const history = await broker.getMessageHistory('agent-1')
      expect(history).toHaveLength(2)
      expect(history[0].content).toBe('Message 1')
      expect(history[1].content).toBe('Message 2')

      broker2.destroy()
      await agentRegistry2.unregister()
    }, 10000)
  })
})
