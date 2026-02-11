import { Injectable, Tool, ToolArg } from '@sker/core'
import { z } from 'zod'
import { TaskManagerService } from '../services/task-manager.service'
import { AgentRegistryService } from '../services/agent-registry.service'
import { TaskMutationErrorCode } from '../types/task'

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
    taskId: string,
    @ToolArg({ zod: z.number().int().nonnegative().optional().describe('Expected task version for optimistic locking'), paramName: 'expectedVersion' })
    expectedVersion?: number
  ) {
    const currentAgent = this.agentRegistry.getCurrentAgent()
    if (!currentAgent) {
      return { success: false, error: 'No current agent registered' }
    }

    const result = await this.taskManager.claimTask(taskId, currentAgent.id, expectedVersion)

    if (!result.success) {
      const error = result.code === TaskMutationErrorCode.VERSION_CONFLICT
        ? 'Task changed by another agent, please refresh and retry'
        : (result.message || 'Failed to claim task')
      return { success: false, error, code: result.code, details: result }
    }

    return { success: true, task: result.task }
  }
}
