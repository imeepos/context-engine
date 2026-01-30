/**
 * @fileoverview 统一抽象层反向转换器
 * @description 将 UnifiedResponseAst 转换回各厂商（Anthropic、OpenAI、Google）的原始格式
 * @version 2.0
 */

import { Ast, UnifiedResponseAst, UnifiedContent, UnifiedStopReason, UnifiedUsage } from '../ast';
import {
  AnthropicResponseAst,
  AnthropicContentBlock,
  AnthropicUsage
} from '../ast';
import {
  OpenAiResponseAst,
  OpenAiChoice,
  OpenAiUsage
} from '../ast';
import {
  GoogleResponseAst,
  GoogleCandidate,
  GoogleContent,
  GoogleUsageMetadata,
  GoogleTextPart,
  GoogleFunctionCallPart,
  GoogleFunctionResponsePart,
  GoogleContentPart
} from '../ast';

/**
 * 统一到原始格式反向转换器
 * 实现 "厂商 → Unified → 厂商 = 原始数据" 的无损转换
 */
export class UnifiedToOriginalTransformer {
  /**
   * 将 Unified 响应转换为原始厂商格式
   * 优先使用 _original 实现 100% 无损转换
   * @param unified 统一响应 AST
   * @returns 原始厂商格式的 AST
   */
  toOriginal(unified: UnifiedResponseAst): Ast {
    // 优先使用原始对象（100% 无损）
    if (unified._original) {
      return unified._original;
    }

    // 回退到转换
    if (!unified._provider) {
      throw new Error('Unknown provider: no _original and no _provider specified');
    }

    switch (unified._provider) {
      case 'anthropic':
        return this.toAnthropic(unified);
      case 'openai':
        return this.toOpenAI(unified);
      case 'google':
        return this.toGoogle(unified);
      default:
        throw new Error(`Unknown provider: ${unified._provider}`);
    }
  }

  /**
   * 将 Unified 响应转换为 Anthropic 响应格式
   * @param unified 统一响应 AST
   * @returns Anthropic 响应 AST
   */
  private toAnthropic(unified: UnifiedResponseAst): AnthropicResponseAst {
    const ast = new AnthropicResponseAst();

    // 基本字段
    ast.id = unified.id || '';
    ast.model = unified.model || '';
    ast.role = 'assistant';
    ast.type = unified._anthropic?.type || 'message';

    // 内容转换
    ast.content = unified.content.map((block, index) =>
      this.transformContentBlock(block, index)
    );

    // 停止原因映射
    ast.stop_reason = this.mapStopReasonToAnthropic(unified.stopReason);
    ast.stop_sequence = unified._anthropic?.stop_sequence || null;

    // Usage 转换
    if (unified.usage) {
      ast.usage = this.transformUsageToAnthropic(unified.usage);
    }

    return ast;
  }

  /**
   * 将 Unified 响应转换为 OpenAI 响应格式
   * @param unified 统一响应 AST
   * @returns OpenAI 响应 AST
   */
  private toOpenAI(unified: UnifiedResponseAst): OpenAiResponseAst {
    const ast = new OpenAiResponseAst();

    // 基本字段
    ast.id = unified.id || '';
    ast.model = unified.model || '';
    ast.object = unified._openai?.object || 'chat.completion';
    ast.created = unified._openai?.created || Math.floor(Date.now() / 1000);
    ast.system_fingerprint = unified._openai?.system_fingerprint || '';

    // 内容转换到 choice.delta
    const choice: OpenAiChoice = {
      index: 0,
      finish_reason: this.mapStopReasonToOpenAI(unified.stopReason),
      delta: this.transformContentToOpenAiDelta(unified.content)
    };

    ast.choices = [choice];

    // Usage 转换
    if (unified.usage) {
      ast.usage = this.transformUsageToOpenAI(unified.usage);
    }

    return ast;
  }

  /**
   * 将 Unified 响应转换为 Google 响应格式
   * @param unified 统一响应 AST
   * @returns Google 响应 AST
   */
  private toGoogle(unified: UnifiedResponseAst): GoogleResponseAst {
    const ast = new GoogleResponseAst();

    // 内容转换
    ast.candidates = [{
      content: {
        role: 'model',
        parts: this.transformContentToGoogleParts(unified.content)
      },
      finishReason: this.mapStopReasonToGoogle(unified.stopReason)
    }];

    // Usage 转换
    if (unified.usage) {
      ast.usageMetadata = this.transformUsageToGoogle(unified.usage);
    }

    // Google 特有字段
    ast.modelVersion = unified._google?.modelVersion || unified.model || '';

    return ast;
  }

  /**
   * 转换统一内容块为 Anthropic 内容块
   * @param block 统一内容块
   * @param index 块索引
   * @returns Anthropic 内容块
   */
  private transformContentBlock(block: UnifiedContent, index: number): AnthropicContentBlock {
    switch (block.type) {
      case 'text':
        return {
          type: 'text',
          text: (block as any).text
        };

      case 'thinking':
        return {
          type: 'thinking',
          thinking: (block as any).thinking,
          signature: (block as any).signature || ''
        };

      case 'tool_use':
        return {
          type: 'tool_use',
          id: (block as any).id,
          name: (block as any).name,
          input: (block as any).input
        };

      case 'tool_result':
        return {
          type: 'tool_result',
          tool_use_id: (block as any).toolUseId,
          content: (block as any).content,
          is_error: (block as any).isError
        };

      default:
        throw new Error(`Unknown unified content type: ${(block as any).type} at index ${index}`);
    }
  }

