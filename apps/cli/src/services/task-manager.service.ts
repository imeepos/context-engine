import { Inject, Injectable } from '@sker/core'
import { JsonFileStorage } from '../storage/json-file-storage'
import {
  Task,
  TaskMutationErrorCode,
  TaskMutationResult,
  TaskRegistry,
  TaskStatus
} from '../types/task'
import { v4 as uuidv4 } from 'uuid'
import { STORAGE_TOKEN } from '../storage/storage.interface'

@Injectable({ providedIn: 'auto' })
export class TaskManagerService {
  private readonly STORAGE_KEY = 'tasks'
  private readonly MAX_RETRIES = 3

  constructor(@Inject(STORAGE_TOKEN) private storage: JsonFileStorage) { }

  async init(): Promise<void> {
    const registry = await this.storage.read<TaskRegistry>(this.STORAGE_KEY)
    if (!registry) {
      await this.storage.write(this.STORAGE_KEY, { tasks: {}, version: 0 })
      return
    }
    const normalized = this.normalizeRegistry(registry)
    if (normalized !== registry) {
      await this.storage.write(this.STORAGE_KEY, normalized)
    }
  }

  async createTask(params: {
    title: string
    description: string
    createdBy: string
    parentId?: string | null
    dependencies?: string[]
    metadata?: Record<string, any>
  }): Promise<Task> {
    const now = Date.now()
    const task: Task = {
      id: uuidv4(),
      parentId: params.parentId || null,
      title: params.title,
      description: params.description,
      version: 0,
      status: params.dependencies?.length ? TaskStatus.BLOCKED : TaskStatus.PENDING,
      assignedTo: null,
      createdBy: params.createdBy,
      createdAt: now,
      updatedAt: now,
      claimedAt: null,
      completedAt: null,
      dependencies: params.dependencies || [],
      metadata: params.metadata || {}
    }

    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      const registry = await this.getRegistry()
      const fromVersion = registry.version
      const updatedRegistry: TaskRegistry = {
        ...registry,
        version: registry.version + 1,
        tasks: {
          ...registry.tasks,
          [task.id]: task
        }
      }

      const success = await this.storage.writeIfVersion(
        this.STORAGE_KEY,
        updatedRegistry,
        fromVersion
      )

      if (success) {
        this.logWrite({
          operation: 'createTask',
          taskId: task.id,
          fromVersion,
          toVersion: updatedRegistry.version,
          actor: params.createdBy
        })
        return task
      }

      await this.sleep(100 * Math.pow(2, attempt))
    }

