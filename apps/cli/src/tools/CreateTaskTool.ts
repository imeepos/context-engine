import { Injectable, Tool, ToolArg, Inject } from '@sker/core'
import { z } from 'zod'
import { TaskManagerService } from '../services/task-manager.service'
import { TaskDependencyResolverService } from '../services/task-dependency-resolver.service'
import { CURRENT_AGENT_ID } from '../tokens'

@Injectable()
export class CreateTaskTool {
  constructor(
    private taskManager: TaskManagerService,
    private dependencyResolver: TaskDependencyResolverService,
    @Inject(CURRENT_AGENT_ID) private currentAgentId: string
  ) {}

  @Tool({
    name: 'create_task',
    description: 'Create a new task'
  })
  async execute(
    @ToolArg({ zod: z.string().min(1).describe('Task title'), paramName: 'title' })
    title: string,
    @ToolArg({ zod: z.string().min(1).describe('Task description'), paramName: 'description' })
    description: string,
    @ToolArg({ zod: z.string().optional().describe('Parent task ID'), paramName: 'parentId' })
    parentId?: string,
    @ToolArg({ zod: z.array(z.string()).optional().describe('Dependency task IDs'), paramName: 'dependencies' })
    dependencies?: string[],
    @ToolArg({ zod: z.record(z.string(), z.any()).optional().describe('Task metadata'), paramName: 'metadata' })
    metadata?: Record<string, any>
  ) {
    const task = await this.taskManager.createTask({
      title,
      description,
      createdBy: this.currentAgentId,
      parentId,
      dependencies,
      metadata
    })

    if (task.dependencies.length > 0) {
      await this.dependencyResolver.updateTaskStatuses()
    }

    return {
      success: true,
      task: {
        id: task.id,
        title: task.title,
        status: task.status,
        dependencies: task.dependencies
      }
    }
  }
}
