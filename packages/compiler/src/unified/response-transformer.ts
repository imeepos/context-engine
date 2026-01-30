/**
 * @fileoverview 统一抽象层响应转换器
 * @description 将各厂商（Anthropic、OpenAI、Google）的响应格式转换为统一格式
 * @version 2.0
 */

import { Ast, UnifiedResponseAst, UnifiedContent, UnifiedStopReason, UnifiedUsage } from '../ast';
import {
  AnthropicResponseAst,
  AnthropicContentBlock,
  AnthropicUsage as AnthropicUsageType
} from '../ast';
import {
  OpenAiResponseAst,
  OpenAiChoice,
  OpenAiUsage as OpenAiUsageType
} from '../ast';
import {
  GoogleResponseAst,
  GoogleCandidate,
  GoogleContentPart,
  GoogleUsageMetadata
} from '../ast';

// ==================== Anthropic 转换器 ====================

/**
 * Anthropic 响应转换器
 * 将 Anthropic API 响应格式转换为统一格式
 */
export class AnthropicToUnifiedTransformer {
  /**
   * 转换 Anthropic 响应为统一响应
   * @param ast Anthropic 响应 AST
   * @returns 统一响应 AST
   */
  transform(ast: AnthropicResponseAst): UnifiedResponseAst {
    const unified = new UnifiedResponseAst();

    // 基本字段转换
    unified.id = ast.id;
    unified.model = ast.model;
    unified.role = 'assistant';
    unified.stopReason = this.mapStopReason(ast.stop_reason);
    unified._provider = 'anthropic';
    unified._original = ast;

    // 内容块转换
    unified.content = ast.content.map((block, index) =>
      this.transformContentBlock(block, index)
    );

    // Usage 转换
    unified.usage = this.transformUsage(ast.usage);

    // 保留 Anthropic 特有字段
    unified._anthropic = {
      stop_sequence: ast.stop_sequence,
      type: ast.type
    };

    return unified;
  }

  /**
   * 转换 Anthropic 内容块为统一内容块
   * @param block Anthropic 内容块
   * @param index 块索引（用于错误追踪）
   * @returns 统一内容块
   */
  private transformContentBlock(block: AnthropicContentBlock, index: number): UnifiedContent {
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
          signature: (block as any).signature
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
          toolUseId: (block as any).tool_use_id,
          content: (block as any).content,
          isError: (block as any).is_error
        };

