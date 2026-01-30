import { describe, it, expect } from 'vitest'
import { Injectable, Tool, ToolArg, root, ToolMetadataKey, ToolArgMetadataKey } from '@sker/core'
import { z } from 'zod'
import { buildOpenAITools, buildAnthropicTools } from './tool-builder'

describe('tool-builder', () => {
  describe('buildOpenAITools', () => {
    it('should build OpenAI tool format from decorated methods', () => {
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

      const tools = buildOpenAITools()

      expect(tools.length).toBeGreaterThan(0)
      const testTool = tools.find(t => t.function.name === 'test_tool')
      expect(testTool).toEqual({
        type: 'function',
        function: {
          name: 'test_tool',
          description: 'A test tool',
          parameters: {
            type: 'object',
            properties: {
              str: { type: 'string', description: 'A string param' },
              num: { type: 'number', description: 'A number param' }
            },
            required: ['str']
          }
        }
      })
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

      const tools = buildOpenAITools()

      const tool1 = tools.find(t => t.function.name === 'tool1')
      const tool2 = tools.find(t => t.function.name === 'tool2')

      expect(tool1).toBeDefined()
      expect(tool2).toBeDefined()
      expect(tool1?.function.description).toBe('First tool')
      expect(tool2?.function.description).toBe('Second tool')
    })

    it('should handle nested object schemas', () => {
      @Injectable()
      class TestService3 {
        @Tool({ name: 'complex_tool', description: 'Complex tool' })
        complexMethod(
          @ToolArg({
            zod: z.object({
              nested: z.string(),
              optional: z.number().optional()
            }),
            paramName: 'obj'
          }) obj: any
        ): string {
          return 'complex'
        }
      }

      const tools = buildOpenAITools()
      const tool = tools.find(t => t.function.name === 'complex_tool')

      expect(tool?.function.parameters.properties.obj).toMatchObject({
        type: 'object',
        properties: {
          nested: { type: 'string' },
          optional: { type: 'number' }
        },
        required: ['nested']
      })
    })

    it('should handle array schemas', () => {
      @Injectable()
      class TestService4 {
        @Tool({ name: 'array_tool', description: 'Array tool' })
        arrayMethod(
          @ToolArg({ zod: z.array(z.string()), paramName: 'items' }) items: string[]
        ): string {
          return 'array'
        }
      }

      const tools = buildOpenAITools()
      const tool = tools.find(t => t.function.name === 'array_tool')

      expect(tool?.function.parameters.properties.items).toEqual({
        type: 'array',
        items: { type: 'string' }
      })
    })

    it('should handle boolean schemas', () => {
      @Injectable()
      class TestService5 {
        @Tool({ name: 'bool_tool', description: 'Boolean tool' })
        boolMethod(
          @ToolArg({ zod: z.boolean(), paramName: 'flag' }) flag: boolean
        ): string {
          return 'bool'
        }
      }

      const tools = buildOpenAITools()
      const tool = tools.find(t => t.function.name === 'bool_tool')

      expect(tool?.function.parameters.properties.flag).toEqual({
        type: 'boolean'
      })
    })

    it('should filter tools when filterTools parameter is provided', () => {
      @Injectable()
      class FilterService1 {
        @Tool({ name: 'filter_tool_1', description: 'First filter tool' })
        method1(@ToolArg({ zod: z.string(), paramName: 'arg1' }) arg1: string): string {
          return '1'
        }
      }

      @Injectable()
      class FilterService2 {
        @Tool({ name: 'filter_tool_2', description: 'Second filter tool' })
        method2(@ToolArg({ zod: z.string(), paramName: 'arg2' }) arg2: string): string {
          return '2'
        }
      }

      const tools = buildOpenAITools([FilterService1])

      expect(tools.length).toBeGreaterThan(0)
      const tool1 = tools.find(t => t.function.name === 'filter_tool_1')
      const tool2 = tools.find(t => t.function.name === 'filter_tool_2')

      expect(tool1).toBeDefined()
      expect(tool2).toBeUndefined()
    })
  })

  describe('buildAnthropicTools', () => {
    it('should filter tools when filterTools parameter is provided', () => {
      @Injectable()
      class AnthropicService1 {
        @Tool({ name: 'anthropic_tool_1', description: 'First anthropic tool' })
        method1(@ToolArg({ zod: z.string(), paramName: 'arg1' }) arg1: string): string {
          return '1'
        }
      }

      @Injectable()
      class AnthropicService2 {
        @Tool({ name: 'anthropic_tool_2', description: 'Second anthropic tool' })
        method2(@ToolArg({ zod: z.string(), paramName: 'arg2' }) arg2: string): string {
          return '2'
        }
      }

      const tools = buildAnthropicTools([AnthropicService1])

      expect(tools.length).toBeGreaterThan(0)
      const tool1 = tools.find(t => t.name === 'anthropic_tool_1')
      const tool2 = tools.find(t => t.name === 'anthropic_tool_2')

      expect(tool1).toBeDefined()
      expect(tool2).toBeUndefined()
    })
  })
})
