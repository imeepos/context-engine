import { Injectable, Tool, ToolArg } from '@sker/core'
import { z } from 'zod'
import { TaskManagerService } from '../services/task-manager.service'

@Injectable()
export class GetTaskTool {
  constructor(private taskManager: TaskManagerService) {}

  @Tool({
    name: 'get_task',
    description: 'Get task details by ID'
  })
  async execute(
    @ToolArg({ zod: z.string().describe('Task ID'), paramName: 'taskId' })
    taskId: string
  ) {
    const task = await this.taskManager.getTask(taskId)

    if (!task) {
      return { success: false, error: 'Task not found' }
    }

    const subtasks = await this.taskManager.getSubtasks(taskId)

    return { success: true, task, subtasks }
  }
}
