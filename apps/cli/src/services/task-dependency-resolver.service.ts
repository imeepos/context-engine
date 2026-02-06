import { Inject, Injectable } from '@sker/core'
import { TaskManagerService } from './task-manager.service'
import { Task, TaskStatus } from '../types/task'

@Injectable({ providedIn: 'auto' })
export class TaskDependencyResolverService {
  constructor(@Inject(TaskManagerService) private taskManager: TaskManagerService) { }

  async updateTaskStatuses(): Promise<void> {
    const blockedTasks = await this.taskManager.getTasksByStatus(TaskStatus.BLOCKED)

    for (const task of blockedTasks) {
      const allDepsCompleted = await this.areAllDependenciesCompleted(task)
      if (allDepsCompleted) {
        await this.taskManager['updateTaskStatus'](task.id, TaskStatus.PENDING)
      }
    }
  }

  async validateDependencies(taskIds: string[]): Promise<{ valid: boolean; cycle?: string[] }> {
    const visited = new Set<string>()
    const recStack = new Set<string>()

    for (const taskId of taskIds) {
      const cycle = await this.detectCycle(taskId, visited, recStack, [])
      if (cycle) {
        return { valid: false, cycle }
      }
    }

    return { valid: true }
  }

  async getReadyTasks(): Promise<Task[]> {
    return this.taskManager.getTasksByStatus(TaskStatus.PENDING)
  }

  private async areAllDependenciesCompleted(task: Task): Promise<boolean> {
    for (const depId of task.dependencies) {
      const depTask = await this.taskManager.getTask(depId)
      if (!depTask || depTask.status !== TaskStatus.COMPLETED) {
        return false
      }
    }
    return true
  }

  private async detectCycle(
    taskId: string,
    visited: Set<string>,
    recStack: Set<string>,
    path: string[]
  ): Promise<string[] | null> {
    if (recStack.has(taskId)) {
      return [...path, taskId]
    }

    if (visited.has(taskId)) {
      return null
    }

    visited.add(taskId)
    recStack.add(taskId)
    path.push(taskId)

    const task = await this.taskManager.getTask(taskId)
    if (task) {
      for (const depId of task.dependencies) {
        const cycle = await this.detectCycle(depId, visited, recStack, [...path])
        if (cycle) return cycle
      }
    }

    recStack.delete(taskId)
    return null
  }
}
