import { Injectable, Inject, Injector, ToolMetadataKey, ToolArgMetadataKey, ToolMetadata, ToolArgMetadata, root } from '@sker/core'
import { UnifiedToolResult } from '@sker/compiler'
import { UnifiedToolUseContent } from '@sker/compiler'
import { DynamicToolExecutorService } from './DynamicToolExecutorService'

function buildToolArgsMap(toolArgMetadatas: ToolArgMetadata[]): Map<string, ToolArgMetadata[]> {
  const map = new Map<string, ToolArgMetadata[]>()
  for (const argMeta of toolArgMetadatas) {
    const key = `${argMeta.target.name}-${String(argMeta.propertyKey)}`
    if (!map.has(key)) {
      map.set(key, [])
    }
    map.get(key)!.push(argMeta)
  }
  return map
}

@Injectable()
export class HybridToolExecutor {
  constructor(
    @Inject(Injector) private injector: Injector,
    @Inject(DynamicToolExecutorService) private dynamicExecutor: DynamicToolExecutorService
  ) {}

  async execute(toolUse: UnifiedToolUseContent): Promise<UnifiedToolResult> {
    // 先检查是否是动态工具
    if (this.dynamicExecutor.has(toolUse.name)) {
      try {
        await this.dynamicExecutor.execute(toolUse.name, toolUse.input)
        return {
          toolUseId: toolUse.id,
          toolName: toolUse.name,
          content: JSON.stringify({ success: true }),
          isError: false
        }
      } catch (error) {
        return {
          toolUseId: toolUse.id,
          toolName: toolUse.name,
          content: error instanceof Error ? error.message : String(error),
          isError: true
        }
      }
    }

    // 否则使用静态工具执行逻辑（从 UnifiedToolExecutor 复制）
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
    return Promise.all(toolUses.map(tu => this.execute(tu)))
  }
}
