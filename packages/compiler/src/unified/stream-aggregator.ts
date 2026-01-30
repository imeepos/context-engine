/**
 * @fileoverview 统一抽象层流式响应聚合器
 * @description 将各厂商（Anthropic、OpenAI、Google）的流式事件聚合为统一响应格式
 * @version 2.0
 */

import { Injectable } from '@sker/core';
import { Observable, reduce, firstValueFrom, scan } from 'rxjs';
import { Ast, UnifiedResponseAst, UnifiedStreamEventAst, UnifiedContent, UnifiedProvider, UnifiedStopReason, UnifiedUsage } from '../ast';
import {
  AnthropicMessageStartAst,
  AnthropicContentBlockStartAst,
  AnthropicContentBlockDeltaAst,
  AnthropicMessageDeltaAst,
  OpenAiResponseAst,
  GoogleResponseAst
} from '../ast';

// ==================== 聚合器接口 ====================

/**
 * 统一流式响应聚合器
 * 用于将各厂商的流式事件聚合为统一的 UnifiedResponseAst
 */
@Injectable()
export class UnifiedStreamAggregator {
  /**
   * 聚合流式事件为统一的 Observable
   * @param stream$ 厂商流式 AST 事件流
   * @returns 统一的响应流
   */
  aggregateStream(stream$: Observable<Ast>): Observable<UnifiedResponseAst> {
    return stream$.pipe(
      scan((acc, ast) => this.aggregateAst(acc, ast), this.createEmptyUnifiedResponse()),
      reduce((acc) => {
        // 流结束时最终化内容块
        return this.finalizeContentBlocks(acc as any);
      })
    );
  }

  /**
   * 同步聚合流式事件，等待流完成
   * @param stream$ 厂商流式 AST 事件流
   * @returns 完整的统一响应
   */
  async aggregateStreamSync(stream$: Observable<Ast>): Promise<UnifiedResponseAst> {
    const result = await firstValueFrom(
      stream$.pipe(
        scan((acc, ast) => this.aggregateAst(acc, ast), this.createEmptyUnifiedResponse())
      )
    );
    return this.finalizeContentBlocks(result);
  }

  // ==================== 核心聚合逻辑 ====================

  /**
   * 聚合单个 AST 事件
   * @param acc 累积的统一响应
   * @param ast 当前 AST 事件
   * @returns 更新后的统一响应
   */
  private aggregateAst(
    acc: UnifiedResponseAst & { _contentBlocks: UnifiedContent[] },
    ast: Ast
  ): UnifiedResponseAst & { _contentBlocks: UnifiedContent[] } {
    // OpenAI 流式事件聚合
    if (ast instanceof OpenAiResponseAst) {
      return this.aggregateOpenAiEvents(acc, ast);
    }

    // Anthropic 流式事件聚合
    if (ast instanceof AnthropicMessageStartAst) {
      return this.aggregateAnthropicEvents(acc, ast);
    }
    if (ast instanceof AnthropicContentBlockStartAst) {
      return this.aggregateAnthropicContentBlockStart(acc, ast);
    }
    if (ast instanceof AnthropicContentBlockDeltaAst) {
      return this.aggregateAnthropicContentBlockDelta(acc, ast);
    }
    if (ast instanceof AnthropicMessageDeltaAst) {
      return this.aggregateAnthropicMessageDelta(acc, ast);
    }

    // Google 流式事件聚合
    if (ast instanceof GoogleResponseAst) {
      return this.aggregateGoogleEvents(acc, ast);
    }

    return acc;
  }

  /**
   * OpenAI 流式事件聚合
   * @param acc 累积的统一响应
   * @param ast OpenAI 响应 AST
   * @returns 更新后的统一响应
   */
  private aggregateOpenAiEvents(
    acc: UnifiedResponseAst & { _contentBlocks: UnifiedContent[] },
    ast: OpenAiResponseAst
  ): UnifiedResponseAst & { _contentBlocks: UnifiedContent[] } {
    // 保留原始信息
    acc._provider = 'openai';
    acc._original = ast;
    acc._openai = {
      object: ast.object,
      created: ast.created,
      system_fingerprint: ast.system_fingerprint
    };

    // 基本字段
    if (!acc.id && ast.id) acc.id = ast.id;
    if (!acc.model && ast.model) acc.model = ast.model;
    if (ast.usage) acc.usage = this.transformOpenAiUsage(ast.usage);

    const choice = ast.choices?.[0];
    if (!choice) return acc;

    // 停止原因
    if (choice.finish_reason) {
      acc.stopReason = this.mapOpenAiStopReason(choice.finish_reason);
    }

    const delta = choice.delta;
    if (!delta) return acc;

    // 角色
    if (!acc.role && delta.role) acc.role = 'assistant';

    // 文本内容增量
    if (delta.content) {
      this.appendTextToContent(acc._contentBlocks, delta.content);
    }

    // reasoning_content (OpenAI 思考内容)
    if (delta.reasoning_content) {
      this.appendThinkingToContent(acc._contentBlocks, delta.reasoning_content);
    }

    // tool_calls 增量聚合
    if (delta.tool_calls) {
      this.aggregateOpenAiToolCalls(acc._contentBlocks, delta.tool_calls);
    }

    return acc;
  }

