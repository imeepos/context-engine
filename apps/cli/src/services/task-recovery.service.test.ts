import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { TaskRecoveryService } from './task-recovery.service'
import { TaskManagerService } from './task-manager.service'
import { AgentRegistryService } from './agent-registry.service'
import { JsonFileStorage } from '../storage/json-file-storage'
import { TaskStatus } from '../types/task'
import * as fs from 'fs/promises'
import * as os from 'os'
import * as path from 'path'

describe('TaskRecoveryService', () => {
  let storage: JsonFileStorage
  let taskManager: TaskManagerService
  let agentRegistry: AgentRegistryService
  let taskRecovery: TaskRecoveryService
  let testDir: string

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `test-recovery-${Date.now()}`)
    storage = new JsonFileStorage(testDir)
    await storage.init()

    taskManager = new TaskManagerService(storage)
    await taskManager.init()

    agentRegistry = new AgentRegistryService(storage)
    taskRecovery = new TaskRecoveryService(taskManager, agentRegistry)
  })

  afterEach(async () => {
    await agentRegistry.unregister()
    await fs.rm(testDir, { recursive: true, force: true })
  })

  it('reverts stale in-progress tasks to pending', async () => {
    await agentRegistry.register('worker-1')

    const task = await taskManager.createTask({
      title: 'Recover me',
      description: 'Task that should be recovered',
      createdBy: 'owner'
    })

    const claimed = await taskManager.claimTask(task.id, 'worker-1')
    expect(claimed.success).toBe(true)

    const registry = await storage.read<any>('agents')
    registry.agents['worker-1'].lastHeartbeat = Date.now() - (agentRegistry.getOfflineThresholdMs() + 1000)
    await storage.write('agents', registry)

    await taskRecovery.recoverStaleTasks()

    const recovered = await taskManager.getTask(task.id)
    expect(recovered?.status).toBe(TaskStatus.PENDING)
    expect(recovered?.assignedTo).toBeNull()
    expect(recovered?.claimedAt).toBeNull()
  })

  it('does not touch active in-progress tasks', async () => {
    await agentRegistry.register('worker-2')

    const task = await taskManager.createTask({
      title: 'Keep me',
      description: 'Task should stay in progress',
      createdBy: 'owner'
    })

    const claimed = await taskManager.claimTask(task.id, 'worker-2')
    expect(claimed.success).toBe(true)

    await taskRecovery.recoverStaleTasks()

    const updated = await taskManager.getTask(task.id)
    expect(updated?.status).toBe(TaskStatus.IN_PROGRESS)
    expect(updated?.assignedTo).toBe('worker-2')
  })
})
