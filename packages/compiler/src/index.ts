import 'reflect-metadata'
import { Module } from '@sker/core'
import { ParserVisitor } from './parser'
import { LLMService } from './llm/llm.service'
import { ToolCallLoop } from './llm/tool-loop'
import { UnifiedToolExecutor } from './llm/tool-executor'
import { AnthropicAdapter } from './llm/adapters/anthropic.adapter'
import { OpenAIAdapter } from './llm/adapters/openai.adapter'
import { GoogleAdapter } from './llm/adapters/google.adapter'
import { MCPAdapter } from './llm/adapters/mcp.adapter'
import { LLM_PROVIDER_ADAPTER } from './llm/adapter'

// 导出所有类型和工具
export * from './ast'
export * from './parser'
export * from './tool-builder'
export * from './tool'
export * from './unified'
export * from './llm'
export * from './mcp'
export * as google from './google/index'
export { zodToJsonSchema, isOptionalParam, zodToJsonSchemaWithDescription } from './utils/zod-to-json-schema'
export { buildToolArgsMap } from './utils/tool-args-map'

// Compiler 模块
@Module({
  providers: [
    { provide: ParserVisitor, useClass: ParserVisitor },
    { provide: LLMService, useClass: LLMService },
    { provide: ToolCallLoop, useClass: ToolCallLoop },
    { provide: UnifiedToolExecutor, useClass: UnifiedToolExecutor },
    { provide: LLM_PROVIDER_ADAPTER, useClass: AnthropicAdapter, multi: true },
    { provide: LLM_PROVIDER_ADAPTER, useClass: OpenAIAdapter, multi: true },
    { provide: LLM_PROVIDER_ADAPTER, useClass: GoogleAdapter, multi: true },
    { provide: LLM_PROVIDER_ADAPTER, useClass: MCPAdapter, multi: true }
  ],
  exports: [
    ParserVisitor,
    LLMService,
    ToolCallLoop,
    UnifiedToolExecutor,
    LLM_PROVIDER_ADAPTER
  ]
})
export class CompilerModule {}
