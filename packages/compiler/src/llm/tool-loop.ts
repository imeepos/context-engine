import { Injectable, Inject } from '@sker/core';
import { UnifiedToolExecutor, UnifiedToolResult } from './tool-executor';
import { UnifiedMessageBuilder } from './message-builder';
import { LLMProviderAdapter } from './adapter';
import { UnifiedRequestAst, UnifiedResponseAst, UnifiedToolUseContent, UnifiedMessage, UnifiedTool } from '../ast';

export interface ToolLoopOptions {
  maxIterations?: number;
  onToolCall?: (toolUse: UnifiedToolUseContent) => void;
  onToolResult?: (result: UnifiedToolResult) => void;
  onAfterToolExecution?: () => Promise<string>;
}

@Injectable()
export class ToolCallLoop {
  constructor(@Inject(UnifiedToolExecutor) private toolExecutor: UnifiedToolExecutor) { }

  async execute(
    adapter: LLMProviderAdapter,
    request: UnifiedRequestAst,
    tools: UnifiedTool[],
    options: ToolLoopOptions = {}
  ): Promise<UnifiedResponseAst> {
    const maxIterations = options.maxIterations ?? 100;
    let currentRequest = Object.assign(Object.create(Object.getPrototypeOf(request)), request);
    let iteration = 0;
    while (iteration < maxIterations) {
      const response = await adapter.chat(currentRequest);

      if (response.stopReason !== 'tool_use') {
        return response;
      }

      const toolUses = this.extractToolUses(response);
      if (toolUses.length === 0) {
        return response;
      }

      const results = await this.toolExecutor.executeAll(toolUses, tools);
      toolUses.forEach(tu => options.onToolCall?.(tu));
      results.forEach(r => options.onToolResult?.(r));

      const updatedMessages = this.appendToolResults(currentRequest, response, results);

      // 工具执行后重新渲染提示词
      if (options.onAfterToolExecution) {
        const newSystemPrompt = await options.onAfterToolExecution();
        currentRequest = Object.assign(Object.create(Object.getPrototypeOf(request)), currentRequest, {
          messages: updatedMessages,
          system: newSystemPrompt
        });
      } else {
        currentRequest = Object.assign(Object.create(Object.getPrototypeOf(request)), currentRequest, {
          messages: updatedMessages
        });
      }
      iteration++;
    }

    throw new Error(`Tool loop exceeded max iterations (${maxIterations})`);
  }

  private extractToolUses(response: UnifiedResponseAst): UnifiedToolUseContent[] {
    return response.content.filter(
      (c): c is UnifiedToolUseContent => c.type === 'tool_use'
    );
  }

  private appendToolResults(
    request: UnifiedRequestAst,
    response: UnifiedResponseAst,
    results: UnifiedToolResult[]
  ): UnifiedMessage[] {
    return UnifiedMessageBuilder.appendToolResults(
      request.messages,
      response.content,
      results
    );
  }
}
