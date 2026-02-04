import { Injectable, Injector, ToolMetadataKey, ToolMetadata, root, Inject } from '@sker/core';
import { UnifiedToolUseContent } from '../ast';

export interface UnifiedToolResult {
  toolUseId: string;
  toolName: string;
  content: string;
  isError?: boolean;
}

@Injectable()
export class UnifiedToolExecutor {
  constructor(@Inject(Injector) private injector: Injector) {}

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

      const instance = this.injector.get(toolMeta.target);
      const args = toolMeta.parameters;

      const callArgs: any[] = [];
      for (const arg of args.sort((a, b) => a.parameterIndex - b.parameterIndex)) {
        const paramName = arg.paramName ?? `param${arg.parameterIndex}`;
        const value = toolUse.input[paramName];
        // zod校验
        const zodValue = arg.zod.parse(value);
        callArgs.push(zodValue);
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
