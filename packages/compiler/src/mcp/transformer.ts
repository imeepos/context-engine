/**
 * @fileoverview MCP 请求/响应转换器
 * @description UnifiedRequest/Response 与 MCP 格式之间的转换
 * @version 1.0
 */

import { UnifiedRequestAst, UnifiedResponseAst, UnifiedContent, UnifiedToolUseContent, MCPRequestAst, MCPResponseAst } from '../ast'
import { JSONRPCRequest, JSONRPCResponse, MCPCallToolRequest, MCPCallToolResponse } from './types'

/**
 * 将 UnifiedRequest 转换为 MCP 工具调用请求
 * @param request 统一请求
 * @returns MCPCallToolRequest MCP 工具调用请求
 */
export function unifiedRequestToMCPToolCall(request: UnifiedRequestAst): MCPCallToolRequest | null {
    const lastMessage = request.messages[request.messages.length - 1]
    if (!lastMessage || typeof lastMessage.content === 'string') {
        return null
    }

    const toolUse = lastMessage.content.find((c): c is UnifiedToolUseContent => c.type === 'tool_use')
    if (!toolUse) {
        return null
    }

    return {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: toolUse.name,
            arguments: toolUse.input
        },
        id: toolUse.id
    }
}

/**
 * 将 MCP 工具调用响应转换为 UnifiedResponse
 * @param response MCP 工具调用响应
 * @param toolUseId 工具使用 ID
 * @returns UnifiedResponseAst 统一响应
 */
export function mcpToolCallResponseToUnified(response: MCPCallToolResponse, toolUseId: string): UnifiedResponseAst {
    const result = response.result
    const content: UnifiedContent[] = []

    if (result.isError) {
        content.push({
            type: 'tool_result',
            toolUseId,
            content: result.content[0]?.text || 'Unknown error',
            isError: true
        })
    } else {
        content.push({
            type: 'tool_result',
            toolUseId,
            content: result.content[0]?.text || ''
        })
    }

    const unified = new UnifiedResponseAst()
    unified.role = 'assistant'
    unified.content = content
    unified._provider = 'anthropic'
    return unified
}

/**
 * 将 MCPRequestAst 转换为 JSON-RPC 请求
 * @param ast MCP 请求 AST
 * @returns JSONRPCRequest JSON-RPC 请求
 */
export function mcpRequestAstToJSONRPC(ast: MCPRequestAst): JSONRPCRequest {
    return {
        jsonrpc: '2.0',
        method: ast.method,
        params: ast.params,
        id: ast.id
    }
}

/**
 * 将 JSON-RPC 响应转换为 MCPResponseAst
 * @param response JSON-RPC 响应
 * @returns MCPResponseAst MCP 响应 AST
 */
export function jsonrpcResponseToMCPAst(response: JSONRPCResponse): MCPResponseAst {
    const ast = new MCPResponseAst()
    ast.id = response.id
    ast.result = response.result
    ast.error = response.error
    return ast
}
