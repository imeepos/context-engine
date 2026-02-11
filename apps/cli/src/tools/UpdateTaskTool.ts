import { Injectable, Tool, ToolArg } from '@sker/core'
import { z } from 'zod'
import { TaskManagerService } from '../services/task-manager.service'
import { TaskMutationErrorCode } from '../types/task'

@Injectable()
export class UpdateTaskTool {
  constructor(private taskManager: TaskManagerService) {}

  @Tool({
    name: 'update_task',
    description: 'Update task details'
  })
  async execute(
    @ToolArg({ zod: z.string().describe('Task ID'), paramName: 'taskId' })
    taskId: string,
    @ToolArg({ zod: z.string().optional().describe('New title'), paramName: 'title' })
    title?: string,
    @ToolArg({ zod: z.string().optional().describe('New description'), paramName: 'description' })
    description?: string,
    @ToolArg({ zod: z.record(z.string(), z.any()).optional().describe('Metadata to merge'), paramName: 'metadata' })
    metadata?: Record<string, any>,
    @ToolArg({ zod: z.number().int().nonnegative().optional().describe('Expected task version for optimistic locking'), paramName: 'expectedVersion' })
    expectedVersion?: number
  ) {
    const task = await this.taskManager.getTask(taskId)
    if (!task) {
      return { success: false, error: 'Task not found' }
    }

    const updates: any = {}
    if (title) updates.title = title
    if (description) updates.description = description
    if (metadata) updates.metadata = { ...task.metadata, ...metadata }

    const result = await this.taskManager.updateTask(taskId, updates, expectedVersion)
    if (!result.success) {
      const error = result.code === TaskMutationErrorCode.VERSION_CONFLICT
        ? 'Task changed by another agent, please refresh and retry'
        : (result.message || 'Task update failed')
      return { success: false, error, code: result.code, details: result }
    }

    return { success: true, task: result.task }
  }
}
