import { Injectable, Inject } from '@sker/core';
import { UnifiedToolExecutor, UnifiedToolResult } from './tool-executor';
import { UnifiedMessageBuilder } from './message-builder';
import { LLMProviderAdapter } from './adapter';
import { UnifiedRequestAst, UnifiedResponseAst, UnifiedToolUseContent, UnifiedMessage, UnifiedTool } from '../ast';
export interface RenderResult {
  prompt: string;
  tools: UnifiedTool[];
}
export interface ToolLoopOptions {
  maxIterations?: number;
  onToolBefore?: (toolUse: UnifiedToolUseContent) => Promise<void>;
  onToolAfter?: (params: UnifiedToolUseContent, result: UnifiedToolResult) => Promise<void>;
  refreshPrompt?: () => Promise<RenderResult>;
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
    const response = await adapter.chat(currentRequest);

    if (response.stopReason !== 'tool_use') {
      return response;
    }

    const toolUses = this.extractToolUses(response);
    if (toolUses.length === 0) {
      return response;
    }

    // 调用工具 单轮结束
    const results = await this.toolExecutor.executeAll(toolUses, tools, options);

    const updatedMessages = this.appendToolResults(currentRequest, response, results);
    // 工具执行后重新渲染提示词
    if (options.refreshPrompt) {
      const newSystemPrompt = await options.refreshPrompt();
      console.log(JSON.stringify(updatedMessages, null, 2))
      currentRequest = Object.assign(Object.create(Object.getPrototypeOf(request)), currentRequest, {
        messages: [
          ...updatedMessages,
          { role: 'user', content: newSystemPrompt.prompt }
        ],
        tools: newSystemPrompt.tools
      });
      return this.execute(adapter, currentRequest, newSystemPrompt.tools, options);
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
