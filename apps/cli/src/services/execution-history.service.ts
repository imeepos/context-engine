import { Inject, Injectable } from '@sker/core'
import { STORAGE_TOKEN } from '../storage/storage.interface'
import { JsonFileStorage } from '../storage/json-file-storage'
import {
  ExecutionHistory,
  ExecutionIteration,
  LLMRequestRecord
} from '../types/execution-history'
import { UnifiedRequestAst, UnifiedResponseAst, UnifiedToolUseContent } from '@sker/compiler'
import { UnifiedToolResult } from '@sker/compiler'

@Injectable({ providedIn: 'auto' })
export class ExecutionHistoryService {
  private currentHistory: ExecutionHistory | null = null
  private currentIteration: ExecutionIteration | null = null

  constructor(@Inject(STORAGE_TOKEN) private storage: JsonFileStorage) {}

  startTaskExecution(taskId: string): void {
    this.currentHistory = {
      taskId,
      startTime: Date.now(),
      iterations: [],
      totalIterations: 0
    }
  }

  startIteration(iteration: number): void {
    if (!this.currentHistory) return

    this.currentIteration = {
      iteration,
      startTime: Date.now(),
      llmRequest: {} as LLMRequestRecord,
      toolCalls: [],
      toolResults: []
    }
  }

  recordLLMRequest(request: UnifiedRequestAst): void {
    if (!this.currentIteration) return

    this.currentIteration.llmRequest = {
      timestamp: Date.now(),
      model: request.model,
      provider: request._provider || 'unknown',
      messages: this.sanitizeMessages(request.messages),
      system: this.truncateText(request.system, 5000),
      temperature: request.temperature,
      maxTokens: request.maxTokens,
      toolsCount: request.tools?.length || 0
    }
  }

  recordLLMResponse(response: UnifiedResponseAst, duration: number): void {
    if (!this.currentIteration) return

    this.currentIteration.llmResponse = {
      timestamp: Date.now(),
      duration,
      stopReason: response.stopReason,
      contentTypes: response.content.map(c => c.type),
      usage: response.usage ? {
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens
      } : undefined
    }
  }

  recordToolCall(toolUse: UnifiedToolUseContent): void {
    if (!this.currentIteration) return

    this.currentIteration.toolCalls.push({
      timestamp: Date.now(),
      toolUseId: toolUse.id,
      toolName: toolUse.name,
      input: this.sanitizeInput(toolUse.input)
    })
  }

  recordToolResult(result: UnifiedToolResult, duration: number): void {
    if (!this.currentIteration) return

    this.currentIteration.toolResults.push({
      timestamp: Date.now(),
      duration,
      toolUseId: result.toolUseId,
      toolName: result.toolName,
      output: this.truncateText(result.content, 10000) || '',
      isError: result.isError || false
    })
  }

  finishIteration(): void {
    if (!this.currentHistory || !this.currentIteration) return

    this.currentIteration.endTime = Date.now()
    this.currentHistory.iterations.push(this.currentIteration)
    this.currentHistory.totalIterations++
    this.currentIteration = null
  }

  async finishTaskExecution(taskId: string): Promise<void> {
    if (!this.currentHistory || this.currentHistory.taskId !== taskId) return

    this.currentHistory.endTime = Date.now()
    this.currentHistory.summary = this.calculateSummary(this.currentHistory)

    await this.storage.write(`execution-history/${taskId}`, this.currentHistory)
    this.currentHistory = null
  }

  async getHistory(taskId: string): Promise<ExecutionHistory | null> {
    return this.storage.read<ExecutionHistory>(`execution-history/${taskId}`)
  }

  private sanitizeMessages(messages: any[]): Array<{ role: string; content: any }> {
    return messages.map(msg => ({
      role: msg.role,
      content: typeof msg.content === 'string'
        ? this.truncateText(this.filterSensitive(msg.content), 5000) || ''
        : msg.content
    }))
  }

  private sanitizeInput(input: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(input)) {
      if (typeof value === 'string') {
        sanitized[key] = this.truncateText(this.filterSensitive(value), 5000) || ''
      } else {
        sanitized[key] = value
      }
    }
    return sanitized
  }

  private filterSensitive(text: string): string {
    return text
      .replace(/sk-[a-zA-Z0-9]{20,}/g, 'sk-***')
      .replace(/Bearer\s+[a-zA-Z0-9_-]+/g, 'Bearer ***')
      .replace(/password["\s:=]+[^\s"]+/gi, 'password: ***')
  }

  private truncateText(text: string | undefined, maxLength: number): string | undefined {
    if (!text) return text
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...[truncated]'
  }

  private calculateSummary(history: ExecutionHistory) {
    let totalTokens = 0
    let totalToolCalls = 0
    let errorCount = 0

    for (const iter of history.iterations) {
      if (iter.llmResponse?.usage) {
        totalTokens += iter.llmResponse.usage.inputTokens + iter.llmResponse.usage.outputTokens
      }
      totalToolCalls += iter.toolCalls.length
      errorCount += iter.toolResults.filter(r => r.isError).length
    }

    return { totalTokens, totalToolCalls, errorCount }
  }
}
