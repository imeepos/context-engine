import { Inject, Injectable, Injector } from '@sker/core';
import { UnifiedToolUseContent, UnifiedTool } from '../ast';
import { isRenderResult, RenderResult, ToolLoopOptions } from './tool-loop';

export interface UnifiedToolResult {
  toolUseId: string;
  toolName: string;
  content: string;
  isError?: boolean;
  duration?: number;
}

@Injectable()
export class UnifiedToolExecutor {
  constructor(@Inject(Injector) private injector: Injector) { }

  async execute(toolUse: UnifiedToolUseContent, tools: UnifiedTool[]): Promise<UnifiedToolResult> {
    const startTime = Date.now();
    try {
      const tool = tools.find(t => t.name === toolUse.name);
      if (!tool) {
        return {
          toolUseId: toolUse.id,
          toolName: toolUse.name,
          content: `Tool '${toolUse.name}' not found`,
          isError: true,
          duration: Date.now() - startTime
        };
      }
      const result = await tool.execute(toolUse.input, this.injector);
      if (isRenderResult(result)) {
        return {
          toolUseId: toolUse.id,
          toolName: toolUse.name,
          content: result.prompt,
          isError: false,
          duration: Date.now() - startTime
        };
      }
      return {
        toolUseId: toolUse.id,
        toolName: toolUse.name,
        content: typeof result === 'string' ? result : JSON.stringify(result),
        isError: false,
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        toolUseId: toolUse.id,
        toolName: toolUse.name,
        content: error instanceof Error ? error.message : String(error),
        isError: true,
        duration: Date.now() - startTime
      };
    }
  }

  async executeAll(toolUses: UnifiedToolUseContent[], tools: UnifiedTool[], options: ToolLoopOptions): Promise<UnifiedToolResult[]> {
    return Promise.all(toolUses.map(async tu => {
      if (options.onToolBefore) {
        await options.onToolBefore(tu)
      }
      const result = await this.execute(tu, tools)
      if (options.onToolAfter) {
        await options.onToolAfter(tu, result)
      }
      return result;
    }));
  }
}
