/**
 * @fileoverview MCP 适配器
 * @description 实现 MCP 协议的 LLM 提供商适配器
 * @version 1.0
 */

import { Injectable } from '@sker/core'
import { Observable, from } from 'rxjs'
import { LLMProviderAdapter } from '../adapter'
import { UnifiedRequestAst, UnifiedResponseAst, UnifiedStreamEventAst, MCPRequestAst, MCPResponseAst } from '../../ast'
import { MCPToolExecutorVisitor } from '../../mcp/tool-executor'
import { unifiedRequestToMCPToolCall, mcpToolCallResponseToUnified } from '../../mcp/transformer'
import { MCPCallToolResponse } from '../../mcp/types'

@Injectable()
export class MCPAdapter implements LLMProviderAdapter {
    readonly provider = 'anthropic' as const

    private executor = new MCPToolExecutorVisitor()

    async chat(request: UnifiedRequestAst): Promise<UnifiedResponseAst> {
        const mcpRequest = unifiedRequestToMCPToolCall(request)

        if (!mcpRequest) {
            throw new Error('Invalid request: no tool call found')
        }

        const mcpRequestAst = new MCPRequestAst()
        mcpRequestAst.method = mcpRequest.method
        mcpRequestAst.params = mcpRequest.params
        mcpRequestAst.id = typeof mcpRequest.id === 'string' || typeof mcpRequest.id === 'number' ? mcpRequest.id : undefined

        const mcpResponse = await this.executor.visitMCPRequestAst(mcpRequestAst, {})

        if (mcpResponse.error) {
            throw new Error(`MCP Error ${mcpResponse.error.code}: ${mcpResponse.error.message}`)
        }

        const toolUseId = String(mcpRequest.id)
        const mcpCallResponse: MCPCallToolResponse = {
            jsonrpc: '2.0',
            id: mcpResponse.id,
            result: mcpResponse.result as any
        }

        return mcpToolCallResponseToUnified(mcpCallResponse, toolUseId)
    }

    stream(request: UnifiedRequestAst): Observable<UnifiedStreamEventAst> {
        return from(this.chat(request).then(response => {
            const event = new UnifiedStreamEventAst()
            event.eventType = 'message_start'
            event.message = response
            event._provider = 'anthropic'
            return event
        }))
    }

    isAvailable(): boolean {
        return true
    }
}
