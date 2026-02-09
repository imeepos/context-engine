import { Injectable } from '@sker/core'
import { AgentRegistryService } from './agent-registry.service'
import { TaskManagerService } from './task-manager.service'
import { TaskStatus } from '../types/task'

@Injectable({ providedIn: 'auto' })
export class TaskRecoveryService {
  private interval: NodeJS.Timeout | null = null
  private readonly RECOVERY_INTERVAL_MS = 30000

  constructor(
    private taskManager: TaskManagerService,
    private agentRegistry: AgentRegistryService
  ) { }

  start(): void {
    if (this.interval) return

    this.interval = setInterval(() => {
      void this.recoverStaleTasks()
    }, this.RECOVERY_INTERVAL_MS)
  }

  stop(): void {
    if (!this.interval) return
    clearInterval(this.interval)
    this.interval = null
  }

  async recoverStaleTasks(): Promise<void> {
    const inProgressTasks = await this.taskManager.getTasksByStatus(TaskStatus.IN_PROGRESS)

    for (const task of inProgressTasks) {
      if (!task.assignedTo) continue

      const isOffline = await this.agentRegistry.isAgentOffline(task.assignedTo)
      if (!isOffline) continue

      const result = await this.taskManager.cancelTask(task.id, task.version)
      if (result.success) {
        console.info(
          `[task-recovery] recovered taskId=${task.id} agentId=${task.assignedTo}`
        )
      }
    }
  }
}
