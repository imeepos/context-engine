import { Injectable, Tool, ToolArg } from '@sker/core'
import { z } from 'zod'
import { TaskManagerService } from '../services/task-manager.service'
import { TaskDependencyResolverService } from '../services/task-dependency-resolver.service'

@Injectable()
export class CompleteTaskTool {
  constructor(
    private taskManager: TaskManagerService,
    private dependencyResolver: TaskDependencyResolverService
  ) {}

  @Tool({
    name: 'complete_task',
    description: 'Mark a task as completed'
  })
  async execute(
    @ToolArg({ zod: z.string().describe('Task ID to complete'), paramName: 'taskId' })
    taskId: string
  ) {
    const success = await this.taskManager.completeTask(taskId)

    if (!success) {
      return { success: false, error: 'Task not found' }
    }

    await this.dependencyResolver.updateTaskStatuses()

    const task = await this.taskManager.getTask(taskId)
    return { success: true, task }
  }
}
