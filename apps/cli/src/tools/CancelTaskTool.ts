import { Injectable, Tool, ToolArg } from '@sker/core'
import { z } from 'zod'
import { TaskManagerService } from '../services/task-manager.service'

@Injectable()
export class CancelTaskTool {
  constructor(private taskManager: TaskManagerService) {}

  @Tool({
    name: 'cancel_task',
    description: 'Cancel a task (only creator can cancel)'
  })
  async execute(
    @ToolArg({ zod: z.string().describe('Task ID to cancel'), paramName: 'taskId' })
    taskId: string
  ) {
    const success = await this.taskManager.cancelTask(taskId)

    if (!success) {
      return { success: false, error: 'Task not found' }
    }

    const task = await this.taskManager.getTask(taskId)
    return { success: true, task }
  }
}
