/**
 * @fileoverview 统一工具构建器测试
 * @description 验证 UnifiedTool 构建和转换功能
 * @version 2.0
 */

import { describe, it, expect } from 'vitest'
import { Injectable, Tool, ToolArg, root } from '@sker/core'
import { z } from 'zod'
import {
  buildUnifiedTools,
  unifiedToolsToAnthropic,
  unifiedToolsToOpenAI,
  unifiedToolsToGoogle
} from './tool-builder'
import { UnifiedTool } from '../ast'

describe('unified-tool-builder', () => {
  describe('buildUnifiedTools', () => {
    it('should build unified tools from decorated methods', () => {
      @Injectable()
      class TestService1 {
        @Tool({ name: 'test_tool', description: 'A test tool' })
        testMethod(
          @ToolArg({ zod: z.string().describe('A string param'), paramName: 'str' }) str: string,
          @ToolArg({ zod: z.number().optional().describe('A number param'), paramName: 'num' }) num?: number
        ): string {
          return 'test'
        }
      }

      const tools = buildUnifiedTools()

      expect(tools.length).toBeGreaterThan(0)
      const testTool = tools.find((t: UnifiedTool) => t.name === 'test_tool')
      expect(testTool).toBeDefined()
      expect(testTool?.name).toBe('test_tool')
      expect(testTool?.description).toBe('A test tool')
      expect(testTool?.parameters.type).toBe('object')
      expect(testTool?.parameters.properties.str).toMatchObject({ type: 'string' })
      expect(testTool?.parameters.properties.num).toMatchObject({ type: 'number' })
      expect(testTool?.parameters.required).toEqual(['str'])
    })

    it('should handle multiple tools', () => {
      @Injectable()
      class Service1 {
        @Tool({ name: 'tool1', description: 'First tool' })
        method1(@ToolArg({ zod: z.string(), paramName: 'arg1' }) arg1: string): string {
          return '1'
        }
      }

      @Injectable()
      class Service2 {
        @Tool({ name: 'tool2', description: 'Second tool' })
        method2(@ToolArg({ zod: z.number(), paramName: 'arg2' }) arg2: number): string {
          return '2'
        }
      }

      const tools = buildUnifiedTools()

      const tool1 = tools.find((t: UnifiedTool) => t.name === 'tool1')
      const tool2 = tools.find((t: UnifiedTool) => t.name === 'tool2')

      expect(tool1).toBeDefined()
      expect(tool2).toBeDefined()
      expect(tool1?.description).toBe('First tool')
      expect(tool2?.description).toBe('Second tool')
    })
  })

  describe('unifiedToolsToAnthropic', () => {
    it('should convert unified tools to Anthropic format', () => {
      const unifiedTools: UnifiedTool[] = [
        {
          name: 'test_tool',
          description: 'A test tool',
          parameters: {
            type: 'object',
            properties: {
              str: { type: 'string', description: 'A string param' },
              num: { type: 'number' }
            },
            required: ['str']
          }
        }
      ]

      const anthropicTools = unifiedToolsToAnthropic(unifiedTools)

      expect(anthropicTools.length).toBe(1)
      expect(anthropicTools[0]).toEqual({
        name: 'test_tool',
        description: 'A test tool',
        input_schema: {
          type: 'object',
          properties: {
            str: { type: 'string', description: 'A string param' },
            num: { type: 'number' }
          },
          required: ['str']
        }
      })
    })
  })

  describe('unifiedToolsToOpenAI', () => {
    it('should convert unified tools to OpenAI format', () => {
      const unifiedTools: UnifiedTool[] = [
        {
          name: 'test_tool',
          description: 'A test tool',
          parameters: {
            type: 'object',
            properties: {
              str: { type: 'string', description: 'A string param' },
              num: { type: 'number' }
            },
            required: ['str']
          }
        }
      ]

      const openaiTools = unifiedToolsToOpenAI(unifiedTools)

      expect(openaiTools.length).toBe(1)
      expect(openaiTools[0]).toEqual({
        type: 'function',
        function: {
          name: 'test_tool',
          description: 'A test tool',
          parameters: {
            type: 'object',
            properties: {
              str: { type: 'string', description: 'A string param' },
              num: { type: 'number' }
            },
            required: ['str']
          }
        }
      })
    })
  })

  describe('unifiedToolsToGoogle', () => {
    it('should convert unified tools to Google format', () => {
      const unifiedTools: UnifiedTool[] = [
        {
          name: 'test_tool',
          description: 'A test tool',
          parameters: {
            type: 'object',
            properties: {
              str: { type: 'string', description: 'A string param' },
              num: { type: 'number' }
            },
            required: ['str']
          }
        }
      ]

      const googleTool = unifiedToolsToGoogle(unifiedTools)

      expect(googleTool.functionDeclarations.length).toBe(1)
      expect(googleTool.functionDeclarations[0]).toEqual({
        name: 'test_tool',
        description: 'A test tool',
        parameters: {
          type: 'object',
          properties: {
            str: { type: 'string', description: 'A string param' },
            num: { type: 'number' }
          },
          required: ['str']
        }
      })
    })

    it('should handle multiple tools', () => {
      const unifiedTools: UnifiedTool[] = [
        {
          name: 'tool1',
          description: 'First tool',
          parameters: {
            type: 'object',
            properties: {
              arg1: { type: 'string' }
            },
            required: ['arg1']
          }
        },
        {
          name: 'tool2',
          description: 'Second tool',
          parameters: {
            type: 'object',
            properties: {
              arg2: { type: 'number' }
            },
            required: ['arg2']
          }
        }
      ]

      const googleTool = unifiedToolsToGoogle(unifiedTools)

      expect(googleTool.functionDeclarations.length).toBe(2)
      expect(googleTool.functionDeclarations[0]!.name).toBe('tool1')
      expect(googleTool.functionDeclarations[1]!.name).toBe('tool2')
    })
  })
})
