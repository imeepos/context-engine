/**
 * @fileoverview MCP 工具执行器
 * @description 处理 MCP 格式的工具调用和执行
 * @version 1.0
 */

import { root, ToolMetadataKey, ToolArgMetadataKey, ToolMetadata } from '@sker/core'
import { Ast, Visitor, MCPRequestAst, MCPResponseAst } from '../ast'
import { isOptionalParam } from '../utils/zod-to-json-schema'
import { buildToolArgsMap } from '../utils/tool-args-map'
import { MCPErrorCode } from './types'

export class MCPToolExecutorVisitor implements Visitor {
    visit(ast: Ast, ctx: any) {
        return ast.visit(this, ctx)
    }

    async visitMCPRequestAst(ast: MCPRequestAst, _ctx: any): Promise<MCPResponseAst> {
        if (ast.method !== 'tools/call') {
            const response = new MCPResponseAst()
            response.id = ast.id || null
            response.error = {
                code: MCPErrorCode.MethodNotFound,
                message: `Method ${ast.method} not found`
            }
            return response
        }

        const params = ast.params as { name: string; arguments?: Record<string, unknown> }
        if (!params || !params.name) {
            const response = new MCPResponseAst()
            response.id = ast.id || null
            response.error = {
                code: MCPErrorCode.InvalidParams,
                message: 'Missing tool name in params'
            }
            return response
        }

        try {
            const toolMetadatas = root.get(ToolMetadataKey) ?? []
            const toolMeta = toolMetadatas.find((m: ToolMetadata) => m.name === params.name)

            if (!toolMeta) {
                const response = new MCPResponseAst()
                response.id = ast.id || null
                response.error = {
                    code: MCPErrorCode.ToolNotFound,
                    message: `Tool ${params.name} not found`
                }
                return response
            }

            const instance: any = root.get(toolMeta.target)
            const toolArgMetadatas = root.get(ToolArgMetadataKey) ?? []
            const toolArgsMap = buildToolArgsMap(toolArgMetadatas)
            const key = `${toolMeta.target.name}-${String(toolMeta.propertyKey)}`
            const args = toolArgsMap.get(key) ?? []

            const callArgs: any[] = []
            for (const arg of args.sort((a, b) => a.parameterIndex - b.parameterIndex)) {
                const paramName = arg.paramName ?? `param${arg.parameterIndex}`
                const value = params.arguments?.[paramName]

                if (value === undefined && !isOptionalParam(arg.zod)) {
                    const response = new MCPResponseAst()
                    response.id = ast.id || null
                    response.error = {
                        code: MCPErrorCode.InvalidParams,
                        message: `Required parameter '${paramName}' is missing`
                    }
                    return response
                }

                callArgs.push(value)
            }

            const rawResult = instance[toolMeta.propertyKey](...callArgs)
            const result = rawResult instanceof Promise ? await rawResult : rawResult

            const response = new MCPResponseAst()
            response.id = ast.id || null
            response.result = {
                content: [
                    {
                        type: 'text',
                        text: String(result)
                    }
                ],
                isError: false
            }
            return response
        } catch (error) {
            const response = new MCPResponseAst()
            response.id = ast.id || null
            response.error = {
                code: MCPErrorCode.InternalError,
                message: error instanceof Error ? error.message : String(error)
            }
            return response
        }
    }

    visitMCPResponseAst(ast: MCPResponseAst, _ctx: any) {
        return ast
    }

    visitAnthropicRequestAst(_ast: any, _ctx: any) {
        throw new Error('Method not implemented.')
    }
    visitOpenAIRequestAst(_ast: any, _ctx: any) {
        throw new Error('Method not implemented.')
    }
    visitGoogleRequestAst(_ast: any, _ctx: any) {
        throw new Error('Method not implemented.')
    }
    visitOpenAiResponseAst(_ast: any, _ctx: any) {
        throw new Error('Method not implemented.')
    }
    visitGoogleResponseAst(_ast: any, _ctx: any) {
        throw new Error('Method not implemented.')
    }
    visitAnthropicResponseAst(_ast: any, _ctx: any) {
        throw new Error('Method not implemented.')
    }
    visitAnthropicMessageStartAst(_ast: any, _ctx: any) {
        throw new Error('Method not implemented.')
    }
    visitAnthropicContentBlockDeltaAst(_ast: any, _ctx: any) {
        throw new Error('Method not implemented.')
    }
    visitAnthropicContentBlockStartAst(_ast: any, _ctx: any) {
        throw new Error('Method not implemented.')
    }
    visitAnthropicContentBlockStopAst(_ast: any, _ctx: any) {
        throw new Error('Method not implemented.')
    }
    visitAnthropicMessageDeltaAst(_ast: any, _ctx: any) {
        throw new Error('Method not implemented.')
    }
    visitAnthropicMessageStopAst(_ast: any, _ctx: any) {
        throw new Error('Method not implemented.')
    }
    visitUnifiedRequestAst(_ast: any, _ctx: any) {
        throw new Error('Method not implemented.')
    }
    visitUnifiedResponseAst(_ast: any, _ctx: any) {
        throw new Error('Method not implemented.')
    }
    visitUnifiedStreamEventAst(_ast: any, _ctx: any) {
        throw new Error('Method not implemented.')
    }
}