    throw new Error(`Failed to create task due to repeated version conflicts: ${task.id}`)
  }

  async claimTask(
    taskId: string,
    agentId: string,
    expectedVersion?: number
  ): Promise<TaskMutationResult> {
    const agentTasks = await this.getTasksByAgent(agentId)
    const hasInProgressTask = agentTasks.some(t => t.status === TaskStatus.IN_PROGRESS)
    if (hasInProgressTask) {
      return {
        success: false,
        code: TaskMutationErrorCode.AGENT_HAS_ACTIVE_TASK,
        message: 'Agent already has a task in progress',
        taskId
      }
    }

    const result = await this.withTaskMutation(
      'claimTask',
      taskId,
      expectedVersion,
      agentId,
      task => {
        if (task.status !== TaskStatus.PENDING || task.assignedTo) {
          return {
            success: false,
            code: TaskMutationErrorCode.INVALID_STATE,
            message: 'Task is not claimable'
          }
        }

        return {
          success: true,
          nextTask: {
            ...task,
            version: task.version + 1,
            status: TaskStatus.IN_PROGRESS,
            assignedTo: agentId,
            claimedAt: Date.now(),
            updatedAt: Date.now()
          }
        }
      }
    )

    return result
  }

  async completeTask(taskId: string, expectedVersion?: number): Promise<TaskMutationResult> {
    return this.updateTaskStatus(taskId, TaskStatus.COMPLETED, {
      completedAt: Date.now()
    }, expectedVersion, 'completeTask')
  }

  async failTask(taskId: string, expectedVersion?: number): Promise<TaskMutationResult> {
    return this.updateTaskStatus(taskId, TaskStatus.FAILED, {}, expectedVersion, 'failTask')
  }

  async cancelTask(taskId: string, expectedVersion?: number): Promise<TaskMutationResult> {
    return this.updateTaskStatus(taskId, TaskStatus.PENDING, {
      assignedTo: null,
      claimedAt: null
    }, expectedVersion, 'cancelTask')
  }

  async getTask(taskId: string): Promise<Task | null> {
    const registry = await this.getRegistry()
    return registry.tasks[taskId] || null
  }

  async getTasksByStatus(status: TaskStatus): Promise<Task[]> {
    const registry = await this.getRegistry()
    return Object.values(registry.tasks).filter(t => t.status === status)
  }

  async getTasksByAgent(agentId: string): Promise<Task[]> {
    const registry = await this.getRegistry()
    return Object.values(registry.tasks).filter(t => t.assignedTo === agentId)
  }

  async getSubtasks(parentId: string): Promise<Task[]> {
    const registry = await this.getRegistry()
    return Object.values(registry.tasks).filter(t => t.parentId === parentId)
  }

  async updateTask(
    taskId: string,
    updates: Partial<Omit<Task, 'id' | 'createdAt'>>,
    expectedVersion?: number
  ): Promise<TaskMutationResult> {
    return this.withTaskMutation(
      'updateTask',
      taskId,
      expectedVersion,
      undefined,
      task => ({
        success: true,
        nextTask: {
          ...task,
          ...updates,
          version: task.version + 1,
          updatedAt: Date.now()
        }
      })
    )
  }

  async deleteTask(taskId: string, expectedVersion?: number): Promise<TaskMutationResult> {
    const attempts = typeof expectedVersion === 'number' ? 1 : this.MAX_RETRIES

    for (let attempt = 0; attempt < attempts; attempt++) {
      const registry = await this.getRegistry()
      const task = registry.tasks[taskId]
      if (!task) {
        return {
          success: false,
          code: TaskMutationErrorCode.TASK_NOT_FOUND,
          message: 'Task not found',
          taskId
        }
      }

      if (typeof expectedVersion === 'number' && task.version !== expectedVersion) {
        return {
          success: false,
          code: TaskMutationErrorCode.VERSION_CONFLICT,
          message: 'Task version conflict',
          taskId,
          expectedVersion,
          currentVersion: task.version
        }
      }

      const fromVersion = registry.version
      const { [taskId]: _, ...remainingTasks } = registry.tasks
      const updatedRegistry: TaskRegistry = {
        ...registry,
        tasks: remainingTasks,
        version: registry.version + 1
      }

      const success = await this.storage.writeIfVersion(
        this.STORAGE_KEY,
        updatedRegistry,
        registry.version
      )

      if (success) {
        this.logWrite({
          operation: 'deleteTask',
          taskId,
          fromVersion,
          toVersion: updatedRegistry.version
        })
        return { success: true, taskId }
      }

      if (typeof expectedVersion === 'number') {
        return {
          success: false,
          code: TaskMutationErrorCode.VERSION_CONFLICT,
          message: 'Registry version conflict',
          taskId
        }
      }

      await this.sleep(100 * Math.pow(2, attempt))
    }

    return {
      success: false,
      code: TaskMutationErrorCode.VERSION_CONFLICT,
      message: 'Unable to apply mutation after retries',
      taskId
    }
  }

  private async updateTaskStatus(
    taskId: string,
    status: TaskStatus,
    updates: Partial<Task> = {},
    expectedVersion?: number,
    operation = 'updateTaskStatus'
  ): Promise<TaskMutationResult> {
    return this.withTaskMutation(
      operation,
      taskId,
      expectedVersion,
      undefined,
      task => ({
        success: true,
        nextTask: {
          ...task,
          ...updates,
          version: task.version + 1,
          status,
          updatedAt: Date.now()
        }
      })
    )
  }

  async getRegistry(): Promise<TaskRegistry> {
    const registry = await this.storage.read<TaskRegistry>(this.STORAGE_KEY)
    return this.normalizeRegistry(registry || { tasks: {}, version: 0 })
  }

  private async withTaskMutation(
    operation: string,
    taskId: string,
    expectedVersion: number | undefined,
    actor: string | undefined,
    mutator: (task: Task) => {
      success: true
      nextTask: Task
    } | {
      success: false
      code: TaskMutationErrorCode
      message: string
    }
  ): Promise<TaskMutationResult> {
    const attempts = typeof expectedVersion === 'number' ? 1 : this.MAX_RETRIES

    for (let attempt = 0; attempt < attempts; attempt++) {
      const registry = await this.getRegistry()
      const task = registry.tasks[taskId]
      if (!task) {
        return {
          success: false,
          code: TaskMutationErrorCode.TASK_NOT_FOUND,
          message: 'Task not found',
          taskId
        }
      }

      if (typeof expectedVersion === 'number' && task.version !== expectedVersion) {
        return {
          success: false,
          code: TaskMutationErrorCode.VERSION_CONFLICT,
          message: 'Task version conflict',
          taskId,
          expectedVersion,
          currentVersion: task.version
        }
      }

      const next = mutator(task)
      if (!next.success) {
        return {
          success: false,
          code: next.code,
          message: next.message,
          taskId,
          currentVersion: task.version,
          expectedVersion
        }
      }

      const fromVersion = registry.version
      const updatedRegistry: TaskRegistry = {
        ...registry,
        version: registry.version + 1,
        tasks: {
          ...registry.tasks,
          [taskId]: next.nextTask
        }
      }

      const success = await this.storage.writeIfVersion(
        this.STORAGE_KEY,
        updatedRegistry,
        registry.version
      )

      if (success) {
        this.logWrite({
          operation,
          taskId,
          fromVersion,
          toVersion: updatedRegistry.version,
          actor
        })
        return {
          success: true,
          task: next.nextTask,
          taskId,
          expectedVersion,
          currentVersion: next.nextTask.version
        }
      }

      if (typeof expectedVersion === 'number') {
        return {
          success: false,
          code: TaskMutationErrorCode.VERSION_CONFLICT,
          message: 'Registry version conflict',
          taskId,
          expectedVersion,
          currentVersion: task.version
        }
      }

      await this.sleep(100 * Math.pow(2, attempt))
    }

    return {
      success: false,
      code: TaskMutationErrorCode.VERSION_CONFLICT,
      message: 'Unable to apply mutation after retries',
      taskId,
      expectedVersion
    }
  }

  private normalizeRegistry(registry: TaskRegistry): TaskRegistry {
    let changed = false
    const tasks: Record<string, Task> = {}

    for (const [taskId, task] of Object.entries(registry.tasks || {})) {
      const normalizedTask: Task = {
        ...task,
        version: typeof task.version === 'number' ? task.version : 0
      }
      if (normalizedTask.version !== task.version) {
        changed = true
      }
      tasks[taskId] = normalizedTask
    }

    if (!changed) {
      return registry
    }

    return {
      ...registry,
      tasks
    }
  }

  private logWrite(params: {
    operation: string
    taskId: string
    fromVersion: number
    toVersion: number
    actor?: string
  }): void {
    console.info(
      `[task-write] op=${params.operation} taskId=${params.taskId} fromVersion=${params.fromVersion} toVersion=${params.toVersion} actor=${params.actor || 'unknown'}`
    )
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
