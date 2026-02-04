/**
 * @fileoverview 统一工具构建器
 * @description 基于装饰器元数据构建 UnifiedTool，并转换为各厂商格式
 * @version 2.0
 */
import 'reflect-metadata';
import { root, ToolMetadataKey, Type } from '@sker/core'
import { ToolMetadata, TOOL_METADATA_KEY } from '@sker/core'
import { AnthropicTool, OpenAITool, GoogleTool, GoogleToolFunctionDeclaration, UnifiedTool } from '../ast'
import { zodToJsonSchema, isOptionalParam } from '../utils/zod-to-json-schema'

// ==================== 核心构建函数 ====================
export function buildUnifiedTool(tool: Type<any>, propertyKey: string | symbol): UnifiedTool {
    // 直接从类上读取元数据，O(1) 查找
    const toolMetadata: ToolMetadata | undefined = Reflect.getMetadata(TOOL_METADATA_KEY, tool, propertyKey);

    if (!toolMetadata) {
        throw new Error(`Tool metadata not found for ${tool.name}.${String(propertyKey)}`)
    }

    const properties: Record<string, any> = {}
    const required: string[] = []

    for (const param of toolMetadata.parameters) {
        properties[param.paramName] = zodToJsonSchema(param.zod)
        if (!isOptionalParam(param.zod)) {
            required.push(param.paramName)
        }
    }

    return {
        name: toolMetadata.name,
        description: toolMetadata.description,
        parameters: {
            type: 'object',
            properties,
            required: required.length > 0 ? required : undefined
        },
        execute: async (params: Record<string, any>) => {
            const instance = root.get(tool)
            const args = toolMetadata.parameters

            const callArgs: any[] = []
            for (const arg of args.sort((a, b) => a.parameterIndex - b.parameterIndex)) {
                const paramName = arg.paramName ?? `param${arg.parameterIndex}`
                const value = params[paramName]
                // zod校验
                const zodValue = arg.zod.parse(value)
                callArgs.push(zodValue)
            }

            const method = (instance as any)[propertyKey]
            return await method.call(instance, ...callArgs)
        }
    }
}
/**
 * 从装饰器元数据构建统一工具列表
 * @param filterTools 可选的工具类列表，用于过滤特定工具
 * @returns UnifiedTool[] 统一工具列表
 */
export function buildUnifiedTools(filterTools?: Type<any>[]): UnifiedTool[] {
    let toolMetadatas = root.get(ToolMetadataKey) ?? []

    if (filterTools?.length) {
        const filterNames = new Set(filterTools.map(t => t.name))
        toolMetadatas = toolMetadatas.filter((m: ToolMetadata) => filterNames.has(m.target.name))
    }

    return toolMetadatas.map((toolMeta: ToolMetadata): UnifiedTool => {
        return buildUnifiedTool(toolMeta.target, toolMeta.propertyKey)
    })
}

// ==================== 厂商转换函数 ====================

/**
 * 统一工具转换为 Anthropic 格式
 * @param tools 统一工具列表
 * @returns AnthropicTool[] Anthropic 工具列表
 */
export function unifiedToolsToAnthropic(tools: UnifiedTool[]): AnthropicTool[] {
    return tools.map((tool): AnthropicTool => {
        return {
            name: tool.name,
            description: tool.description,
            input_schema: tool.parameters
        }
    })
}

/**
 * 统一工具转换为 OpenAI 格式
 * @param tools 统一工具列表
 * @returns OpenAITool[] OpenAI 工具列表
 */
export function unifiedToolsToOpenAI(tools: UnifiedTool[]): OpenAITool[] {
    return tools.map((tool): OpenAITool => {
        return {
            type: 'function',
            function: {
                name: tool.name,
                description: tool.description,
                parameters: tool.parameters
            }
        }
    })
}

/**
 * 统一工具转换为 Google 格式
 * @param tools 统一工具列表
 * @returns GoogleTool Google 工具对象
 */
export function unifiedToolsToGoogle(tools: UnifiedTool[]): GoogleTool {
    const functionDeclarations: GoogleToolFunctionDeclaration[] = tools.map((tool) => {
        return {
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters
        }
    })

    return {
        functionDeclarations
    }
}
