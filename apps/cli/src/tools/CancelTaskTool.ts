import { Injectable, Tool, ToolArg } from '@sker/core'
import { z } from 'zod'
import { TaskManagerService } from '../services/task-manager.service'
import { TaskMutationErrorCode } from '../types/task'

@Injectable()
export class CancelTaskTool {
  constructor(private taskManager: TaskManagerService) {}

  @Tool({
    name: 'cancel_task',
    description: 'Cancel a task (only creator can cancel)'
  })
  async execute(
    @ToolArg({ zod: z.string().describe('Task ID to cancel'), paramName: 'taskId' })
    taskId: string,
    @ToolArg({ zod: z.number().int().nonnegative().optional().describe('Expected task version for optimistic locking'), paramName: 'expectedVersion' })
    expectedVersion?: number
  ) {
    const result = await this.taskManager.cancelTask(taskId, expectedVersion)

    if (!result.success) {
      const error = result.code === TaskMutationErrorCode.VERSION_CONFLICT
        ? 'Task changed by another agent, please refresh and retry'
        : (result.message || 'Task update failed')
      return { success: false, error, code: result.code, details: result }
    }

    return { success: true, task: result.task }
  }
}
