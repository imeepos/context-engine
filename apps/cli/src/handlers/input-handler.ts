import { isUnifiedTextContent, isUnifiedThinkingContent, LLMService, UnifiedRequestBuilder } from '@sker/compiler'
import { DEFAULT_MODEL, MAX_ITERATIONS } from '../config/constants'
import { UIRenderer } from '@sker/prompt-renderer'
import { ExecutionHistoryService } from '../services/execution-history.service'
import { Injector } from '@sker/core'

export class InputHandler {
  private llmService: LLMService
  private renderer: UIRenderer
  private historyService: ExecutionHistoryService

  constructor(llmService: LLMService, renderer: UIRenderer, injector: Injector) {
    this.llmService = llmService
    this.renderer = renderer
    this.historyService = injector.get(ExecutionHistoryService)
  }

  async handleInput(input: string): Promise<void> {
    const trimmed = input.trim()

    if (!trimmed) {
      return
    }

    try {
      const renderResult = await this.renderer.refresh()
      if (!renderResult) return;
      const request = new UnifiedRequestBuilder()
        .model(DEFAULT_MODEL)
        .system(renderResult.prompt)
        .user(trimmed)
        .build()

      const taskId = `session-${Date.now()}`
      this.historyService.startTaskExecution(taskId)

      const historyService = this.historyService

      const response = await this.llmService.chatWithTools(
        request,
        renderResult.tools,
        {
          maxIterations: MAX_ITERATIONS,
          onIterationStart: async (iteration: number) => {
            historyService.startIteration(iteration)
          },
          onLLMRequest: async (req: any) => {
            historyService.recordLLMRequest(req)
          },
          onLLMResponse: async (res: any, duration: number) => {
            historyService.recordLLMResponse(res, duration)
          },
          onToolBefore: async (toolUse) => {
            historyService.recordToolCall(toolUse)
          },
          async onToolAfter(_params, _result) {
            console.log(`调用工具: ${_params.name} 参数： ${JSON.stringify(_params)}`)
            historyService.recordToolResult(_result, _result.duration || 0)
          },
          onIterationEnd: async () => {
            historyService.finishIteration()
          },
          refreshPrompt: async () => {
            return this.renderer.refresh()
          }
        }
      )

      await this.historyService.finishTaskExecution(taskId)

      const contents = response.content.map(item => {
        if (isUnifiedThinkingContent(item)) {
          return `<thinking>${item.thinking}</thinking>`
        }
        if (isUnifiedTextContent(item)) {
          return item.text
        }
        return ``
      })
      console.log([...contents].join('\n\n'))
    } catch (error: any) {
      console.error(`\n错误: ${error.message}\n`)
    }
  }
}
