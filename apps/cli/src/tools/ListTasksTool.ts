import { Injectable, Tool, ToolArg } from '@sker/core'
import { z } from 'zod'
import { TaskManagerService } from '../services/task-manager.service'

@Injectable()
export class ListTasksTool {
  constructor(private taskManager: TaskManagerService) {}

  @Tool({
    name: 'list_tasks',
    description: 'List tasks with optional filters'
  })
  async execute(
    @ToolArg({
      zod: z.enum(['pending', 'blocked', 'in_progress', 'completed', 'failed', 'cancelled']).optional().describe('Filter by status'),
      paramName: 'status'
    })
    status?: string,
    @ToolArg({ zod: z.string().optional().describe('Filter by agent ID'), paramName: 'agentId' })
    agentId?: string
  ) {
    let tasks

    if (status) {
      tasks = await this.taskManager.getTasksByStatus(status as any)
    } else if (agentId) {
      tasks = await this.taskManager.getTasksByAgent(agentId)
    } else {
      const registry = await this.taskManager['getRegistry']()
      tasks = Object.values(registry.tasks)
    }

    return { success: true, tasks, count: tasks.length }
  }
}
