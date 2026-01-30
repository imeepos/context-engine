import { Injectable, Injector, ToolMetadataKey, ToolArgMetadataKey, ToolMetadata, ToolArgMetadata, root } from '@sker/core';
import { UnifiedToolUseContent } from '../ast';
import { buildToolArgsMap } from '../utils/tool-args-map';

export interface UnifiedToolResult {
  toolUseId: string;
  toolName: string;
  content: string;
  isError?: boolean;
}

@Injectable()
export class UnifiedToolExecutor {
  constructor(private injector: Injector) {}

  async execute(toolUse: UnifiedToolUseContent): Promise<UnifiedToolResult> {
    try {
      const toolMetadatas = root.get(ToolMetadataKey) ?? [];
      const toolMeta = toolMetadatas.find((m: ToolMetadata) => m.name === toolUse.name);

      if (!toolMeta) {
        return {
          toolUseId: toolUse.id,
          toolName: toolUse.name,
          content: `Tool '${toolUse.name}' not found`,
          isError: true
        };
      }

      let instance;
      try {
        instance = this.injector.get(toolMeta.target);
      } catch {
        instance = root.get(toolMeta.target);
      }

      const toolArgMetadatas = root.get(ToolArgMetadataKey) ?? [];
      const toolArgsMap = buildToolArgsMap(toolArgMetadatas);
      const key = `${toolMeta.target.name}-${String(toolMeta.propertyKey)}`;
      const args = toolArgsMap.get(key) ?? [];

      const callArgs: any[] = [];
      for (const arg of args.sort((a, b) => a.parameterIndex - b.parameterIndex)) {
        const paramName = arg.paramName ?? `param${arg.paramName}`;
        const value = toolUse.input[paramName];
        callArgs.push(value);
      }

      const method = (instance as any)[toolMeta.propertyKey];
      const result = await method.call(instance, ...callArgs);

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
