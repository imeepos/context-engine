import { Injectable, Tool, ToolArg } from '@sker/core'
import { z } from 'zod'
import { TaskManagerService } from '../services/task-manager.service'
import { TaskDependencyResolverService } from '../services/task-dependency-resolver.service'
import { TaskMutationErrorCode } from '../types/task'

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
    taskId: string,
    @ToolArg({ zod: z.number().int().nonnegative().optional().describe('Expected task version for optimistic locking'), paramName: 'expectedVersion' })
    expectedVersion?: number
  ) {
    const result = await this.taskManager.completeTask(taskId, expectedVersion)

    if (!result.success) {
      const error = result.code === TaskMutationErrorCode.VERSION_CONFLICT
        ? 'Task changed by another agent, please refresh and retry'
        : (result.message || 'Task update failed')
      return { success: false, error, code: result.code, details: result }
    }

    await this.dependencyResolver.updateTaskStatuses()

    return { success: true, task: result.task }
  }
}