      default:
        throw new Error(`Unknown Anthropic content block type: ${(block as any).type} at index ${index}`);
    }
  }

  /**
   * 转换 Anthropic Usage 为统一 Usage
   * @param usage Anthropic 使用量统计
   * @returns 统一使用量统计
   */
  private transformUsage(usage: AnthropicUsageType): UnifiedUsage {
    return {
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
      totalTokens: usage.input_tokens + usage.output_tokens
    };
  }

  /**
   * 映射 Anthropic 停止原因到统一停止原因
   * @param reason Anthropic 停止原因
   * @returns 统一停止原因
   */
  private mapStopReason(reason: string): UnifiedStopReason {
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

// ==================== OpenAI 转换器 ====================

/**
 * OpenAI 响应转换器
 * 将 OpenAI API 响应格式转换为统一格式
 */
export class OpenAIToUnifiedTransformer {
  /**
   * 转换 OpenAI 响应为统一响应
   * @param ast OpenAI 响应 AST
   * @returns 统一响应 AST
   */
  transform(ast: OpenAiResponseAst): UnifiedResponseAst {
    const unified = new UnifiedResponseAst();
    const choice = ast.choices?.[0];

    // 基本字段转换
    unified.id = ast.id;
    unified.model = ast.model;
    unified.role = 'assistant';
    unified._provider = 'openai';
    unified._original = ast;

    // 内容转换
    unified.content = this.transformContent(choice);

    // 停止原因
    unified.stopReason = this.mapStopReason(choice?.finish_reason);

    // Usage
    if (ast.usage) {
      unified.usage = this.transformUsage(ast.usage);
    }

    // 保留 OpenAI 特有字段
    unified._openai = {
      object: ast.object,
      created: ast.created,
      system_fingerprint: ast.system_fingerprint
    };

    return unified;
  }

  /**
   * 转换 OpenAI Choice 的内容为统一内容
   * @param choice OpenAI 选择结果
   * @returns 统一内容块数组
   */
  private transformContent(choice?: OpenAiChoice): UnifiedContent[] {
    if (!choice?.delta) {
      return [];
    }

    const content: UnifiedContent[] = [];

    // 文本内容
    if (choice.delta.content) {
      content.push({
        type: 'text',
        text: choice.delta.content
      });
    }

    // reasoning_content (OpenAI 的思考内容)
    if (choice.delta.reasoning_content) {
      content.push({
        type: 'thinking',
        thinking: choice.delta.reasoning_content
      });
    }

    // tool_calls 转换
    if (choice.delta.tool_calls) {
      for (const tc of choice.delta.tool_calls) {
        // OpenAI 的 arguments 是 JSON 字符串，需要解析
        let input: Record<string, unknown> = {};
        if (tc.function?.arguments) {
          try {
            input = JSON.parse(tc.function.arguments);
          } catch (error) {
            console.error('Failed to parse OpenAI function arguments:', error);
          }
        }

        content.push({
          type: 'tool_use',
          id: tc.id ?? '',
          name: tc.function?.name ?? '',
          input
        });
      }
    }

    return content;
  }

  /**
   * 转换 OpenAI Usage 为统一 Usage
   * @param usage OpenAI 使用量统计
   * @returns 统一使用量统计
   */
  private transformUsage(usage: OpenAiUsageType): UnifiedUsage {
    return {
      inputTokens: usage.prompt_tokens,
      outputTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens
    };
  }

  /**
   * 映射 OpenAI 停止原因到统一停止原因
   * @param reason OpenAI 停止原因
   * @returns 统一停止原因
   */
  private mapStopReason(reason: string | null | undefined): UnifiedStopReason {
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
}

// ==================== Google 转换器 ====================

/**
 * Google 响应转换器
 * 将 Google AI API 响应格式转换为统一格式
 */
export class GoogleToUnifiedTransformer {
  /**
   * 转换 Google 响应为统一响应
   * @param ast Google 响应 AST
   * @returns 统一响应 AST
   */
  transform(ast: GoogleResponseAst): UnifiedResponseAst {
    const unified = new UnifiedResponseAst();
    const candidate = ast.candidates?.[0];

    // 基本字段转换
    unified.model = ast.modelVersion;
    unified.role = 'assistant';
    unified._provider = 'google';
    unified._original = ast;

    // 内容转换
    if (candidate?.content?.parts) {
      unified.content = this.transformContent(candidate.content.parts);
    } else {
      unified.content = [];
    }

    // 停止原因
    unified.stopReason = this.mapStopReason(candidate?.finishReason);

    // Usage
    if (ast.usageMetadata) {
      unified.usage = this.transformUsage(ast.usageMetadata);
    }

    // 保留 Google 特有字段
    unified._google = {
      modelVersion: ast.modelVersion,
      finishReason: candidate?.finishReason
    };

    return unified;
  }

  /**
   * 转换 Google 内容部分为统一内容
   * @param parts Google 内容部分数组
   * @returns 统一内容块数组
   */
  private transformContent(parts: GoogleContentPart[]): UnifiedContent[] {
    const content: UnifiedContent[] = [];
    let toolCallIndex = 0;

    for (const part of parts) {
      // 文本部分
      if ('text' in part) {
        content.push({
          type: 'text',
          text: part.text
        });
      }
      // 函数调用部分
      else if ('functionCall' in part) {
        // Google 的 functionCall 没有 id，需要自动生成
        const generatedId = `google_fc_${Date.now()}_${toolCallIndex++}`;

        content.push({
          type: 'tool_use',
          id: generatedId,
          name: part.functionCall.name,
          input: part.functionCall.args as Record<string, unknown>
        });
      }
      // 函数响应部分
      else if ('functionResponse' in part) {
        content.push({
          type: 'tool_result',
          toolUseId: part.functionResponse.name, // 使用函数名作为 toolUseId
          content: part.functionResponse.response.content,
          isError: false
        });
      }
    }

    return content;
  }

  /**
   * 转换 Google UsageMetadata 为统一 Usage
   * @param metadata Google 使用量元数据
   * @returns 统一使用量统计
   */
  private transformUsage(metadata: GoogleUsageMetadata): UnifiedUsage {
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
   * 映射 Google 停止原因到统一停止原因
   * @param reason Google 停止原因
   * @returns 统一停止原因
   */
  private mapStopReason(reason?: string): UnifiedStopReason {
    switch (reason) {
      case 'STOP':
        return 'end_turn';
      case 'MAX_TOKENS':
        return 'max_tokens';
      case 'SAFETY':
        return 'content_filter';
      default:
        return 'end_turn';
    }
  }
}
