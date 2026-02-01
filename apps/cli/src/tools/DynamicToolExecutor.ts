import { Injectable, Tool, ToolArg } from '@sker/core'
import { z } from 'zod'
import { toolRegistry } from '../state/tool-registry'

@Injectable()
export class DynamicToolExecutor {
  @Tool({
    name: 'execute_dynamic_tool',
    description: '执行动态注册的工具'
  })
  async execute(
    @ToolArg({ zod: z.string().describe('工具ID'), paramName: 'tool_id' })
    toolId: string
  ) {
    try {
      const result = await toolRegistry.execute(toolId)
      return {
        success: true,
        result
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      }
    }
  }
}
