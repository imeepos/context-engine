import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { TaskDependencyResolverService } from './task-dependency-resolver.service'
import { TaskManagerService } from './task-manager.service'
import { JsonFileStorage } from '../storage/json-file-storage'
import { TaskStatus } from '../types/task'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'

describe('TaskDependencyResolverService', () => {
  let resolver: TaskDependencyResolverService
  let taskManager: TaskManagerService
  let storage: JsonFileStorage
  let testDir: string

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `test-deps-${Date.now()}`)
    storage = new JsonFileStorage(testDir)
    await storage.init()
    taskManager = new TaskManagerService(storage)
    await taskManager.init()
    resolver = new TaskDependencyResolverService(taskManager)
  })

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true })
  })

  describe('updateTaskStatuses', () => {
    it('should transition BLOCKED to PENDING when dependencies complete', async () => {
      const task1 = await taskManager.createTask({
        title: 'Task 1',
        description: 'First task'
      })

      const task2 = await taskManager.createTask({
        title: 'Task 2',
        description: 'Second task',
        dependencies: [task1.id]
      })

      expect(task2.status).toBe(TaskStatus.BLOCKED)

      await taskManager.completeTask(task1.id)
      await resolver.updateTaskStatuses()

      const updated = await taskManager.getTask(task2.id)
      expect(updated?.status).toBe(TaskStatus.PENDING)
    })

    it('should handle multiple dependencies', async () => {
      const task1 = await taskManager.createTask({
        title: 'Task 1',
        description: 'First task'
      })

      const task2 = await taskManager.createTask({
        title: 'Task 2',
        description: 'Second task'
      })

      const task3 = await taskManager.createTask({
        title: 'Task 3',
        description: 'Third task',
        dependencies: [task1.id, task2.id]
      })

      expect(task3.status).toBe(TaskStatus.BLOCKED)

      await taskManager.completeTask(task1.id)
      await resolver.updateTaskStatuses()

      let updated = await taskManager.getTask(task3.id)
      expect(updated?.status).toBe(TaskStatus.BLOCKED)

      await taskManager.completeTask(task2.id)
      await resolver.updateTaskStatuses()

      updated = await taskManager.getTask(task3.id)
      expect(updated?.status).toBe(TaskStatus.PENDING)
    })
  })

  describe('validateDependencies', () => {
    it('should detect circular dependencies', async () => {
      const task1 = await taskManager.createTask({
        title: 'Task 1',
        description: 'First task',
        dependencies: []
      })

      const task2 = await taskManager.createTask({
        title: 'Task 2',
        description: 'Second task',
        dependencies: [task1.id]
      })

      await taskManager['updateTaskStatus'](task1.id, TaskStatus.BLOCKED, {
        dependencies: [task2.id]
      })

      const result = await resolver.validateDependencies([task1.id, task2.id])

      expect(result.valid).toBe(false)
      expect(result.cycle).toBeDefined()
      expect(result.cycle?.length).toBeGreaterThan(0)
    })

    it('should pass validation for valid dependency graph', async () => {
      const task1 = await taskManager.createTask({
        title: 'Task 1',
        description: 'First task'
      })

      const task2 = await taskManager.createTask({
        title: 'Task 2',
        description: 'Second task',
        dependencies: [task1.id]
      })

      const task3 = await taskManager.createTask({
        title: 'Task 3',
        description: 'Third task',
        dependencies: [task2.id]
      })

      const result = await resolver.validateDependencies([task1.id, task2.id, task3.id])

      expect(result.valid).toBe(true)
      expect(result.cycle).toBeUndefined()
    })
  })

  describe('getReadyTasks', () => {
    it('should return only PENDING tasks', async () => {
      await taskManager.createTask({ title: 'Task 1', description: 'Desc 1' })
      await taskManager.createTask({ title: 'Task 2', description: 'Desc 2', dependencies: ['dep1'] })
      await taskManager.createTask({ title: 'Task 3', description: 'Desc 3' })

      const ready = await resolver.getReadyTasks()

      expect(ready).toHaveLength(2)
      expect(ready.every(t => t.status === TaskStatus.PENDING)).toBe(true)
    })
  })
})
