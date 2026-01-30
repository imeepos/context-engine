/**
 * @fileoverview 统一工具构建器
 * @description 基于装饰器元数据构建 UnifiedTool，并转换为各厂商格式
 * @version 2.0
 */

import { root, ToolMetadataKey, ToolArgMetadataKey, Type } from '@sker/core'
import { ToolMetadata, ToolArgMetadata } from '@sker/core'
import { AnthropicTool, OpenAITool, GoogleTool, GoogleToolFunctionDeclaration, UnifiedTool, UnifiedToolParameters } from '../ast'
import { zodToJsonSchema, isOptionalParam } from '../utils/zod-to-json-schema'
import { buildToolArgsMap } from '../utils/tool-args-map'

// ==================== 核心构建函数 ====================

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

    const toolArgMetadatas = root.get(ToolArgMetadataKey) ?? []

    // 构建参数映射
    const toolArgsMap = buildToolArgsMap(toolArgMetadatas)

    // 转换为 UnifiedTool 格式
    return toolMetadatas.map((toolMeta: ToolMetadata): UnifiedTool => {
        const key = `${toolMeta.target.name}-${String(toolMeta.propertyKey)}`
        const args = toolArgsMap.get(key) ?? []

        const properties: Record<string, any> = {}
        const required: string[] = []

        for (const arg of args.sort((a, b) => a.parameterIndex - b.parameterIndex)) {
            const paramName = arg.paramName ?? `param${arg.parameterIndex}`
            properties[paramName] = zodToJsonSchema(arg.zod)
            if (!isOptionalParam(arg.zod)) {
                required.push(paramName)
            }
        }

        return {
            name: toolMeta.name,
            description: toolMeta.description,
            parameters: {
                type: 'object',
                properties,
                required: required.length > 0 ? required : undefined
            }
        }
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
            input_schema: {
                type: 'object',
                properties: tool.parameters.properties,
                required: tool.parameters.required
            }
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
                parameters: {
                    type: 'object',
                    properties: tool.parameters.properties,
                    required: tool.parameters.required
                }
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
            parameters: {
                type: 'object',
                properties: tool.parameters.properties,
                required: tool.parameters.required
            }
        }
    })

    return {
        functionDeclarations
    }
}