  /**
   * Anthropic message_start 事件聚合
   * @param acc 累积的统一响应
   * @param ast Anthropic message_start 事件
   * @returns 更新后的统一响应
   */
  private aggregateAnthropicEvents(
    acc: UnifiedResponseAst & { _contentBlocks: UnifiedContent[] },
    ast: AnthropicMessageStartAst
  ): UnifiedResponseAst & { _contentBlocks: UnifiedContent[] } {
    // 保留原始信息
    acc._provider = 'anthropic';
    acc._original = ast;
    acc._anthropic = {
      type: ast.type
    };

    // 基本字段
    acc.id = ast.message.id;
    acc.model = ast.message.model;
    acc.role = ast.message.role || 'assistant';
    if (ast.message.usage) {
      acc.usage = this.transformAnthropicUsage(ast.message.usage);
    }

    return acc;
  }

  /**
   * Anthropic content_block_start 事件聚合
   * @param acc 累积的统一响应
   * @param ast Anthropic content_block_start 事件
   * @returns 更新后的统一响应
   */
  private aggregateAnthropicContentBlockStart(
    acc: UnifiedResponseAst & { _contentBlocks: UnifiedContent[] },
    ast: AnthropicContentBlockStartAst
  ): UnifiedResponseAst & { _contentBlocks: UnifiedContent[] } {
    const block = ast.content_block;
    let contentBlock: UnifiedContent;

    switch (block.type) {
      case 'text':
        contentBlock = {
          type: 'text',
          text: (block as any).text || ''
        };
        break;

      case 'thinking':
        contentBlock = {
          type: 'thinking',
          thinking: (block as any).thinking || '',
          signature: (block as any).signature || ''
        };
        break;

      case 'tool_use':
        contentBlock = {
          type: 'tool_use',
          id: (block as any).id,
          name: (block as any).name,
          input: (block as any).input || {}
        };
        break;

      default:
        // 跳过未知类型
        return acc;
    }

    acc._contentBlocks[ast.index] = contentBlock;
    return acc;
  }

  /**
   * Anthropic content_block_delta 事件聚合
   * @param acc 累积的统一响应
   * @param ast Anthropic content_block_delta 事件
   * @returns 更新后的统一响应
   */
  private aggregateAnthropicContentBlockDelta(
    acc: UnifiedResponseAst & { _contentBlocks: UnifiedContent[] },
    ast: AnthropicContentBlockDeltaAst
  ): UnifiedResponseAst & { _contentBlocks: UnifiedContent[] } {
    const block = acc._contentBlocks[ast.index];
    if (!block) return acc;

    const delta = ast.delta;

    // 文本增量
    if (delta.type === 'text_delta' && (delta as any).text) {
      if (block.type === 'text') {
        block.text += (delta as any).text;
      }
    }
    // 思考增量
    else if (delta.type === 'thinking_delta' && (delta as any).thinking) {
      if (block.type === 'thinking') {
        block.thinking += (delta as any).thinking;
      }
    }
    // 签名增量
    else if (delta.type === 'signature_delta' && (delta as any).signature) {
      if (block.type === 'thinking') {
        block.signature = (block.signature || '') + (delta as any).signature;
      }
    }
    // input_json 增量（工具参数）
    else if (delta.type === 'input_json_delta' && (delta as any).partial_json !== undefined) {
      if (block.type === 'tool_use') {
        const partialJson = (delta as any).partial_json;
        // 尝试解析并合并参数
        try {
          const inputObj = JSON.parse(partialJson);
          block.input = { ...block.input, ...inputObj };
        } catch (error) {
          // 如果解析失败，保留原始字符串
          block.input = { ...block.input, _partialJson: partialJson };
        }
      }
    }

    return acc;
  }

