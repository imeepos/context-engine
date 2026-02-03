import { root, ToolMetadataKey, ToolArgMetadataKey, ToolMetadata } from '@sker/core'
import { AnthropicContentBlockDeltaAst, AnthropicContentBlockStartAst, AnthropicContentBlockStopAst, AnthropicMessageDeltaAst, AnthropicMessageStartAst, AnthropicMessageStopAst, AnthropicRequestAst, AnthropicResponseAst, Ast, GoogleRequestAst, GoogleResponseAst, OpenAIRequestAst, OpenAiResponseAst, Visitor, AnthropicToolUseBlock } from "./ast";
import { isOptionalParam } from './utils/zod-to-json-schema'
import { buildToolArgsMap } from './utils/tool-args-map'

export interface ToolResult {
    tool_use_id: string
    content: string
    is_error?: boolean
}

export class ToolExecutorVisitor implements Visitor {
    visit(ast: Ast, ctx: any) {
        return ast.visit(this, ctx);
    }
    visitAnthropicRequestAst(_ast: AnthropicRequestAst, _ctx: any) {
        throw new Error("Method not implemented.");
    }
    visitOpenAIRequestAst(_ast: OpenAIRequestAst, _ctx: any) {
        throw new Error("Method not implemented.");
    }
    visitGoogleRequestAst(_ast: GoogleRequestAst, _ctx: any) {
        throw new Error("Method not implemented.");
    }
    visitOpenAiResponseAst(ast: OpenAiResponseAst, _ctx: any): ToolResult[] {
        const toolArgMetadatas = root.get(ToolArgMetadataKey) ?? []
        const toolArgsMap = buildToolArgsMap(toolArgMetadatas)

        const instanceMap = new Map<string, any>()
        const results: ToolResult[] = []

        for (const choice of ast.choices) {
            if (choice.delta.tool_calls) {
                for (const toolCall of choice.delta.tool_calls) {
                    try {
                        const toolMetadatas = root.get(ToolMetadataKey) ?? []
                        const toolMeta = toolMetadatas.find((m: ToolMetadata) => m.name === toolCall.function?.name)
                        if (!toolMeta) {
                            results.push({
                                tool_use_id: toolCall.id || '',
                                content: `Tool ${toolCall.function?.name} not found`,
                                is_error: true
                            })
                            continue
                        }

                        let instance = instanceMap.get(toolMeta.target.name)
                        if (!instance) {
                            instance = root.get(toolMeta.target)
                            instanceMap.set(toolMeta.target.name, instance)
                        }

                        const key = `${toolMeta.target.name}-${String(toolMeta.propertyKey)}`
                        const args = toolArgsMap.get(key) ?? []

                        const parsedArgs = toolCall.function?.arguments ? JSON.parse(toolCall.function.arguments) : {}
                        const callArgs: any[] = []

                        for (const arg of args.sort((a, b) => a.parameterIndex - b.parameterIndex)) {
                            const paramName = arg.paramName ?? `param${arg.parameterIndex}`
                            const value = parsedArgs[paramName]

                            if (value === undefined && !isOptionalParam(arg.zod)) {
                                throw new Error(`Required parameter '${paramName}' is missing or undefined`)
                            }

                            callArgs.push(value)
                        }

                        const result = instance[toolMeta.propertyKey](...callArgs)
                        results.push({
                            tool_use_id: toolCall.id || '',
                            content: String(result)
                        })
                    } catch (error) {
                        results.push({
                            tool_use_id: toolCall.id || '',
                            content: error instanceof Error ? error.message : String(error),
                            is_error: true
                        })
                    }
                }
            }
        }

        return results
    }
    visitGoogleResponseAst(ast: GoogleResponseAst, _ctx: any): ToolResult[] {
        const toolArgMetadatas = root.get(ToolArgMetadataKey) ?? []
        const toolArgsMap = buildToolArgsMap(toolArgMetadatas)

        const instanceMap = new Map<string, any>()
        const results: ToolResult[] = []
        let toolCallIndex = 0

        for (const candidate of ast.candidates) {
            for (const part of candidate.content.parts) {
                if ('functionCall' in part) {
                    const functionCall = part.functionCall
                    try {
                        const toolMetadatas = root.get(ToolMetadataKey) ?? []
                        const toolMeta = toolMetadatas.find((m: ToolMetadata) => m.name === functionCall.name)
                        if (!toolMeta) {
                            results.push({
                                tool_use_id: `function_call_${toolCallIndex}`,
                                content: `Tool ${functionCall.name} not found`,
                                is_error: true
                            })
                            toolCallIndex++
                            continue
                        }

                        let instance = instanceMap.get(toolMeta.target.name)
                        if (!instance) {
                            instance = root.get(toolMeta.target)
                            instanceMap.set(toolMeta.target.name, instance)
                        }

                        const key = `${toolMeta.target.name}-${String(toolMeta.propertyKey)}`
                        const args = toolArgsMap.get(key) ?? []

                        const callArgs: any[] = []
                        for (const arg of args.sort((a, b) => a.parameterIndex - b.parameterIndex)) {
                            const paramName = arg.paramName ?? `param${arg.parameterIndex}`
                            const value = functionCall.args[paramName]

                            if (value === undefined && !isOptionalParam(arg.zod)) {
                                throw new Error(`Required parameter '${paramName}' is missing or undefined`)
                            }

                            callArgs.push(value)
                        }

                        const result = instance[toolMeta.propertyKey](...callArgs)
                        results.push({
                            tool_use_id: `function_call_${toolCallIndex}`,
                            content: String(result)
                        })
                        toolCallIndex++
                    } catch (error) {
                        results.push({
                            tool_use_id: `function_call_${toolCallIndex}`,
                            content: error instanceof Error ? error.message : String(error),
                            is_error: true
                        })
                        toolCallIndex++
                    }
                }
            }
        }

        return results
    }
    async visitAnthropicResponseAst(ast: AnthropicResponseAst, _ctx: any): Promise<ToolResult[]> {
        const toolUses = ast.content.filter((block): block is AnthropicToolUseBlock => block.type === 'tool_use');

        const toolMetadatas = root.get(ToolMetadataKey) ?? []
        const toolArgMetadatas = root.get(ToolArgMetadataKey) ?? []
        const toolArgsMap = buildToolArgsMap(toolArgMetadatas)

        const instanceMap = new Map<string, any>()
        const results: ToolResult[] = []

        for (const toolUse of toolUses) {
            try {
                const toolMeta = toolMetadatas.find((m: ToolMetadata) => m.name === toolUse.name)
                if (!toolMeta) {
                    results.push({
                        tool_use_id: toolUse.id,
                        content: `Tool ${toolUse.name} not found`,
                        is_error: true
                    })
                    continue
                }

                let instance = instanceMap.get(toolMeta.target.name)
                if (!instance) {
                    instance = root.get(toolMeta.target)
                    instanceMap.set(toolMeta.target.name, instance)
                }

                const key = `${toolMeta.target.name}-${String(toolMeta.propertyKey)}`
                const args = toolArgsMap.get(key) ?? []
                const sortedArgs = args.sort((a, b) => a.parameterIndex - b.parameterIndex)

                const callArgs: any[] = []
                for (const arg of sortedArgs) {
                    const paramName = arg.paramName ?? `param${arg.parameterIndex}`
                    const value = toolUse.input[paramName]

                    if (value === undefined && !isOptionalParam(arg.zod)) {
                        throw new Error(`Required parameter '${paramName}' is missing or undefined`)
                    }

                    callArgs.push(value)
                }

                const rawResult = instance[toolMeta.propertyKey](...callArgs)
                const result = rawResult instanceof Promise ? await rawResult : rawResult
                results.push({
                    tool_use_id: toolUse.id,
                    content: String(result)
                })
            } catch (error) {
                results.push({
                    tool_use_id: toolUse.id,
                    content: error instanceof Error ? error.message : String(error),
                    is_error: true
                })
            }
        }

        return results
    }
    visitAnthropicMessageStartAst(_ast: AnthropicMessageStartAst, _ctx: any) {
        throw new Error("Method not implemented.");
    }
    visitAnthropicContentBlockDeltaAst(_ast: AnthropicContentBlockDeltaAst, _ctx: any) {
        throw new Error("Method not implemented.");
    }
    visitAnthropicContentBlockStartAst(_ast: AnthropicContentBlockStartAst, _ctx: any) {
        throw new Error("Method not implemented.");
    }
    visitAnthropicContentBlockStopAst(_ast: AnthropicContentBlockStopAst, _ctx: any) {
        throw new Error("Method not implemented.");
    }
    visitAnthropicMessageDeltaAst(_ast: AnthropicMessageDeltaAst, _ctx: any) {
        throw new Error("Method not implemented.");
    }
    visitAnthropicMessageStopAst(_ast: AnthropicMessageStopAst, _ctx: any) {
        throw new Error("Method not implemented.");
    }
    visitUnifiedRequestAst(_ast: any, _ctx: any): any {
        throw new Error("Method not implemented.");
    }
    visitUnifiedResponseAst(_ast: any, _ctx: any): any {
        throw new Error("Method not implemented.");
    }
    visitUnifiedStreamEventAst(_ast: any, _ctx: any): any {
        throw new Error("Method not implemented.");
    }
    visitMCPRequestAst(_ast: any, _ctx: any): any {
        throw new Error("Method not implemented.");
    }
    visitMCPResponseAst(_ast: any, _ctx: any): any {
        throw new Error("Method not implemented.");
    }
}