import 'reflect-metadata'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { AgentRegistryService } from './agent-registry.service'
import { JsonFileStorage } from '../storage/json-file-storage'
import * as path from 'path'
import * as os from 'os'
import * as fs from 'fs/promises'

describe('AgentRegistryService', () => {
  let service: AgentRegistryService
  let storage: JsonFileStorage
  let testDir: string

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `sker-test-${Date.now()}`)
    storage = new JsonFileStorage(testDir)
    await storage.init()
    service = new AgentRegistryService(storage)
  })

  afterEach(async () => {
    await service.unregister()
    await fs.rm(testDir, { recursive: true, force: true })
  })

  describe('register', () => {
    it('registers agent with auto-generated ID', async () => {
      const agent = await service.register()

      expect(agent.id).toBe('agent-0')
      expect(agent.pid).toBe(process.pid)
      expect(agent.status).toBe('online')
      expect(agent.startTime).toBeGreaterThan(0)
      expect(agent.lastHeartbeat).toBeGreaterThan(0)
    })

    it('registers agent with custom ID', async () => {
      const agent = await service.register('alice')

      expect(agent.id).toBe('alice')
      expect(agent.status).toBe('online')
    })

    it('throws error if custom ID already in use', async () => {
      await service.register('alice')

      const service2 = new AgentRegistryService(storage)
      await expect(service2.register('alice')).rejects.toThrow('Agent ID "alice" 已被使用')
    })

    it('increments nextId for auto-generated IDs', async () => {
      const agent1 = await service.register()
      await service.unregister()

      const service2 = new AgentRegistryService(storage)
      const agent2 = await service2.register()

      expect(agent1.id).toBe('agent-0')
      expect(agent2.id).toBe('agent-1')
    })
  })

  describe('unregister', () => {
    it('marks agent as offline', async () => {
      await service.register('test-agent')
      await service.unregister()

      const registry = await storage.read<any>('agents')
      expect(registry.agents['test-agent'].status).toBe('offline')
    })

    it('does nothing if no agent registered', async () => {
      await expect(service.unregister()).resolves.not.toThrow()
    })
  })

  describe('getOnlineAgents', () => {
    it('returns empty array when no agents', async () => {
      const agents = await service.getOnlineAgents()
      expect(agents).toEqual([])
    })

    it('returns online agents', async () => {
      await service.register('agent-0')

      const service2 = new AgentRegistryService(storage)
      await service2.register('agent-1')

      const agents = await service.getOnlineAgents()
      expect(agents).toHaveLength(2)
      expect(agents.map(a => a.id)).toContain('agent-0')
      expect(agents.map(a => a.id)).toContain('agent-1')
    })

    it('filters out offline agents', async () => {
      await service.register('agent-0')
      await service.unregister()

      const agents = await service.getOnlineAgents()
      expect(agents).toHaveLength(0)
    })

    it('filters out agents with stale heartbeat', async () => {
      await service.register('agent-0')

      // Manually set heartbeat to 11 seconds ago
      const registry = await storage.read<any>('agents')
      registry.agents['agent-0'].lastHeartbeat = Date.now() - 11000
      await storage.write('agents', registry)

      const agents = await service.getOnlineAgents()
      expect(agents).toHaveLength(0)
    })
  })

  describe('getCurrentAgent', () => {
    it('returns null when no agent registered', () => {
      expect(service.getCurrentAgent()).toBeNull()
    })

    it('returns current agent after registration', async () => {
      const agent = await service.register('test-agent')
      expect(service.getCurrentAgent()).toEqual(agent)
    })
  })

  describe('heartbeat', () => {
    it('updates lastHeartbeat periodically', async () => {
      await service.register('test-agent')

      const registry1 = await storage.read<any>('agents')
      const heartbeat1 = registry1.agents['test-agent'].lastHeartbeat

      await new Promise(resolve => setTimeout(resolve, 3500))

      const registry2 = await storage.read<any>('agents')
      const heartbeat2 = registry2.agents['test-agent'].lastHeartbeat

      expect(heartbeat2).toBeGreaterThan(heartbeat1)
    })
  })

  describe('onAgentListChange', () => {
    it('triggers callback when agent list changes', async () => {
      await service.register('agent-0')

      return new Promise<void>((resolve) => {
        service.onAgentListChange((agents) => {
          expect(agents).toHaveLength(2)
          resolve()
        })

        setTimeout(async () => {
          const service2 = new AgentRegistryService(storage)
          await service2.register('agent-1')
        }, 100)
      })
    })
  })
})
