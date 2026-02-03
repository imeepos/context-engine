/**
 * @fileoverview 统一抽象层请求转换器
 * @description 将 UnifiedRequestAst 转换为各厂商（Anthropic、OpenAI、Google）的请求格式
 * @version 2.0
 */

import { UnifiedRequestAst, UnifiedMessage, UnifiedTool } from '../ast';
import {
  AnthropicRequestAst,
  AnthropicRequestMessage,
  AnthropicContentBlock,
  AnthropicTool
} from '../ast';
import {
  OpenAIRequestAst,
  OpenAIRequestMessage,
  OpenAIRequestRole,
  OpenAITool
} from '../ast';
import {
  GoogleRequestAst,
  GoogleContent,
  GoogleContentPart
} from '../ast';

// ==================== Anthropic 转换器 ====================

/**
 * Anthropic 请求转换器
 * 将统一格式转换为 Anthropic API 请求格式
 */
export class UnifiedToAnthropicTransformer {
  /**
   * 转换统一请求为 Anthropic 请求
   * @param unified 统一请求 AST
   * @returns Anthropic 请求 AST
   */
  transform(unified: UnifiedRequestAst): AnthropicRequestAst {
    const ast = new AnthropicRequestAst();

    ast.model = unified.model;
    ast.max_tokens = unified.maxTokens ?? 4096;
    ast.system = unified.system;
    ast.temperature = unified.temperature;
    ast.stream = unified.stream;

    // 消息转换（过滤 system，单独处理）
    ast.messages = unified.messages
      .filter(m => m.role !== 'system')
      .map(m => this.transformMessage(m));

    // 工具转换
    if (unified.tools?.length) {
      ast.tools = unified.tools.map(t => this.transformTool(t));
    }

    return ast;
  }

  /**
   * 转换统一消息为 Anthropic 消息
   * @param msg 统一消息
   * @returns Anthropic 消息
   */
  private transformMessage(msg: UnifiedMessage): AnthropicRequestMessage {
    const role = msg.role === 'tool' ? 'user' : msg.role as 'user' | 'assistant';

    if (typeof msg.content === 'string') {
      return { role, content: msg.content };
    }

    // 数组内容转换
    const content: AnthropicContentBlock[] = msg.content.map((c: any) => {
      switch (c.type) {
        case 'text':
          return { type: 'text', text: c.text };
        case 'thinking':
          return { type: 'thinking', thinking: c.thinking, signature: c.signature ?? '' };
        case 'tool_use':
          return { type: 'tool_use', id: c.id, name: c.name, input: c.input };
        case 'tool_result':
          return { type: 'tool_result', tool_use_id: c.toolUseId, content: c.content, is_error: c.isError };
        case 'image':
          throw new Error('Unsupported content type: image (not supported by Anthropic)');
        default:
          throw new Error(`Unsupported content type: ${(c as any).type}`);
      }
    });

    return { role, content };
  }

  /**
   * 转换统一工具为 Anthropic 工具
   * @param tool 统一工具
   * @returns Anthropic 工具
   */
  private transformTool(tool: UnifiedTool): AnthropicTool {
    return {
      name: tool.name,
      description: tool.description,
      input_schema: {
        type: 'object',
        properties: tool.parameters.properties,
        required: tool.parameters.required
      }
    };
  }
}

// ==================== OpenAI 转换器 ====================

/**
 * OpenAI 请求转换器
 * 将统一格式转换为 OpenAI API 请求格式
 */
export class UnifiedToOpenAITransformer {
  /**
   * 转换统一请求为 OpenAI 请求
   * @param unified 统一请求 AST
   * @returns OpenAI 请求 AST
   */
  transform(unified: UnifiedRequestAst): OpenAIRequestAst {
    const ast = new OpenAIRequestAst();

    ast.model = unified.model;
    ast.max_tokens = unified.maxTokens;
    ast.temperature = unified.temperature;
    ast.stream = unified.stream;

    // 消息转换
    ast.messages = unified.messages.map(m => this.transformMessage(m));

    // 如果有单独的 system，添加到开头
    if (unified.system && !unified.messages.some(m => m.role === 'system')) {
      ast.messages.unshift({ role: 'system', content: unified.system });
    }

    // 工具转换
    if (unified.tools?.length) {
      ast.tools = unified.tools.map(t => this.transformTool(t));
    }

    return ast;
  }

