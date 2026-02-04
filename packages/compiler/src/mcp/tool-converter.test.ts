/**
 * @fileoverview MCP 工具转换器单元测试
 */

import { describe, it, expect } from 'vitest'
import { unifiedToolsToMCP, mcpToolsToUnified } from './tool-converter'
import { UnifiedTool } from '../ast'
import { MCPTool } from './types'

describe('MCP Tool Converter', () => {
    describe('unifiedToolsToMCP', () => {
        it('should convert UnifiedTool to MCPTool', () => {
            const unifiedTools: UnifiedTool[] = [
                {
                    name: 'test_tool',
                    description: 'A test tool',
                    parameters: {
                        type: 'object',
                        properties: {
                            param1: { type: 'string', description: 'First parameter' }
                        },
                        required: ['param1']
                    },
                    execute: async () => {}
                }
            ]

            const mcpTools = unifiedToolsToMCP(unifiedTools)

            expect(mcpTools).toHaveLength(1)
            expect(mcpTools[0]!.name).toBe('test_tool')
            expect(mcpTools[0]!.description).toBe('A test tool')
            expect(mcpTools[0]!.inputSchema.type).toBe('object')
            expect(mcpTools[0]!.inputSchema.properties['param1']!.type).toBe('string')
            expect(mcpTools[0]!.inputSchema.required).toEqual(['param1'])
        })

        it('should handle tools without required parameters', () => {
            const unifiedTools: UnifiedTool[] = [
                {
                    name: 'optional_tool',
                    description: 'Tool with optional params',
                    parameters: {
                        type: 'object',
                        properties: {
                            param1: { type: 'string' }
                        }
                    },
                    execute: async () => {}
                }
            ]

            const mcpTools = unifiedToolsToMCP(unifiedTools)

            expect(mcpTools[0]).toBeDefined()
            expect(mcpTools[0]!.inputSchema.required).toBeUndefined()
        })
    })

    describe('mcpToolsToUnified', () => {
        it('should convert MCPTool to UnifiedTool', () => {
            const mcpTools: MCPTool[] = [
                {
                    name: 'test_tool',
                    description: 'A test tool',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            param1: { type: 'string', description: 'First parameter' }
                        },
                        required: ['param1']
                    }
                }
            ]

            const unifiedTools = mcpToolsToUnified(mcpTools)

            expect(unifiedTools).toHaveLength(1)
            expect(unifiedTools[0]).toBeDefined()
            expect(unifiedTools[0]!.name).toBe('test_tool')
            expect(unifiedTools[0]!.description).toBe('A test tool')
            expect(unifiedTools[0]!.parameters.type).toBe('object')
            expect(unifiedTools[0]!.parameters.properties['param1']!.type).toBe('string')
            expect(unifiedTools[0]!.parameters.required).toEqual(['param1'])
        })
    })
})
