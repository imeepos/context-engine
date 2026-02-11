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
  onIterationStart?: (iteration: number) => Promise<void>;
  onIterationEnd?: () => Promise<void>;
  onLLMRequest?: (request: UnifiedRequestAst) => Promise<void>;
  onLLMResponse?: (response: UnifiedResponseAst, duration: number) => Promise<void>;
}

@Injectable()
export class ToolCallLoop {
  constructor(@Inject(UnifiedToolExecutor) private toolExecutor: UnifiedToolExecutor) { }

  async execute(
    adapter: LLMProviderAdapter,
    request: UnifiedRequestAst,
    tools: UnifiedTool[],
    options: ToolLoopOptions = {},
    iteration: number = 0
  ): Promise<UnifiedResponseAst> {
    const maxIterations = options.maxIterations ?? 100;

    if (iteration >= maxIterations) {
      throw new Error(`Tool loop exceeded max iterations (${maxIterations})`);
    }

    if (options.onIterationStart) {
      await options.onIterationStart(iteration);
    }

    let currentRequest = Object.assign(Object.create(Object.getPrototypeOf(request)), request);

    if (options.onLLMRequest) {
      await options.onLLMRequest(currentRequest);
    }

    const startTime = Date.now();
    const response = await adapter.chat(currentRequest);
    const duration = Date.now() - startTime;

    if (options.onLLMResponse) {
      await options.onLLMResponse(response, duration);
    }

    if (response.stopReason !== 'tool_use') {
      if (options.onIterationEnd) {
        await options.onIterationEnd();
      }
      return response;
    }

    const toolUses = this.extractToolUses(response);
    if (toolUses.length === 0) {
      if (options.onIterationEnd) {
        await options.onIterationEnd();
      }
      return response;
    }

    // 调用工具
    const results = await this.toolExecutor.executeAll(toolUses, tools, options);

    if (options.onIterationEnd) {
      await options.onIterationEnd();
    }

    const updatedMessages = this.appendToolResults(currentRequest, response, results);

    // 工具执行后重新渲染提示词（环境）
    if (options.refreshPrompt) {
      const newSystemPrompt = await options.refreshPrompt();
      currentRequest = Object.assign(Object.create(Object.getPrototypeOf(request)), currentRequest, {
        messages: [
          ...updatedMessages
        ],
        tools: newSystemPrompt.tools
      });
      return this.execute(adapter, currentRequest, newSystemPrompt.tools, options, iteration + 1);
    }

    // 没有 refreshPrompt 时，使用传统的工具循环
    currentRequest = Object.assign(Object.create(Object.getPrototypeOf(request)), currentRequest, {
      messages: updatedMessages
    });
    return this.execute(adapter, currentRequest, tools, options, iteration + 1);
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
