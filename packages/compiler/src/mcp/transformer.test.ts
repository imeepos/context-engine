/**
 * @fileoverview MCP 转换器单元测试
 */

import { describe, it, expect } from 'vitest'
import { unifiedRequestToMCPToolCall, mcpToolCallResponseToUnified, mcpRequestAstToJSONRPC, jsonrpcResponseToMCPAst } from './transformer'
import { UnifiedRequestAst, MCPRequestAst } from '../ast'
import { MCPCallToolResponse } from './types'

describe('MCP Transformer', () => {
    describe('unifiedRequestToMCPToolCall', () => {
        it('should convert UnifiedRequest with tool use to MCP tool call', () => {
            const request = new UnifiedRequestAst()
            request.messages = [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'tool_use',
                            id: 'tool_123',
                            name: 'test_tool',
                            input: { param1: 'value1' }
                        }
                    ]
                }
            ]

            const mcpRequest = unifiedRequestToMCPToolCall(request)

            expect(mcpRequest).not.toBeNull()
            expect(mcpRequest?.method).toBe('tools/call')
            expect(mcpRequest?.params.name).toBe('test_tool')
            expect(mcpRequest?.params.arguments).toEqual({ param1: 'value1' })
            expect(mcpRequest?.id).toBe('tool_123')
        })

        it('should return null for request without tool use', () => {
            const request = new UnifiedRequestAst()
            request.messages = [
                {
                    role: 'user',
                    content: 'Hello'
                }
            ]

            const mcpRequest = unifiedRequestToMCPToolCall(request)

            expect(mcpRequest).toBeNull()
        })
    })

    describe('mcpToolCallResponseToUnified', () => {
        it('should convert successful MCP response to UnifiedResponse', () => {
            const mcpResponse: MCPCallToolResponse = {
                jsonrpc: '2.0',
                id: 'tool_123',
                result: {
                    content: [{ type: 'text', text: 'Success result' }],
                    isError: false
                }
            }

            const unified = mcpToolCallResponseToUnified(mcpResponse, 'tool_123')

            expect(unified.role).toBe('assistant')
            expect(unified.content).toHaveLength(1)
            expect(unified.content[0]!.type).toBe('tool_result')
            expect((unified.content[0] as any).toolUseId).toBe('tool_123')
            expect((unified.content[0] as any).content).toBe('Success result')
        })

        it('should handle error responses', () => {
            const mcpResponse: MCPCallToolResponse = {
                jsonrpc: '2.0',
                id: 'tool_123',
                result: {
                    content: [{ type: 'text', text: 'Error occurred' }],
                    isError: true
                }
            }

            const unified = mcpToolCallResponseToUnified(mcpResponse, 'tool_123')

            expect((unified.content[0] as any).isError).toBe(true)
        })
    })

    describe('mcpRequestAstToJSONRPC', () => {
        it('should convert MCPRequestAst to JSON-RPC request', () => {
            const ast = new MCPRequestAst()
            ast.method = 'tools/call'
            ast.params = { name: 'test_tool' }
            ast.id = 'req_123'

            const jsonrpc = mcpRequestAstToJSONRPC(ast)

            expect(jsonrpc.jsonrpc).toBe('2.0')
            expect(jsonrpc.method).toBe('tools/call')
            expect(jsonrpc.params).toEqual({ name: 'test_tool' })
            expect(jsonrpc.id).toBe('req_123')
        })
    })

    describe('jsonrpcResponseToMCPAst', () => {
        it('should convert JSON-RPC response to MCPResponseAst', () => {
            const response = {
                jsonrpc: '2.0' as const,
                id: 'req_123',
                result: { data: 'test' }
            }

            const ast = jsonrpcResponseToMCPAst(response)

            expect(ast.id).toBe('req_123')
            expect(ast.result).toEqual({ data: 'test' })
            expect(ast.error).toBeUndefined()
        })
    })
})