  /**
   * 转换统一消息为 OpenAI 消息
   * @param msg 统一消息
   * @returns OpenAI 消息
   */
  private transformMessage(msg: UnifiedMessage): OpenAIRequestMessage {
    // OpenAI 的 tool_calls 需要特殊处理
    if (msg.role === 'assistant' && Array.isArray(msg.content)) {
      const toolUses = msg.content.filter((c: any) => c.type === 'tool_use');
      const textContent = msg.content
        .filter((c: any) => c.type === 'text')
        .map((c: any) => c.text)
        .join('');

      if (toolUses.length > 0) {
        return {
          role: 'assistant',
          content: textContent,
          tool_calls: toolUses.map((tu: any, index: number) => ({
            index,
            id: tu.id,
            type: 'function',
            function: {
              name: tu.name,
              arguments: JSON.stringify(tu.input)  // OpenAI 需要 JSON 字符串
            }
          }))
        };
      }
    }

    // tool_result 转为 tool role
    if (msg.role === 'tool' && Array.isArray(msg.content)) {
      const toolResult = msg.content.find((c: any) => c.type === 'tool_result') as any;
      if (toolResult) {
        return {
          role: 'tool',
          content: toolResult.content,
          tool_call_id: toolResult.toolUseId
        };
      }
    }

    // 普通文本消息
    const content = typeof msg.content === 'string'
      ? msg.content
      : msg.content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join('');

    return { role: msg.role as OpenAIRequestRole, content };
  }

  /**
   * 转换统一工具为 OpenAI 工具
   * @param tool 统一工具
   * @returns OpenAI 工具
   */
  private transformTool(tool: UnifiedTool): OpenAITool {
    return {
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }
    };
  }
}

// ==================== Google 转换器 ====================

/**
 * Google 请求转换器
 * 将统一格式转换为 Google AI API 请求格式
 */
export class UnifiedToGoogleTransformer {
  /**
   * 转换统一请求为 Google 请求
   * @param unified 统一请求 AST
   * @returns Google 请求 AST
   */
  transform(unified: UnifiedRequestAst): GoogleRequestAst {
    const ast = new GoogleRequestAst();

    // 生成配置
    ast.generationConfig = {
      maxOutputTokens: unified.maxTokens,
      temperature: unified.temperature,
      topP: unified.topP,
      topK: unified.topK
    };

    // 内容转换（过滤 system，单独处理）
    ast.contents = unified.messages
      .filter(m => m.role !== 'system')
      .map(m => this.transformMessage(m));

    // 工具转换
    if (unified.tools?.length) {
      ast.tools = [{
        functionDeclarations: unified.tools.map(t => ({
          name: t.name,
          description: t.description,
          parameters: t.parameters
        }))
      }];
    }

    return ast;
  }

  /**
   * 转换统一消息为 Google 内容
   * @param msg 统一消息
   * @returns Google 内容
   */
  private transformMessage(msg: UnifiedMessage): GoogleContent {
    const role = this.mapRole(msg.role);

    if (typeof msg.content === 'string') {
      return { role, parts: [{ text: msg.content }] };
    }

    const parts: GoogleContentPart[] = msg.content.map((c: any) => {
      switch (c.type) {
        case 'text':
          return { text: c.text };
        case 'tool_use':
          return {
            functionCall: { name: c.name, args: c.input },
            thoughtSignature: ''  // Google 特有
          };
        case 'tool_result':
          return {
            functionResponse: {
              name: c.toolName || '',
              response: { content: c.content }
            },
            thoughtSignature: ''
          };
        case 'thinking':
          throw new Error('Unsupported content type: thinking (not supported by Google)');
        case 'image':
          throw new Error('Unsupported content type: image (not supported by Google)');
        default:
          throw new Error(`Unsupported content type: ${(c as any).type}`);
      }
    });

    return { role, parts };
  }

  /**
   * 映射统一角色到 Google 角色
   * @param role 统一角色
   * @returns Google 角色
   */
  private mapRole(role: string): 'user' | 'model' | 'function' {
    switch (role) {
      case 'user': return 'user';
      case 'assistant': return 'model';
      case 'tool': return 'function';
      default: return 'user';
    }
  }
}
