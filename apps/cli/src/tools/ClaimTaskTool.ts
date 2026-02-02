import { Injectable, Tool, ToolArg } from '@sker/core'
import { z } from 'zod'
import { TaskManagerService } from '../services/task-manager.service'
import { AgentRegistryService } from '../services/agent-registry.service'

@Injectable()
export class ClaimTaskTool {
  constructor(
    private taskManager: TaskManagerService,
    private agentRegistry: AgentRegistryService
  ) {}

  @Tool({
    name: 'claim_task',
    description: 'Claim a pending task for the current agent'
  })
  async execute(
    @ToolArg({ zod: z.string().describe('Task ID to claim'), paramName: 'taskId' })
    taskId: string
  ) {
    const currentAgent = this.agentRegistry.getCurrentAgent()
    if (!currentAgent) {
      return { success: false, error: 'No current agent registered' }
    }

    const claimed = await this.taskManager.claimTask(taskId, currentAgent.id)

    if (!claimed) {
      return { success: false, error: 'Failed to claim task (already claimed or not pending)' }
    }

    const task = await this.taskManager.getTask(taskId)
    return { success: true, task }
  }
}
