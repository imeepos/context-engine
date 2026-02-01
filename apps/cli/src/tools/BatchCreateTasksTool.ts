import { Injectable, Tool, ToolArg } from '@sker/core'
import { z } from 'zod'
import { TaskManagerService } from '../services/task-manager.service'
import { TaskDependencyResolverService } from '../services/task-dependency-resolver.service'

@Injectable()
export class BatchCreateTasksTool {
  constructor(
    private taskManager: TaskManagerService,
    private dependencyResolver: TaskDependencyResolverService
  ) { }

  @Tool({
    name: 'batch_create_tasks',
    description: 'Create multiple tasks with dependencies'
  })
  async execute(
    @ToolArg({
      zod: z.array(z.object({
        title: z.string().min(1),
        description: z.string().min(1),
        parentId: z.string().optional(),
        dependencies: z.array(z.string()).optional(),
        metadata: z.record(z.string(), z.any()).optional()
      })),
      paramName: 'tasks'
    })
    tasks: Array<{
      title: string
      description: string
      parentId?: string
      dependencies?: string[]
      metadata?: Record<string, any>
    }>
  ) {
    const createdTasks = []

    for (const taskInput of tasks) {
      const task = await this.taskManager.createTask(taskInput)
      createdTasks.push({
        id: task.id,
        title: task.title,
        status: task.status,
        dependencies: task.dependencies
      })
    }

    const taskIds = createdTasks.map(t => t.id)
    const validation = await this.dependencyResolver.validateDependencies(taskIds)

    if (!validation.valid) {
      return {
        success: false,
        error: 'Circular dependency detected',
        cycle: validation.cycle
      }
    }

    await this.dependencyResolver.updateTaskStatuses()

    return {
      success: true,
      tasks: createdTasks
    }
  }
}
