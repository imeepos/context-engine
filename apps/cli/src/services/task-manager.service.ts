import { Inject, Injectable } from '@sker/core'
import { JsonFileStorage } from '../storage/json-file-storage'
import { Task, TaskRegistry, TaskStatus } from '../types/task'
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
    const task: Task = {
      id: uuidv4(),
      parentId: params.parentId || null,
      title: params.title,
      description: params.description,
      status: params.dependencies?.length ? TaskStatus.BLOCKED : TaskStatus.PENDING,
      assignedTo: null,
      createdBy: params.createdBy,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      claimedAt: null,
      completedAt: null,
      dependencies: params.dependencies || [],
      metadata: params.metadata || {}
    }

    const registry = await this.getRegistry()
    registry.tasks[task.id] = task
    registry.version++
    await this.storage.write(this.STORAGE_KEY, registry)

    return task
  }

  async claimTask(taskId: string, agentId: string): Promise<boolean> {
    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      const registry = await this.getRegistry()
      const task = registry.tasks[taskId]

      if (!task || task.status !== TaskStatus.PENDING || task.assignedTo) {
        return false
      }

      const updatedRegistry = {
        ...registry,
        version: registry.version + 1,
        tasks: {
          ...registry.tasks,
          [taskId]: {
            ...task,
            status: TaskStatus.IN_PROGRESS,
            assignedTo: agentId,
            claimedAt: Date.now(),
            updatedAt: Date.now()
          }
        }
      }

      const success = await this.storage.writeIfVersion(
        this.STORAGE_KEY,
        updatedRegistry,
        registry.version
      )

      if (success) return true

      await this.sleep(100 * Math.pow(2, attempt))
    }

    return false
  }

  async completeTask(taskId: string): Promise<boolean> {
    return this.updateTaskStatus(taskId, TaskStatus.COMPLETED, {
      completedAt: Date.now()
    })
  }

  async failTask(taskId: string): Promise<boolean> {
    return this.updateTaskStatus(taskId, TaskStatus.FAILED)
  }

  async cancelTask(taskId: string): Promise<boolean> {
    return this.updateTaskStatus(taskId, TaskStatus.CANCELLED)
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

  async updateTask(taskId: string, updates: Partial<Omit<Task, 'id' | 'createdAt'>>): Promise<boolean> {
    const registry = await this.getRegistry()
    const task = registry.tasks[taskId]

    if (!task) return false

    registry.tasks[taskId] = {
      ...task,
      ...updates,
      updatedAt: Date.now()
    }
    registry.version++

    await this.storage.write(this.STORAGE_KEY, registry)
    return true
  }

  async deleteTask(taskId: string): Promise<boolean> {
    const registry = await this.getRegistry()

    if (!registry.tasks[taskId]) return false

    const { [taskId]: _, ...remainingTasks } = registry.tasks
    registry.tasks = remainingTasks
    registry.version++

    await this.storage.write(this.STORAGE_KEY, registry)
    return true
  }

  private async updateTaskStatus(
    taskId: string,
    status: TaskStatus,
    updates: Partial<Task> = {}
  ): Promise<boolean> {
    const registry = await this.getRegistry()
    const task = registry.tasks[taskId]

    if (!task) return false

    registry.tasks[taskId] = {
      ...task,
      ...updates,
      status,
      updatedAt: Date.now()
    }
    registry.version++

    await this.storage.write(this.STORAGE_KEY, registry)
    return true
  }

  async getRegistry(): Promise<TaskRegistry> {
    const registry = await this.storage.read<TaskRegistry>(this.STORAGE_KEY)
    return registry || { tasks: {}, version: 0 }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
