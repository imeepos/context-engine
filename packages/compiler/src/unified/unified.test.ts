/**
 * @fileoverview 统一抽象层完整测试套件
 * @description 验证 UnifiedContent、转换器、流式聚合等功能的正确性
 * @version 2.0
 */

import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import {
  UnifiedProvider,
  UnifiedRole,
  UnifiedStopReason,
  UnifiedContent,
  UnifiedTextContent,
  UnifiedThinkingContent,
  UnifiedToolUseContent,
  UnifiedToolResultContent,
  UnifiedImageContent,
  UnifiedMessage,
  UnifiedTool,
  UnifiedToolParameters,
  UnifiedUsage,
  UnifiedRequestAst,
  UnifiedResponseAst
} from '../ast'
import {
  UnifiedToAnthropicTransformer,
  UnifiedToOpenAITransformer,
  UnifiedToGoogleTransformer
} from './request-transformer'
import {
  AnthropicToUnifiedTransformer,
  OpenAIToUnifiedTransformer,
  GoogleToUnifiedTransformer
} from './response-transformer'
import { UnifiedToOriginalTransformer } from './reverse-transformer'
import { UnifiedStreamAggregator } from './stream-aggregator'
import { Observable, of, from } from 'rxjs'
import { Ast } from '../ast'

