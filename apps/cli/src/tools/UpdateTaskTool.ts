import { Injectable, Tool, ToolArg } from '@sker/core'
import { z } from 'zod'
import { TaskManagerService } from '../services/task-manager.service'

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
    metadata?: Record<string, any>
  ) {
    const task = await this.taskManager.getTask(taskId)
    if (!task) {
      return { success: false, error: 'Task not found' }
    }

    const updates: any = {}
    if (title) updates.title = title
    if (description) updates.description = description
    if (metadata) updates.metadata = { ...task.metadata, ...metadata }

    await this.taskManager['updateTaskStatus'](taskId, task.status, updates)

    const updated = await this.taskManager.getTask(taskId)
    return { success: true, task: updated }
  }
}
