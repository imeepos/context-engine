import { Injectable } from '@sker/core';
import { UnifiedToolUseContent, UnifiedTool } from '../ast';
import { buildUnifiedTools } from '../unified/tool-builder';

export interface UnifiedToolResult {
  toolUseId: string;
  toolName: string;
  content: string;
  isError?: boolean;
}

@Injectable()
export class UnifiedToolExecutor {
  private toolMap: Map<string, UnifiedTool>;

  constructor() {
    const tools = buildUnifiedTools();
    this.toolMap = new Map(tools.map(t => [t.name, t]));
  }

  async execute(toolUse: UnifiedToolUseContent): Promise<UnifiedToolResult> {
    try {
      const tool = this.toolMap.get(toolUse.name);

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

  async executeAll(toolUses: UnifiedToolUseContent[]): Promise<UnifiedToolResult[]> {
    return Promise.all(toolUses.map(tu => this.execute(tu)));
  }
}
