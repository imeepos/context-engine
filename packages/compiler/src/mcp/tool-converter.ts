/**
 * @fileoverview MCP 工具转换器
 * @description UnifiedTool 与 MCPTool 之间的双向转换
 * @version 1.0
 */

import { UnifiedTool } from '../ast'
import { MCPTool } from './types'

/**
 * 将 UnifiedTool 转换为 MCP 格式
 * @param tools 统一工具列表
 * @returns MCPTool[] MCP 工具列表
 */
export function unifiedToolsToMCP(tools: UnifiedTool[]): MCPTool[] {
    return tools.map((tool): MCPTool => {
        return {
            name: tool.name,
            description: tool.description,
            inputSchema: {
                type: 'object',
                properties: tool.parameters.properties,
                required: tool.parameters.required
            }
        }
    })
}

/**
 * 将 MCP 工具转换为 UnifiedTool 格式
 * @param tools MCP 工具列表
 * @returns UnifiedTool[] 统一工具列表
 */
export function mcpToolsToUnified(tools: MCPTool[]): UnifiedTool[] {
    return tools.map((tool): UnifiedTool => {
        return {
            name: tool.name,
            description: tool.description,
            parameters: {
                type: 'object',
                properties: tool.inputSchema.properties,
                required: tool.inputSchema.required
            },
            execute: async () => {
                throw new Error('Execute not implemented for MCP-converted tools')
            }
        }
    })
}
