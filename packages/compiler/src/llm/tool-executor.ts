import { Injectable } from '@sker/core';
import { UnifiedToolUseContent, UnifiedTool } from '../ast';

export interface UnifiedToolResult {
  toolUseId: string;
  toolName: string;
  content: string;
  isError?: boolean;
}

@Injectable()
export class UnifiedToolExecutor {


  async execute(toolUse: UnifiedToolUseContent, tools: UnifiedTool[]): Promise<UnifiedToolResult> {
    try {
      const tool = tools.find(t => t.name === toolUse.name);
      if (!tool) {
        return {
          toolUseId: toolUse.id,
          toolName: toolUse.name,
          content: `Tool '${toolUse.name}' not found`,
          isError: true
        };
      }

      const result = await tool.execute(toolUse.input);

      return {
        toolUseId: toolUse.id,
        toolName: toolUse.name,
        content: typeof result === 'string' ? result : JSON.stringify(result),
        isError: false
      };
    } catch (error) {
      return {
        toolUseId: toolUse.id,
        toolName: toolUse.name,
        content: error instanceof Error ? error.message : String(error),
        isError: true
      };
    }
  }

  async executeAll(toolUses: UnifiedToolUseContent[], tools: UnifiedTool[]): Promise<UnifiedToolResult[]> {
    return Promise.all(toolUses.map(tu => this.execute(tu, tools)));
  }
}