  /**
   * Anthropic message_delta 事件聚合
   * @param acc 累积的统一响应
   * @param ast Anthropic message_delta 事件
   * @returns 更新后的统一响应
   */
  private aggregateAnthropicMessageDelta(
    acc: UnifiedResponseAst & { _contentBlocks: UnifiedContent[] },
    ast: AnthropicMessageDeltaAst
  ): UnifiedResponseAst & { _contentBlocks: UnifiedContent[] } {
    // 停止原因
    if (ast.delta?.stop_reason) {
      acc.stopReason = this.mapAnthropicStopReason(ast.delta.stop_reason);
    }

    // 使用量
    if (ast.usage) {
      if (!acc.usage) {
        acc.usage = this.transformAnthropicUsage(ast.usage);
      } else {
        acc.usage.outputTokens = ast.usage.output_tokens;
        acc.usage.totalTokens = (acc.usage.inputTokens || 0) + ast.usage.output_tokens;
      }
    }

    return acc;
  }

  /**
   * Google 流式事件聚合
   * @param acc 累积的统一响应
   * @param ast Google 响应 AST
   * @returns 更新后的统一响应
   */
  private aggregateGoogleEvents(
    acc: UnifiedResponseAst & { _contentBlocks: UnifiedContent[] },
    ast: GoogleResponseAst
  ): UnifiedResponseAst & { _contentBlocks: UnifiedContent[] } {
    // 保留原始信息
    acc._provider = 'google';
    acc._original = ast;
    acc._google = {
      modelVersion: ast.modelVersion
    };

    // 基本字段
    if (!acc.model) acc.model = ast.modelVersion;
    acc.role = 'assistant';

    // 使用量
    if (ast.usageMetadata) {
      acc.usage = this.transformGoogleUsage(ast.usageMetadata);
    }

    // 内容聚合
    const candidate = ast.candidates?.[0];
    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        // 文本部分
        if ('text' in part) {
          this.appendTextToContent(acc._contentBlocks, part.text);
        }
        // 函数调用部分
        else if ('functionCall' in part) {
          const toolUseContent: UnifiedContent = {
            type: 'tool_use',
            id: `google_fc_${Date.now()}_${acc._contentBlocks.length}`,
            name: part.functionCall.name,
            input: part.functionCall.args as Record<string, unknown>
          };
          acc._contentBlocks.push(toolUseContent);
        }
      }
    }

    return acc;
  }

  // ==================== 辅助方法 ====================

  /**
   * 创建空的统一响应
   * @returns 空的统一响应
   */
  private createEmptyUnifiedResponse(): UnifiedResponseAst & { _contentBlocks: UnifiedContent[] } {
    const unified = new UnifiedResponseAst();
    unified.role = 'assistant';
    unified.content = [];
    (unified as any)._contentBlocks = [];
    return unified as UnifiedResponseAst & { _contentBlocks: UnifiedContent[] };
  }

  /**
   * 最终化内容块
   * @param acc 累积的统一响应
   * @returns 最终的统一响应
   */
  private finalizeContentBlocks(
    acc: UnifiedResponseAst & { _contentBlocks: UnifiedContent[] }
  ): UnifiedResponseAst {
    // 过滤空内容块并复制到 content 字段
    acc.content = acc._contentBlocks.filter((block) => {
      if (block.type === 'text') {
        return block.text && block.text.length > 0;
      }
      if (block.type === 'thinking') {
        return block.thinking && block.thinking.length > 0;
      }
      return true; // 保留 tool_use 等其他类型
    });

    // 清理内部字段
    delete (acc as any)._contentBlocks;

    return acc;
  }

  /**
   * 向内容块列表追加文本
   * @param contentBlocks 内容块列表
   * @param text 追加的文本
   */
  private appendTextToContent(contentBlocks: UnifiedContent[], text: string): void {
    const lastBlock = contentBlocks[contentBlocks.length - 1];
    if (lastBlock && lastBlock.type === 'text') {
      lastBlock.text += text;
    } else {
      contentBlocks.push({
        type: 'text',
        text
      });
    }
  }

  /**
   * 向内容块列表追加思考内容
   * @param contentBlocks 内容块列表
   * @param thinking 追加的思考内容
   */
  private appendThinkingToContent(contentBlocks: UnifiedContent[], thinking: string): void {
    const lastBlock = contentBlocks[contentBlocks.length - 1];
    if (lastBlock && lastBlock.type === 'thinking') {
      lastBlock.thinking += thinking;
    } else {
      contentBlocks.push({
        type: 'thinking',
        thinking
      });
    }
  }

  /**
   * 聚合 OpenAI tool_calls（增量拼接）
   * @param contentBlocks 内容块列表
   * @param toolCalls 工具调用数组
   */
  private aggregateOpenAiToolCalls(
    contentBlocks: UnifiedContent[],
    toolCalls: any[]
  ): void {
    for (const tc of toolCalls) {
      // 查找已存在的 tool_use 块
      let existingBlock = contentBlocks.find(
        (block) => block.type === 'tool_use' && block.id === tc.id
      ) as any;

      if (existingBlock) {
        // 更新已存在的块
        if (tc.function?.name && !existingBlock.name) {
          existingBlock.name = tc.function.name;
        }
        if (tc.function?.arguments) {
          // 尝试解析 arguments 并合并
          try {
            const inputObj = JSON.parse(tc.function.arguments);
            existingBlock.input = { ...existingBlock.input, ...inputObj };
          } catch (error) {
            // 如果解析失败，追加到 _partialJson
            existingBlock.input = {
              ...existingBlock.input,
              _partialJson: (existingBlock.input?._partialJson || '') + tc.function.arguments
            };
          }
        }
      } else {
        // 创建新的 tool_use 块
        let input: Record<string, unknown> = {};
        if (tc.function?.arguments) {
          try {
            input = JSON.parse(tc.function.arguments);
          } catch (error) {
            input = { _partialJson: tc.function.arguments };
          }
        }

        const toolUseContent: UnifiedContent = {
          type: 'tool_use',
          id: tc.id || `tool_${Date.now()}_${contentBlocks.length}`,
          name: tc.function?.name || '',
          input
        };
        contentBlocks.push(toolUseContent);
      }
    }
  }

  /**
   * 转换 OpenAI Usage 为统一 Usage
   * @param usage OpenAI 使用量统计
   * @returns 统一使用量统计
   */
  private transformOpenAiUsage(usage: any): UnifiedUsage {
    return {
      inputTokens: usage.prompt_tokens,
      outputTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens,
      _openai: {
        prompt_tokens_details: usage.prompt_tokens_details,
        completion_tokens_details: usage.completion_tokens_details
      }
    };
  }

  /**
   * 转换 Anthropic Usage 为统一 Usage
   * @param usage Anthropic 使用量统计
   * @returns 统一使用量统计
   */
  private transformAnthropicUsage(usage: any): UnifiedUsage {
    return {
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
      totalTokens: usage.input_tokens + usage.output_tokens,
      _anthropic: {
        cache_creation_input_tokens: usage.cache_creation_input_tokens,
        cache_read_input_tokens: usage.cache_read_input_tokens
      }
    };
  }

  /**
   * 转换 Google UsageMetadata 为统一 Usage
   * @param metadata Google 使用量元数据
   * @returns 统一使用量统计
   */
  private transformGoogleUsage(metadata: any): UnifiedUsage {
    return {
      inputTokens: metadata.promptTokenCount,
      outputTokens: metadata.candidatesTokenCount,
      totalTokens: metadata.totalTokenCount,
      _google: {
        trafficType: metadata.trafficType,
        promptTokensDetails: metadata.promptTokensDetails,
        candidatesTokensDetails: metadata.candidatesTokensDetails,
        thoughtsTokenCount: metadata.thoughtsTokenCount
      }
    };
  }

  /**
   * 映射 OpenAI 停止原因到统一停止原因
   * @param reason OpenAI 停止原因
   * @returns 统一停止原因
   */
  private mapOpenAiStopReason(reason: string | null | undefined): UnifiedStopReason {
    switch (reason) {
      case 'stop':
        return 'end_turn';
      case 'tool_calls':
        return 'tool_use';
      case 'length':
        return 'max_tokens';
      case 'content_filter':
        return 'content_filter';
      default:
        return 'end_turn';
    }
  }

  /**
   * 映射 Anthropic 停止原因到统一停止原因
   * @param reason Anthropic 停止原因
   * @returns 统一停止原因
   */
  private mapAnthropicStopReason(reason: string): UnifiedStopReason {
    switch (reason) {
      case 'end_turn':
        return 'end_turn';
      case 'tool_use':
        return 'tool_use';
      case 'max_tokens':
        return 'max_tokens';
      case 'stop_sequence':
        return 'stop_sequence';
      case 'content_filter':
        return 'content_filter';
      default:
        return 'end_turn';
    }
  }
}