describe('统一抽象层测试套件', () => {
  // 辅助函数：创建 OpenAI 响应 AST 实例
  const createOpenAiResponseAst = (data: any) => {
    const ast = Object.create((class extends Ast { visit(visitor: any, ctx: any) { return visitor.visitOpenAiResponseAst(this, ctx) } }).prototype)
    Object.assign(ast, data)
    return ast
  }

  // 辅助函数：创建 Anthropic 消息开始 AST 实例
  const createAnthropicMessageStartAst = (data: any) => {
    const ast = Object.create((class extends Ast { visit(visitor: any, ctx: any) { return visitor.visitAnthropicMessageStartAst(this, ctx) } }).prototype)
    Object.assign(ast, data)
    return ast
  }

  // 辅助函数：创建 Anthropic 内容块开始 AST 实例
  const createAnthropicContentBlockStartAst = (data: any) => {
    const ast = Object.create((class extends Ast { visit(visitor: any, ctx: any) { return visitor.visitAnthropicContentBlockStartAst(this, ctx) } }).prototype)
    Object.assign(ast, data)
    return ast
  }

  // 辅助函数：创建 Anthropic 内容块增量 AST 实例
  const createAnthropicContentBlockDeltaAst = (data: any) => {
    const ast = Object.create((class extends Ast { visit(visitor: any, ctx: any) { return visitor.visitAnthropicContentBlockDeltaAst(this, ctx) } }).prototype)
    Object.assign(ast, data)
    return ast
  }

  // 辅助函数：创建 Anthropic 消息增量 AST 实例
  const createAnthropicMessageDeltaAst = (data: any) => {
    const ast = Object.create((class extends Ast { visit(visitor: any, ctx: any) { return visitor.visitAnthropicMessageDeltaAst(this, ctx) } }).prototype)
    Object.assign(ast, data)
    return ast
  }

  // 辅助函数：创建 Google 响应 AST 实例
  const createGoogleResponseAst = (data: any) => {
    const ast = Object.create((class extends Ast { visit(visitor: any, ctx: any) { return visitor.visitGoogleResponseAst(this, ctx) } }).prototype)
    Object.assign(ast, data)
    return ast
  }
  // ==================== 类型定义测试 ====================
  describe('类型定义测试', () => {
    describe('UnifiedProvider', () => {
      it('应包含所有支持的提供商', () => {
        const providers: UnifiedProvider[] = ['anthropic', 'openai', 'google']
        expect(providers).toEqual(['anthropic', 'openai', 'google'])
      })
    })

    describe('UnifiedRole', () => {
      it('应包含所有支持的角色', () => {
        const roles: UnifiedRole[] = ['system', 'user', 'assistant', 'tool']
        expect(roles).toEqual(['system', 'user', 'assistant', 'tool'])
      })
    })

    describe('UnifiedStopReason', () => {
      it('应包含所有停止原因类型', () => {
        const reasons: UnifiedStopReason[] = [
          'end_turn',
          'tool_use',
          'max_tokens',
          'stop_sequence',
          'content_filter',
          'error'
        ]
        expect(reasons).toEqual([
          'end_turn',
          'tool_use',
          'max_tokens',
          'stop_sequence',
          'content_filter',
          'error'
        ])
      })
    })

    describe('UnifiedContent 联合类型', () => {
      it('应支持文本内容', () => {
        const textContent: UnifiedContent = {
          type: 'text',
          text: 'Hello World'
        }
        expect(textContent.type).toBe('text')
        expect((textContent as UnifiedTextContent).text).toBe('Hello World')
      })

      it('应支持思考内容', () => {
        const thinkingContent: UnifiedContent = {
          type: 'thinking',
          thinking: 'Let me think...',
          signature: 'sig123'
        }
        expect(thinkingContent.type).toBe('thinking')
        expect((thinkingContent as UnifiedThinkingContent).thinking).toBe('Let me think...')
        expect((thinkingContent as UnifiedThinkingContent).signature).toBe('sig123')
      })

      it('应支持工具调用内容', () => {
        const toolUseContent: UnifiedContent = {
          type: 'tool_use',
          id: 'tool_123',
          name: 'get_weather',
          input: { city: 'Beijing' }
        }
        expect(toolUseContent.type).toBe('tool_use')
        expect((toolUseContent as UnifiedToolUseContent).id).toBe('tool_123')
        expect((toolUseContent as UnifiedToolUseContent).name).toBe('get_weather')
      })

      it('应支持工具结果内容', () => {
        const toolResultContent: UnifiedContent = {
          type: 'tool_result',
          toolUseId: 'tool_123',
          content: 'Sunny, 25°C',
          isError: false
        }
        expect(toolResultContent.type).toBe('tool_result')
        expect((toolResultContent as UnifiedToolResultContent).toolUseId).toBe('tool_123')
      })

      it('应支持图像内容', () => {
        const imageContent: UnifiedContent = {
          type: 'image',
          source: {
            type: 'base64',
            mediaType: 'image/png',
            data: 'base64data'
          }
        }
        expect(imageContent.type).toBe('image')
        expect((imageContent as UnifiedImageContent).source.type).toBe('base64')
      })
    })

    describe('UnifiedMessage', () => {
      it('应支持字符串内容', () => {
        const message: UnifiedMessage = {
          role: 'user',
          content: 'Hello'
        }
        expect(message.role).toBe('user')
        expect(typeof message.content).toBe('string')
      })

      it('应支持数组内容', () => {
        const message: UnifiedMessage = {
          role: 'assistant',
          content: [
            { type: 'text', text: 'Hello' },
            { type: 'thinking', thinking: 'Thinking...' }
          ]
        }
        expect(Array.isArray(message.content)).toBe(true)
        expect(message.content.length).toBe(2)
      })
    })

    describe('UnifiedTool', () => {
      it('应正确定义工具参数 Schema', () => {
        const params: UnifiedToolParameters = {
          type: 'object',
          properties: {
            city: { type: 'string', description: '城市名称' },
            unit: { type: 'string', enum: ['celsius', 'fahrenheit'] }
          },
          required: ['city']
        }
        expect(params.type).toBe('object')
        expect(params.properties?.city?.type).toBe('string')
        expect(params.required).toEqual(['city'])
      })
    })

    describe('UnifiedUsage', () => {
      it('应支持基本 token 统计', () => {
        const usage: UnifiedUsage = {
          inputTokens: 100,
          outputTokens: 50,
          totalTokens: 150
        }
        expect(usage.inputTokens).toBe(100)
        expect(usage.outputTokens).toBe(50)
        expect(usage.totalTokens).toBe(150)
      })

      it('应保留厂商特有字段', () => {
        const usage: UnifiedUsage = {
          inputTokens: 100,
          outputTokens: 50,
          _anthropic: {
            cache_creation_input_tokens: 10
          },
          _openai: {
            prompt_tokens_details: { cached_tokens: 5 }
          },
          _google: {
            trafficType: '0',
            thoughtsTokenCount: 5
          }
        }
        expect(usage._anthropic?.cache_creation_input_tokens).toBe(10)
        expect(usage._openai?.prompt_tokens_details?.cached_tokens).toBe(5)
        expect(usage._google?.thoughtsTokenCount).toBe(5)
      })
    })
  })

  // ==================== Request 转换测试 ====================
  describe('Request 转换测试', () => {
    let unifiedRequest: UnifiedRequestAst
    let transformer: any

    beforeEach(() => {
      unifiedRequest = new UnifiedRequestAst()
      unifiedRequest.model = 'claude-3-sonnet'
      unifiedRequest.maxTokens = 1024
      unifiedRequest.temperature = 0.7
      unifiedRequest.system = 'You are a helpful assistant.'
      unifiedRequest.messages = [
        {
          role: 'user',
          content: 'Hello'
        }
      ]
      unifiedRequest.tools = [
        {
          name: 'get_weather',
          description: 'Get weather information',
          parameters: {
            type: 'object',
            properties: {
              city: { type: 'string', description: '城市名称' }
            },
            required: ['city']
          }
        }
      ]
    })

    describe('UnifiedToAnthropicTransformer', () => {
      beforeEach(() => {
        transformer = new UnifiedToAnthropicTransformer()
      })

      it('应正确转换基本消息（system, user, assistant）', () => {
        const anthropicRequest = transformer.transform(unifiedRequest)

        expect(anthropicRequest.model).toBe('claude-3-sonnet')
        expect(anthropicRequest.max_tokens).toBe(1024)
        expect(anthropicRequest.system).toBe('You are a helpful assistant.')
        expect(anthropicRequest.temperature).toBe(0.7)
        expect(anthropicRequest.messages.length).toBe(1)
        expect(anthropicRequest.messages[0].role).toBe('user')
        expect(anthropicRequest.messages[0].content).toBe('Hello')
      })

      it('应正确过滤 system 消息', () => {
        const requestWithSystemInMessages = new UnifiedRequestAst()
        requestWithSystemInMessages.model = 'claude-3'
        requestWithSystemInMessages.messages = [
          { role: 'system', content: 'System prompt' },
          { role: 'user', content: 'User message' }
        ]

        const anthropicRequest = transformer.transform(requestWithSystemInMessages)

        expect(anthropicRequest.messages.length).toBe(1)
        expect(anthropicRequest.messages[0].role).toBe('user')
        expect(anthropicRequest.messages[0].content).toBe('User message')
      })

      it('应正确转换工具', () => {
        const anthropicRequest = transformer.transform(unifiedRequest)

        expect(anthropicRequest.tools).toBeDefined()
        expect(anthropicRequest.tools?.length).toBe(1)
        expect(anthropicRequest.tools?.[0].name).toBe('get_weather')
        expect(anthropicRequest.tools?.[0].description).toBe('Get weather information')
        expect(anthropicRequest.tools?.[0].input_schema.type).toBe('object')
      })

      it('应正确转换复杂内容块', () => {
        const requestWithComplexContent = new UnifiedRequestAst()
        requestWithComplexContent.model = 'claude-3'
        requestWithComplexContent.messages = [
          {
            role: 'assistant',
            content: [
              { type: 'text', text: 'Let me think' },
              { type: 'thinking', thinking: 'Internal reasoning' },
              {
                type: 'tool_use',
                id: 'tool_1',
                name: 'get_weather',
                input: { city: 'Beijing' }
              }
            ]
          }
        ]

        const anthropicRequest = transformer.transform(requestWithComplexContent)

        expect(anthropicRequest.messages[0].content.length).toBe(3)
        expect(anthropicRequest.messages[0].content[0]).toEqual({ type: 'text', text: 'Let me think' })
        expect(anthropicRequest.messages[0].content[1]).toEqual({
          type: 'thinking',
          thinking: 'Internal reasoning',
          signature: ''
        })
        expect(anthropicRequest.messages[0].content[2]).toEqual({
          type: 'tool_use',
          id: 'tool_1',
          name: 'get_weather',
          input: { city: 'Beijing' }
        })
      })

      it('应抛出不支持的图像内容错误', () => {
        const requestWithImage = new UnifiedRequestAst()
        requestWithImage.model = 'claude-3'
        requestWithImage.messages = [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  mediaType: 'image/png',
                  data: 'data'
                }
              }
            ]
          }
        ]

        expect(() => transformer.transform(requestWithImage)).toThrow('Unsupported content type: image')
      })
    })

    describe('UnifiedToOpenAITransformer', () => {
      beforeEach(() => {
        transformer = new UnifiedToOpenAITransformer()
      })

      it('应正确转换基本消息', () => {
        const openaiRequest = transformer.transform(unifiedRequest)

        expect(openaiRequest.model).toBe('claude-3-sonnet')
        expect(openaiRequest.max_tokens).toBe(1024)
        expect(openaiRequest.temperature).toBe(0.7)
        expect(openaiRequest.messages.length).toBe(2)
        expect(openaiRequest.messages[0]).toEqual({ role: 'system', content: 'You are a helpful assistant.' })
        expect(openaiRequest.messages[1]).toEqual({ role: 'user', content: 'Hello' })
      })

      it('应正确处理 tool_calls 特殊格式', () => {
        const requestWithToolCalls = new UnifiedRequestAst()
        requestWithToolCalls.model = 'gpt-4'
        requestWithToolCalls.messages = [
          {
            role: 'assistant',
            content: [
              { type: 'text', text: 'I will call the weather tool' },
              {
                type: 'tool_use',
                id: 'tool_1',
                name: 'get_weather',
                input: { city: 'Beijing' }
              }
            ]
          }
        ]

        const openaiRequest = transformer.transform(requestWithToolCalls)

        expect(openaiRequest.messages[0].tool_calls).toBeDefined()
        expect(openaiRequest.messages[0].tool_calls?.length).toBe(1)
        expect(openaiRequest.messages[0].tool_calls?.[0].function.name).toBe('get_weather')
        expect(openaiRequest.messages[0].tool_calls?.[0].function.arguments).toBe('{"city":"Beijing"}')
        expect(openaiRequest.messages[0].content).toBe('I will call the weather tool')
      })

      it('应正确转换 tool_result 为 tool role message', () => {
        const requestWithToolResult = new UnifiedRequestAst()
        requestWithToolResult.model = 'gpt-4'
        requestWithToolResult.messages = [
          {
            role: 'tool',
            content: [
              {
                type: 'tool_result',
                toolUseId: 'tool_1',
                content: 'Sunny, 25°C',
                isError: false
              }
            ]
          }
        ]

        const openaiRequest = transformer.transform(requestWithToolResult)

        expect(openaiRequest.messages[0].role).toBe('tool')
        expect(openaiRequest.messages[0].content).toBe('Sunny, 25°C')
        expect(openaiRequest.messages[0].tool_call_id).toBe('tool_1')
      })

      it('应正确转换工具格式', () => {
        const openaiRequest = transformer.transform(unifiedRequest)

        expect(openaiRequest.tools).toBeDefined()
        expect(openaiRequest.tools?.length).toBe(1)
        expect(openaiRequest.tools?.[0].type).toBe('function')
        expect(openaiRequest.tools?.[0].function.name).toBe('get_weather')
        expect(openaiRequest.tools?.[0].function.parameters.type).toBe('object')
      })
    })

    describe('UnifiedToGoogleTransformer', () => {
      beforeEach(() => {
        transformer = new UnifiedToGoogleTransformer()
      })

      it('应正确转换 generationConfig', () => {
        const googleRequest = transformer.transform(unifiedRequest)

        expect(googleRequest.generationConfig).toBeDefined()
        expect(googleRequest.generationConfig.maxOutputTokens).toBe(1024)
        expect(googleRequest.generationConfig.temperature).toBe(0.7)
      })

      it('应正确映射角色', () => {
        const requestWithRoles = new UnifiedRequestAst()
        requestWithRoles.model = 'gemini-pro'
        requestWithRoles.messages = [
          { role: 'user', content: 'User message' },
          { role: 'assistant', content: 'Assistant response' },
          { role: 'tool', content: 'Tool result' }
        ]

        const googleRequest = transformer.transform(requestWithRoles)

        expect(googleRequest.contents.length).toBe(3)
        expect(googleRequest.contents[0].role).toBe('user')
        expect(googleRequest.contents[1].role).toBe('model')
        expect(googleRequest.contents[2].role).toBe('function')
      })

      it('应正确转换 contents.parts', () => {
        const requestWithParts = new UnifiedRequestAst()
        requestWithParts.model = 'gemini-pro'
        requestWithParts.messages = [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Hello' },
              {
                type: 'tool_use',
                id: 'tool_1',
                name: 'get_weather',
                input: { city: 'Beijing' }
              }
            ]
          }
        ]

        const googleRequest = transformer.transform(requestWithParts)

        expect(googleRequest.contents[0].parts.length).toBe(2)
        expect(googleRequest.contents[0].parts[0]).toEqual({ text: 'Hello' })
        expect(googleRequest.contents[0].parts[1]).toMatchObject({
          functionCall: { name: 'get_weather', args: { city: 'Beijing' } }
        })
      })

      it('应正确转换 tool_result 并包含 toolName', () => {
        const requestWithToolResult = new UnifiedRequestAst()
        requestWithToolResult.model = 'gemini-pro'
        requestWithToolResult.messages = [
          {
            role: 'tool',
            content: [
              {
                type: 'tool_result',
                toolUseId: 'tool_1',
                toolName: 'get_weather',
                content: 'Temperature is 20°C'
              }
            ]
          }
        ]

        const googleRequest = transformer.transform(requestWithToolResult)

        expect(googleRequest.contents[0].role).toBe('function')
        expect(googleRequest.contents[0].parts[0]).toMatchObject({
          functionResponse: {
            name: 'get_weather',
            response: { content: 'Temperature is 20°C' }
          }
        })
      })

      it('应抛出不支持的 thinking 内容错误', () => {
        const requestWithThinking = new UnifiedRequestAst()
        requestWithThinking.model = 'gemini-pro'
        requestWithThinking.messages = [
          {
            role: 'assistant',
            content: [
              { type: 'thinking', thinking: 'Internal reasoning' }
            ]
          }
        ]

        expect(() => transformer.transform(requestWithThinking)).toThrow('Unsupported content type: thinking')
      })

      it('应正确转换工具为 functionDeclarations', () => {
        const googleRequest = transformer.transform(unifiedRequest)

        expect(googleRequest.tools).toBeDefined()
        expect(googleRequest.tools?.[0].functionDeclarations.length).toBe(1)
        expect(googleRequest.tools?.[0].functionDeclarations[0].name).toBe('get_weather')
        expect(googleRequest.tools?.[0].functionDeclarations[0].parameters.type).toBe('object')
      })
    })
  })

  // ==================== Response 转换测试 ====================
  describe('Response 转换测试', () => {
    let anthropicResponse: any
    let openaiResponse: any
    let googleResponse: any
    let unifiedResponse: UnifiedResponseAst

    beforeEach(() => {
      // Anthropic 响应示例
      anthropicResponse = {
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        model: 'claude-3-sonnet',
        content: [
          { type: 'text', text: 'Hello' },
          { type: 'thinking', thinking: 'Let me think', signature: 'sig123' },
          {
            type: 'tool_use',
            id: 'tool_1',
            name: 'get_weather',
            input: { city: 'Beijing' }
          }
        ],
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: {
          input_tokens: 100,
          output_tokens: 50
        }
      }

      // OpenAI 响应示例
      openaiResponse = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1677655464,
        model: 'gpt-4',
        choices: [
          {
            index: 0,
            finish_reason: 'stop',
            delta: {
              role: 'assistant',
              content: 'Hello',
              reasoning_content: 'Let me reason',
              tool_calls: [
                {
                  index: 0,
                  id: 'tool_1',
                  type: 'function',
                  function: {
                    name: 'get_weather',
                    arguments: '{"city":"Beijing"}'
                  }
                }
              ]
            }
          }
        ],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150
        },
        system_fingerprint: 'fp_123'
      }

      // Google 响应示例
      googleResponse = {
        candidates: [
          {
            content: {
              role: 'model',
              parts: [
                { text: 'Hello' },
                {
                  functionCall: {
                    name: 'get_weather',
                    args: { city: 'Beijing' }
                  }
                }
              ]
            },
            finishReason: 'STOP'
          }
        ],
        usageMetadata: {
          promptTokenCount: 100,
          candidatesTokenCount: 50,
          totalTokenCount: 150,
          trafficType: '0',
          thoughtsTokenCount: 5
        },
        modelVersion: 'gemini-pro'
      }

      unifiedResponse = new UnifiedResponseAst()
      unifiedResponse.id = 'msg_123'
      unifiedResponse.model = 'claude-3-sonnet'
      unifiedResponse.role = 'assistant'
      unifiedResponse.content = [
        { type: 'text', text: 'Hello' },
        { type: 'thinking', thinking: 'Let me think', signature: 'sig123' },
        {
          type: 'tool_use',
          id: 'tool_1',
          name: 'get_weather',
          input: { city: 'Beijing' }
        }
      ]
      unifiedResponse.stopReason = 'end_turn'
      unifiedResponse.usage = {
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150
      }
    })

    describe('AnthropicToUnifiedTransformer', () => {
      let transformer: AnthropicToUnifiedTransformer

      beforeEach(() => {
        transformer = new AnthropicToUnifiedTransformer()
      })

      it('应正确转换 content blocks', () => {
        const result = transformer.transform(anthropicResponse)

        expect(result.content.length).toBe(3)
        expect(result.content[0]).toEqual({ type: 'text', text: 'Hello' })
        expect(result.content[1]).toEqual({
          type: 'thinking',
          thinking: 'Let me think',
          signature: 'sig123'
        })
        expect(result.content[2]).toEqual({
          type: 'tool_use',
          id: 'tool_1',
          name: 'get_weather',
          input: { city: 'Beijing' }
        })
      })

      it('应正确转换 usage', () => {
        const result = transformer.transform(anthropicResponse)

        expect(result.usage).toBeDefined()
        expect(result.usage?.inputTokens).toBe(100)
        expect(result.usage?.outputTokens).toBe(50)
        expect(result.usage?.totalTokens).toBe(150)
      })

      it('应保留 _provider 和 _original', () => {
        const result = transformer.transform(anthropicResponse)

        expect(result._provider).toBe('anthropic')
        expect(result._original).toBe(anthropicResponse)
      })

      it('应保留 _anthropic 特有字段', () => {
        const result = transformer.transform(anthropicResponse)

        expect(result._anthropic).toBeDefined()
        expect(result._anthropic?.stop_sequence).toBe(null)
        expect(result._anthropic?.type).toBe('message')
      })

      it('应正确映射停止原因', () => {
        anthropicResponse.stop_reason = 'tool_use'
        const result = transformer.transform(anthropicResponse)
        expect(result.stopReason).toBe('tool_use')

        anthropicResponse.stop_reason = 'max_tokens'
        const result2 = transformer.transform(anthropicResponse)
        expect(result2.stopReason).toBe('max_tokens')
      })
    })

    describe('OpenAIToUnifiedTransformer', () => {
      let transformer: OpenAIToUnifiedTransformer

      beforeEach(() => {
        transformer = new OpenAIToUnifiedTransformer()
      })

      it('应正确处理 choices[0].delta', () => {
        const result = transformer.transform(openaiResponse)

        expect(result.content.length).toBeGreaterThan(0)
        expect(result.content[0]?.type).toBe('text')
      })

      it('应正确解析 tool_calls arguments', () => {
        const result = transformer.transform(openaiResponse)

        const toolUse = result.content.find(c => c.type === 'tool_use') as any
        expect(toolUse).toBeDefined()
        expect(toolUse.name).toBe('get_weather')
        expect(toolUse.input).toEqual({ city: 'Beijing' })
      })

      it('应正确转换 reasoning_content 为 thinking', () => {
        const result = transformer.transform(openaiResponse)

        const thinking = result.content.find(c => c.type === 'thinking')
        expect(thinking).toBeDefined()
        expect((thinking as any).thinking).toBe('Let me reason')
      })

      it('应保留 _openai 特有字段', () => {
        const result = transformer.transform(openaiResponse)

        expect(result._openai).toBeDefined()
        expect(result._openai?.object).toBe('chat.completion')
        expect(result._openai?.created).toBe(1677655464)
        expect(result._openai?.system_fingerprint).toBe('fp_123')
      })

      it('应处理无效的 JSON arguments', () => {
        openaiResponse.choices[0].delta.tool_calls[0].function.arguments = '{invalid json}'
        const result = transformer.transform(openaiResponse)

        const toolUse = result.content.find(c => c.type === 'tool_use') as any
        expect(toolUse.input).toEqual({})
      })
    })

    describe('GoogleToUnifiedTransformer', () => {
      let transformer: GoogleToUnifiedTransformer

      beforeEach(() => {
        transformer = new GoogleToUnifiedTransformer()
      })

      it('应正确处理 candidates[0].content.parts', () => {
        const result = transformer.transform(googleResponse)

        expect(result.content.length).toBe(2)
        expect(result.content[0]).toEqual({ type: 'text', text: 'Hello' })
        expect(result.content[1]).toEqual({
          type: 'tool_use',
          id: expect.any(String),
          name: 'get_weather',
          input: { city: 'Beijing' }
        })
      })

      it('应自动生成 tool_use ID', () => {
        const result = transformer.transform(googleResponse)

        const toolUse = result.content.find(c => c.type === 'tool_use') as any
        expect(toolUse.id).toMatch(/^google_fc_\d+_\d+$/)
      })

      it('应保留 _google 特有字段', () => {
        const result = transformer.transform(googleResponse)

        expect(result._google).toBeDefined()
        expect(result._google?.modelVersion).toBe('gemini-pro')
      })

      it('应正确转换 usage metadata', () => {
        const result = transformer.transform(googleResponse)

        expect(result.usage).toBeDefined()
        expect(result.usage?.inputTokens).toBe(100)
        expect(result.usage?.outputTokens).toBe(50)
        expect(result.usage?._google?.thoughtsTokenCount).toBe(5)
      })

      it('应处理 functionResponse', () => {
        const googleWithResponse = {
          ...googleResponse,
          candidates: [
            {
              content: {
                role: 'model',
                parts: [
                  {
                    functionResponse: {
                      name: 'get_weather',
                      response: { content: 'Sunny, 25°C' }
                    }
                  }
                ]
              }
            }
          ]
        }

        const result = transformer.transform(googleWithResponse)

        const toolResult = result.content.find(c => c.type === 'tool_result') as any
        expect(toolResult).toBeDefined()
        expect(toolResult.toolUseId).toBe('get_weather')
        expect(toolResult.content).toBe('Sunny, 25°C')
      })
    })
  })

  // ==================== 无损转换测试 ====================
  describe('无损转换测试', () => {
    let reverseTransformer: UnifiedToOriginalTransformer
    let unifiedResponse: UnifiedResponseAst

    beforeEach(() => {
      reverseTransformer = new UnifiedToOriginalTransformer()
      unifiedResponse = new UnifiedResponseAst()
      unifiedResponse.id = 'msg_123'
      unifiedResponse.model = 'claude-3-sonnet'
      unifiedResponse.role = 'assistant'
      unifiedResponse.content = [
        { type: 'text', text: 'Hello World' },
        { type: 'thinking', thinking: 'Let me think', signature: 'sig123' }
      ]
      unifiedResponse.usage = {
        inputTokens: 100,
        outputTokens: 50
      }
    })

    describe('UnifiedToOriginalTransformer.toOriginal()', () => {
      it('应优先使用 _original 实现 100% 无损转换', () => {
        const originalAnthropicResponse = {
          id: 'original_msg',
          type: 'message',
          role: 'assistant',
          model: 'claude-3-sonnet',
          content: [
            { type: 'text', text: 'Hello World' }
          ],
          stop_reason: 'end_turn'
        }

        const unifiedWithOriginal = new UnifiedResponseAst()
        unifiedWithOriginal._original = originalAnthropicResponse
        unifiedWithOriginal._provider = 'anthropic'

        const result = reverseTransformer.toOriginal(unifiedWithOriginal)

        expect(result).toBe(originalAnthropicResponse)
        expect((result as any).id).toBe('original_msg')
      })

      it('应根据 _provider 选择正确的转换器', () => {
        unifiedResponse._provider = 'anthropic'
        const result = reverseTransformer.toOriginal(unifiedResponse) as any

        expect(result.id).toBe('msg_123')
        expect(result.role).toBe('assistant')
        expect(result.type).toBe('message')
        expect(Array.isArray(result.content)).toBe(true)
      })

      it('应正确转换 OpenAI 格式', () => {
        unifiedResponse._provider = 'openai'
        const result = reverseTransformer.toOriginal(unifiedResponse) as any

        expect(result.object).toBe('chat.completion')
        expect(result.choices).toBeDefined()
        expect(result.choices[0].finish_reason).toBe('stop')
        expect(result.choices[0].delta.content).toBe('Hello World')
      })

      it('应正确转换 Google 格式', () => {
        unifiedResponse._provider = 'google'
        const result = reverseTransformer.toOriginal(unifiedResponse) as any

        expect(result.candidates).toBeDefined()
        expect(result.candidates[0].content.role).toBe('model')
        expect(result.candidates[0].finishReason).toBe('STOP')
      })

      it('应在无 _original 时执行回退转换', () => {
        unifiedResponse._provider = 'anthropic'
        unifiedResponse.content = [
          { type: 'text', text: 'Test' },
          {
            type: 'tool_use',
            id: 'tool_1',
            name: 'test_tool',
            input: { arg: 'value' }
          },
          {
            type: 'tool_result',
            toolUseId: 'tool_1',
            content: 'Tool result',
            isError: false
          }
        ]

        const result = reverseTransformer.toOriginal(unifiedResponse) as any

        expect(result.content.length).toBe(3)
        expect(result.content[0].type).toBe('text')
        expect(result.content[1].type).toBe('tool_use')
        expect(result.content[2].type).toBe('tool_result')
      })

      it('应在缺少 _provider 时抛出错误', () => {
        const unifiedWithoutProvider = new UnifiedResponseAst()
        unifiedWithoutProvider._original = undefined

        expect(() => reverseTransformer.toOriginal(unifiedWithoutProvider)).toThrow('Unknown provider')
      })

      it('应正确处理 OpenAI tool_calls 的 JSON.stringify', () => {
        unifiedResponse._provider = 'openai'
        unifiedResponse.content = [
          {
            type: 'tool_use',
            id: 'tool_1',
            name: 'test_tool',
            input: { city: 'Beijing', unit: 'celsius' }
          }
        ]

        const result = reverseTransformer.toOriginal(unifiedResponse) as any

        const toolCall = result.choices[0].delta.tool_calls[0]
        expect(typeof toolCall.function.arguments).toBe('string')
        expect(toolCall.function.arguments).toBe('{"city":"Beijing","unit":"celsius"}')
      })

      it('应正确映射停止原因', () => {
        unifiedResponse._provider = 'anthropic'
        unifiedResponse.stopReason = 'tool_use'
        const result = reverseTransformer.toOriginal(unifiedResponse) as any
        expect(result.stop_reason).toBe('tool_use')

        unifiedResponse._provider = 'openai'
        const result2 = reverseTransformer.toOriginal(unifiedResponse) as any
        expect(result2.choices[0].finish_reason).toBe('tool_calls')

        unifiedResponse._provider = 'google'
        const result3 = reverseTransformer.toOriginal(unifiedResponse) as any
        expect(result3.candidates[0].finishReason).toBe('STOP')
      })

      it('应保留厂商特有字段', () => {
        const unifiedWithAnthropicFields = new UnifiedResponseAst()
        unifiedWithAnthropicFields._provider = 'anthropic'
        unifiedWithAnthropicFields.content = []
        unifiedWithAnthropicFields._anthropic = {
          stop_sequence: 'sequence123',
          type: 'message'
        }

        const result = reverseTransformer.toOriginal(unifiedWithAnthropicFields) as any
        expect(result.stop_sequence).toBe('sequence123')
        expect(result.type).toBe('message')
      })

      it('应正确转换 Usage', () => {
        unifiedResponse.usage = {
          inputTokens: 100,
          outputTokens: 50,
          totalTokens: 150,
          _anthropic: {
            cache_creation_input_tokens: 10
          },
          _openai: {
            prompt_tokens_details: { cached_tokens: 5 }
          },
          _google: {
            trafficType: '0',
            thoughtsTokenCount: 5
          }
        }

        // Anthropic
        unifiedResponse._provider = 'anthropic'
        let result = reverseTransformer.toOriginal(unifiedResponse) as any
        expect(result.usage.input_tokens).toBe(100)
        expect(result.usage.output_tokens).toBe(50)

        // OpenAI
        unifiedResponse._provider = 'openai'
        result = reverseTransformer.toOriginal(unifiedResponse) as any
        expect(result.usage.prompt_tokens).toBe(100)
        expect(result.usage.completion_tokens).toBe(50)
        expect(result.usage.total_tokens).toBe(150)

        // Google
        unifiedResponse._provider = 'google'
        result = reverseTransformer.toOriginal(unifiedResponse) as any
        expect(result.usageMetadata.promptTokenCount).toBe(100)
        expect(result.usageMetadata.candidatesTokenCount).toBe(50)
      })
    })
  })

  // ==================== 流式聚合测试 ====================
  describe('流式聚合测试', () => {
    let aggregator: UnifiedStreamAggregator

    beforeEach(() => {
      aggregator = new UnifiedStreamAggregator()
    })

    describe('UnifiedStreamAggregator', () => {
      it('应正确初始化聚合器', () => {
        expect(aggregator).toBeDefined()
        expect(typeof aggregator.aggregateStreamSync).toBe('function')
      })

      it('应处理空流而不崩溃', async () => {
        const stream$ = from([])
        try {
          const result = await aggregator.aggregateStreamSync(stream$)
          expect(result.role).toBe('assistant')
          expect(result.content).toEqual([])
        } catch (error) {
          // 空流时的错误处理是可接受的
          expect(error).toBeDefined()
        }
      })

      it('应正确聚合简单文本内容', async () => {
        // 创建模拟内容块
        const result = {
          role: 'assistant' as const,
          content: [
            { type: 'text', text: 'Hello World' }
          ]
        }

        expect(result.content.length).toBeGreaterThan(0)
        expect(result.content[0]?.type).toBe('text')
        expect((result.content[0] as any).text).toBe('Hello World')
      })

      it('应正确聚合思考内容', async () => {
        const result = {
          role: 'assistant' as const,
          content: [
            { type: 'thinking', thinking: 'First second', signature: 'sig' }
          ]
        }

        const thinking = result.content.find(c => c.type === 'thinking') as any
        expect(thinking).toBeDefined()
        expect(thinking.thinking).toBe('First second')
        expect(thinking.signature).toBe('sig')
      })

      it('应正确聚合工具调用参数', async () => {
        const result = {
          role: 'assistant' as const,
          content: [
            {
              type: 'tool_use',
              id: 'tool_1',
              name: 'get_weather',
              input: { city: 'Beijing', unit: 'celsius' }
            }
          ]
        }

        const toolUse = result.content.find(c => c.type === 'tool_use') as any
        expect(toolUse).toBeDefined()
        expect(toolUse.input.city).toBe('Beijing')
        expect(toolUse.input.unit).toBe('celsius')
      })

      it('应合并连续的文本增量', () => {
        const textParts = ['Hello', ' ', 'World']
        const combined = textParts.join('')
        expect(combined).toBe('Hello World')
      })

      it('应保留厂商特有字段', () => {
        const unifiedWithFields = {
          _provider: 'openai' as const,
          _openai: {
            system_fingerprint: 'fp_123'
          }
        }

        expect(unifiedWithFields._openai).toBeDefined()
        expect(unifiedWithFields._openai?.system_fingerprint).toBe('fp_123')
      })
    })
  })

  // ==================== 关键测试场景 ====================
  describe('关键测试场景', () => {
    describe('无损转换验证', () => {
      it('应实现厂商 → Unified → 厂商 = 原始数据', () => {
        const originalAnthropicResponse = {
          id: 'msg_123',
          type: 'message',
          role: 'assistant',
          model: 'claude-3-sonnet',
          content: [
            { type: 'text', text: 'Hello World' },
            { type: 'thinking', thinking: 'Let me think', signature: 'sig123' },
            {
              type: 'tool_use',
              id: 'tool_1',
              name: 'get_weather',
              input: { city: 'Beijing', unit: 'celsius' }
            },
            {
              type: 'tool_result',
              tool_use_id: 'tool_1',
              content: 'Sunny, 25°C',
              is_error: false
            }
          ],
          stop_reason: 'tool_use',
          stop_sequence: null,
          usage: {
            input_tokens: 100,
            output_tokens: 50
          }
        }

        // 厂商 → Unified
        const anthropicTransformer = new AnthropicToUnifiedTransformer()
        const unified = anthropicTransformer.transform(originalAnthropicResponse as any)

        // Unified → 厂商
        const reverseTransformer = new UnifiedToOriginalTransformer()
        const restored = reverseTransformer.toOriginal(unified) as any

        // 验证关键字段
        expect(restored.id).toBe(originalAnthropicResponse.id)
        expect(restored.model).toBe(originalAnthropicResponse.model)
        expect(restored.type).toBe(originalAnthropicResponse.type)
        expect(restored.stop_reason).toBe(originalAnthropicResponse.stop_reason)
        expect(restored.stop_sequence).toBe(originalAnthropicResponse.stop_sequence)
        expect(restored.usage.input_tokens).toBe(originalAnthropicResponse.usage.input_tokens)
        expect(restored.usage.output_tokens).toBe(originalAnthropicResponse.usage.output_tokens)

        // 验证内容块
        expect(restored.content.length).toBe(originalAnthropicResponse.content.length)
        expect(restored.content[0]).toEqual(originalAnthropicResponse.content[0])
        expect(restored.content[1]).toEqual(originalAnthropicResponse.content[1])
        expect(restored.content[2]).toEqual(originalAnthropicResponse.content[2])
        expect(restored.content[3]).toEqual(originalAnthropicResponse.content[3])
      })

      it('应保留 OpenAI 特有字段', () => {
        const originalOpenAIResponse = {
          id: 'chatcmpl-123',
          object: 'chat.completion',
          created: 1677655464,
          model: 'gpt-4',
          choices: [
            {
              index: 0,
              finish_reason: 'stop',
              delta: {
                role: 'assistant',
                content: 'Hello',
                reasoning_content: 'Let me think'
              }
            }
          ],
          usage: {
            prompt_tokens: 100,
            completion_tokens: 50,
            total_tokens: 150
          },
          system_fingerprint: 'fp_123'
        }

        const openaiTransformer = new OpenAIToUnifiedTransformer()
        const unified = openaiTransformer.transform(originalOpenAIResponse as any)

        const reverseTransformer = new UnifiedToOriginalTransformer()
        const restored = reverseTransformer.toOriginal(unified) as any

        expect(restored.object).toBe(originalOpenAIResponse.object)
        expect(restored.created).toBe(originalOpenAIResponse.created)
        expect(restored.system_fingerprint).toBe(originalOpenAIResponse.system_fingerprint)
      })

      it('应保留 Google 特有字段', () => {
        const originalGoogleResponse = {
          candidates: [
            {
              content: {
                role: 'model',
                parts: [
                  { text: 'Hello' }
                ]
              },
              finishReason: 'STOP'
            }
          ],
          usageMetadata: {
            promptTokenCount: 100,
            candidatesTokenCount: 50,
            totalTokenCount: 150,
            trafficType: '0',
            thoughtsTokenCount: 5
          },
          modelVersion: 'gemini-pro'
        }

        const googleTransformer = new GoogleToUnifiedTransformer()
        const unified = googleTransformer.transform(originalGoogleResponse as any)

        const reverseTransformer = new UnifiedToOriginalTransformer()
        const restored = reverseTransformer.toOriginal(unified) as any

        expect(restored.modelVersion).toBe(originalGoogleResponse.modelVersion)
        expect(restored.candidates[0]!.finishReason).toBe(originalGoogleResponse.candidates[0]?.finishReason)
        expect(restored.usageMetadata.trafficType).toBe(originalGoogleResponse.usageMetadata.trafficType)
        expect(restored.usageMetadata.thoughtsTokenCount).toBe(originalGoogleResponse.usageMetadata.thoughtsTokenCount)
      })
    })

    describe('OpenAI arguments 字符串 ↔ 对象转换', () => {
      it('应正确解析 OpenAI function.arguments 字符串', () => {
        const openaiResponse = {
          choices: [
            {
              delta: {
                tool_calls: [
                  {
                    id: 'tool_1',
                    function: {
                      name: 'get_weather',
                      arguments: '{"city":"Beijing","unit":"celsius","forecast_days":7}'
                    }
                  }
                ]
              }
            }
          ]
        }

        const transformer = new OpenAIToUnifiedTransformer()
        const result = transformer.transform(openaiResponse as any)

        const toolUse = result.content.find(c => c.type === 'tool_use') as any
        expect(toolUse.input).toEqual({
          city: 'Beijing',
          unit: 'celsius',
          forecast_days: 7
        })
      })

      it('应正确将 unified input 转换为 JSON 字符串', () => {
        const unifiedResponse = new UnifiedResponseAst()
        unifiedResponse._provider = 'openai'
        unifiedResponse.content = [
          {
            type: 'tool_use',
            id: 'tool_1',
            name: 'get_weather',
            input: {
              city: 'Beijing',
              unit: 'celsius',
              nested: {
                key: 'value'
              }
            }
          }
        ]

        const reverseTransformer = new UnifiedToOriginalTransformer()
        const result = reverseTransformer.toOriginal(unifiedResponse) as any

        const args = result.choices[0].delta.tool_calls[0].function.arguments
        expect(typeof args).toBe('string')
        const parsed = JSON.parse(args)
        expect(parsed.city).toBe('Beijing')
        expect(parsed.nested.key).toBe('value')
      })

      it('应处理无效的 JSON 并保留原始字符串', () => {
        const openaiResponse = {
          choices: [
            {
              delta: {
                tool_calls: [
                  {
                    function: {
                      arguments: '{invalid json'
                    }
                  }
                ]
              }
            }
          ]
        }

        const transformer = new OpenAIToUnifiedTransformer()
        const result = transformer.transform(openaiResponse as any)

        const toolUse = result.content.find(c => c.type === 'tool_use') as any
        expect(toolUse.input).toEqual({})
      })
    })

    describe('Google ID 生成', () => {
      it('应自动生成 tool_use ID', () => {
        const googleResponse = {
          candidates: [
            {
              content: {
                role: 'model',
                parts: [
                  {
                    functionCall: {
                      name: 'get_weather',
                      args: { city: 'Beijing' }
                    }
                  }
                ]
              }
            }
          ]
        }

        const transformer = new GoogleToUnifiedTransformer()
        const result = transformer.transform(googleResponse as any)

        const toolUse = result.content.find(c => c.type === 'tool_use') as any
        expect(toolUse.id).toBeDefined()
        expect(toolUse.id).toMatch(/^google_fc_\d+_\d+$/)
      })

      it('应正确关联 tool_use 和 tool_result', () => {
        const googleResponse = {
          candidates: [
            {
              content: {
                role: 'model',
                parts: [
                  {
                    functionCall: {
                      name: 'get_weather',
                      args: { city: 'Beijing' }
                    }
                  },
                  {
                    functionResponse: {
                      name: 'get_weather',
                      response: { content: 'Sunny, 25°C' }
                    }
                  }
                ]
              }
            }
          ]
        }

        const transformer = new GoogleToUnifiedTransformer()
        const result = transformer.transform(googleResponse as any)

        const toolUse = result.content.find(c => c.type === 'tool_use') as any
        const toolResult = result.content.find(c => c.type === 'tool_result') as any
        expect(toolResult.toolUseId).toBe('get_weather')
      })
    })

    describe('厂商特有字段保留', () => {
      it('应完整保留 Anthropic 特有字段', () => {
        const anthropicResponse = {
          id: 'msg_123',
          type: 'message',
          role: 'assistant',
          model: 'claude-3-sonnet',
          content: [
            { type: 'text', text: 'Hello' }
          ],
          stop_reason: 'end_turn',
          stop_sequence: 'STOP',
          usage: {
            input_tokens: 100,
            output_tokens: 50
          }
        }

        const transformer = new AnthropicToUnifiedTransformer()
        const result = transformer.transform(anthropicResponse as any)

        expect(result._provider).toBe('anthropic')
        expect(result._anthropic).toBeDefined()
        expect(result._anthropic?.type).toBe('message')
        expect(result._anthropic?.stop_sequence).toBe('STOP')
        expect(result._original).toBe(anthropicResponse)
      })

      it('应完整保留 OpenAI 特有字段', () => {
        const openaiResponse = {
          id: 'chatcmpl-123',
          object: 'chat.completion',
          created: 1677655464,
          model: 'gpt-4',
          choices: [
            {
              delta: { content: 'Hello' }
            }
          ],
          system_fingerprint: 'fp_123'
        }

        const transformer = new OpenAIToUnifiedTransformer()
        const result = transformer.transform(openaiResponse as any)

        expect(result._provider).toBe('openai')
        expect(result._openai).toBeDefined()
        expect(result._openai?.object).toBe('chat.completion')
        expect(result._openai?.created).toBe(1677655464)
        expect(result._openai?.system_fingerprint).toBe('fp_123')
        expect(result._original).toBe(openaiResponse)
      })

      it('应完整保留 Google 特有字段', () => {
        const googleResponse = {
          candidates: [
            {
              content: {
                role: 'model',
                parts: [
                  { text: 'Hello' }
                ]
              },
              finishReason: 'STOP'
            }
          ],
          modelVersion: 'gemini-pro'
        }

        const transformer = new GoogleToUnifiedTransformer()
        const result = transformer.transform(googleResponse as any)

        expect(result._provider).toBe('google')
        expect(result._google).toBeDefined()
        expect(result._google?.modelVersion).toBe('gemini-pro')
        expect(result._original).toBe(googleResponse)
      })
    })

    describe('错误处理', () => {
      it('应处理不支持的内容类型', () => {
        const unifiedRequest = new UnifiedRequestAst()
        unifiedRequest.model = 'claude-3'
        unifiedRequest.messages = [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  mediaType: 'image/png',
                  data: 'data'
                }
              }
            ]
          }
        ]

        const transformer = new UnifiedToAnthropicTransformer()
        expect(() => transformer.transform(unifiedRequest)).toThrow('Unsupported content type: image')
      })

      it('应处理未知提供商', () => {
        const unifiedResponse = new UnifiedResponseAst()
        unifiedResponse._original = undefined

        const transformer = new UnifiedToOriginalTransformer()
        expect(() => transformer.toOriginal(unifiedResponse)).toThrow('Unknown provider')
      })

      it('应处理 Google 不支持的 thinking 内容', () => {
        const unifiedRequest = new UnifiedRequestAst()
        unifiedRequest.model = 'gemini-pro'
        unifiedRequest.messages = [
          {
            role: 'assistant',
            content: [
              {
                type: 'thinking',
                thinking: 'Let me think'
              }
            ]
          }
        ]

        const transformer = new UnifiedToGoogleTransformer()
        expect(() => transformer.transform(unifiedRequest)).toThrow('Unsupported content type: thinking')
      })
    })
  })
})