  /**
   * 转换统一内容为 OpenAI Delta 格式
   * @param content 统一内容数组
   * @returns OpenAI Delta
   */
  private transformContentToOpenAiDelta(content: UnifiedContent[]): any {
    const delta: any = {
      content: '',
      role: 'assistant',
      reasoning_content: null,
      tool_calls: []
    };

    // 合并文本内容
    const textContent = content
      .filter((c: any) => c.type === 'text')
      .map((c: any) => c.text)
      .join('');
    if (textContent) {
      delta.content = textContent;
    }

    // 处理 thinking（转为 reasoning_content）
    const thinkingContent = content.find((c: any) => c.type === 'thinking');
    if (thinkingContent) {
      delta.reasoning_content = (thinkingContent as any).thinking;
    }

    // 处理 tool_use（转为 tool_calls）
    const toolUseBlocks = content.filter((c: any) => c.type === 'tool_use');
    if (toolUseBlocks.length > 0) {
      delta.tool_calls = toolUseBlocks.map((tu: any, index: number) => ({
        index,
        id: tu.id,
        type: 'function',
        function: {
          name: tu.name,
          arguments: JSON.stringify(tu.input)  // OpenAI 需要 JSON 字符串
        }
      }));
    }

    return delta;
  }

  /**
   * 转换统一内容为 Google Parts 格式
   * @param content 统一内容数组
   * @returns Google 内容部分数组
   */
  private transformContentToGoogleParts(content: UnifiedContent[]): GoogleContentPart[] {
    return content.map((block: any) => {
      switch (block.type) {
        case 'text':
          return {
            text: block.text
          } as GoogleTextPart;

        case 'tool_use':
          return {
            functionCall: {
              name: block.name,
              args: block.input
            },
            thoughtSignature: ''  // Google 特有字段
          } as GoogleFunctionCallPart;

        case 'tool_result':
          return {
            functionResponse: {
              name: block.toolUseId,  // 使用 toolUseId 作为函数名
              response: {
                content: block.content
              }
            },
            thoughtSignature: ''
          } as GoogleFunctionResponsePart;

        case 'thinking':
          // Google 不支持 thinking，跳过或记录警告
          console.warn('Google does not support thinking content, skipping');
          return {
            text: `[Thinking: ${block.thinking}]`
          } as GoogleTextPart;

        default:
          throw new Error(`Unsupported content type for Google: ${block.type}`);
      }
    });
  }

  /**
   * 转换统一 Usage 为 Anthropic Usage
   * @param usage 统一使用量统计
   * @returns Anthropic 使用量统计
   */
  private transformUsageToAnthropic(usage: UnifiedUsage): AnthropicUsage {
    return {
      input_tokens: usage.inputTokens,
      output_tokens: usage.outputTokens
    };
  }

  /**
   * 转换统一 Usage 为 OpenAI Usage
   * @param usage 统一使用量统计
   * @returns OpenAI 使用量统计
   */
  private transformUsageToOpenAI(usage: UnifiedUsage): OpenAiUsage {
    return {
      prompt_tokens: usage.inputTokens,
      completion_tokens: usage.outputTokens,
      total_tokens: usage.totalTokens || (usage.inputTokens + usage.outputTokens)
    };
  }

  /**
   * 转换统一 Usage 为 Google UsageMetadata
   * @param usage 统一使用量统计
   * @returns Google 使用量元数据
   */
  private transformUsageToGoogle(usage: UnifiedUsage): GoogleUsageMetadata {
    return {
      promptTokenCount: usage.inputTokens,
      candidatesTokenCount: usage.outputTokens,
      totalTokenCount: usage.totalTokens || (usage.inputTokens + usage.outputTokens),
      trafficType: usage._google?.trafficType || '0',
      promptTokensDetails: usage._google?.promptTokensDetails || [],
      candidatesTokensDetails: usage._google?.candidatesTokensDetails || [],
      thoughtsTokenCount: usage._google?.thoughtsTokenCount || 0
    };
  }

  /**
   * 映射统一停止原因到 Anthropic 停止原因
   * @param reason 统一停止原因
   * @returns Anthropic 停止原因
   */
  private mapStopReasonToAnthropic(reason?: UnifiedStopReason): string {
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

  /**
   * 映射统一停止原因到 OpenAI 停止原因
   * @param reason 统一停止原因
   * @returns OpenAI 停止原因
   */
  private mapStopReasonToOpenAI(reason?: UnifiedStopReason): string | null {
    switch (reason) {
      case 'end_turn':
        return 'stop';
      case 'tool_use':
        return 'tool_calls';
      case 'max_tokens':
        return 'length';
      case 'content_filter':
        return 'content_filter';
      default:
        return 'stop';
    }
  }

  /**
   * 映射统一停止原因到 Google 停止原因
   * @param reason 统一停止原因
   * @returns Google 停止原因
   */
  private mapStopReasonToGoogle(reason?: UnifiedStopReason): string {
    switch (reason) {
      case 'end_turn':
        return 'STOP';
      case 'max_tokens':
        return 'MAX_TOKENS';
      case 'content_filter':
        return 'SAFETY';
      default:
        return 'STOP';
    }
  }
}
