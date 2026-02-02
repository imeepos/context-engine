import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { TaskManagerService } from './task-manager.service'
import { JsonFileStorage } from '../storage/json-file-storage'
import { TaskStatus } from '../types/task'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'

describe('TaskManagerService', () => {
  let service: TaskManagerService
  let storage: JsonFileStorage
  let testDir: string

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `test-tasks-${Date.now()}`)
    storage = new JsonFileStorage(testDir)
    await storage.init()
    service = new TaskManagerService(storage)
    await service.init()
  })

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true })
  })

  describe('createTask', () => {
    it('should create task with PENDING status when no dependencies', async () => {
      const task = await service.createTask({
        title: 'Test Task',
        description: 'Test Description'
      })

      expect(task.id).toBeDefined()
      expect(task.title).toBe('Test Task')
      expect(task.status).toBe(TaskStatus.PENDING)
      expect(task.dependencies).toEqual([])
    })

    it('should create task with BLOCKED status when has dependencies', async () => {
      const task = await service.createTask({
        title: 'Test Task',
        description: 'Test Description',
        dependencies: ['dep1', 'dep2']
      })

      expect(task.status).toBe(TaskStatus.BLOCKED)
      expect(task.dependencies).toEqual(['dep1', 'dep2'])
    })
  })

  describe('claimTask', () => {
    it('should successfully claim a PENDING task', async () => {
      const task = await service.createTask({
        title: 'Test Task',
        description: 'Test Description'
      })

      const claimed = await service.claimTask(task.id, 'agent1')
      expect(claimed).toBe(true)

      const updated = await service.getTask(task.id)
      expect(updated?.status).toBe(TaskStatus.IN_PROGRESS)
      expect(updated?.assignedTo).toBe('agent1')
      expect(updated?.claimedAt).toBeDefined()
    })

    it('should fail to claim a task that is not PENDING', async () => {
      const task = await service.createTask({
        title: 'Test Task',
        description: 'Test Description',
        dependencies: ['dep1']
      })

      const claimed = await service.claimTask(task.id, 'agent1')
      expect(claimed).toBe(false)
    })

    it('should handle concurrent claims correctly', async () => {
      const task = await service.createTask({
        title: 'Test Task',
        description: 'Test Description'
      })

      const [claim1, claim2, claim3] = await Promise.all([
        service.claimTask(task.id, 'agent1'),
        service.claimTask(task.id, 'agent2'),
        service.claimTask(task.id, 'agent3')
      ])

      const successCount = [claim1, claim2, claim3].filter(Boolean).length
      expect(successCount).toBe(1)

      const updated = await service.getTask(task.id)
      expect(updated?.status).toBe(TaskStatus.IN_PROGRESS)
      expect(['agent1', 'agent2', 'agent3']).toContain(updated?.assignedTo)
    })
  })

  describe('completeTask', () => {
    it('should mark task as COMPLETED', async () => {
      const task = await service.createTask({
        title: 'Test Task',
        description: 'Test Description'
      })

      await service.completeTask(task.id)

      const updated = await service.getTask(task.id)
      expect(updated?.status).toBe(TaskStatus.COMPLETED)
      expect(updated?.completedAt).toBeDefined()
    })
  })

  describe('getTasksByStatus', () => {
    it('should return tasks filtered by status', async () => {
      await service.createTask({ title: 'Task 1', description: 'Desc 1' })
      await service.createTask({ title: 'Task 2', description: 'Desc 2', dependencies: ['dep1'] })
      await service.createTask({ title: 'Task 3', description: 'Desc 3' })

      const pending = await service.getTasksByStatus(TaskStatus.PENDING)
      const blocked = await service.getTasksByStatus(TaskStatus.BLOCKED)

      expect(pending).toHaveLength(2)
      expect(blocked).toHaveLength(1)
    })
  })

  describe('getTasksByAgent', () => {
    it('should return tasks assigned to specific agent', async () => {
      const task1 = await service.createTask({ title: 'Task 1', description: 'Desc 1' })
      const task2 = await service.createTask({ title: 'Task 2', description: 'Desc 2' })

      await service.claimTask(task1.id, 'agent1')
      await service.claimTask(task2.id, 'agent2')

      const agent1Tasks = await service.getTasksByAgent('agent1')
      expect(agent1Tasks).toHaveLength(1)
      expect(agent1Tasks[0].id).toBe(task1.id)
    })
  })
})
