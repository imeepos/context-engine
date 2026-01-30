import { Type } from '@sker/core'
import { AnthropicTool, OpenAITool } from './ast'
import { buildUnifiedTools, unifiedToolsToAnthropic, unifiedToolsToOpenAI } from './unified/tool-builder'

export function buildAnthropicTools(filterTools?: Type<any>[]): AnthropicTool[] {
    const unifiedTools = buildUnifiedTools(filterTools)
    return unifiedToolsToAnthropic(unifiedTools)
}

export function buildOpenAITools(filterTools?: Type<any>[]): OpenAITool[] {
    const unifiedTools = buildUnifiedTools(filterTools)
    return unifiedToolsToOpenAI(unifiedTools)
}
