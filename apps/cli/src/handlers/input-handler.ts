import { isUnifiedTextContent, isUnifiedThinkingContent, LLMService, UnifiedRequestBuilder } from '@sker/compiler'
import { DEFAULT_MODEL, MAX_ITERATIONS } from '../config/constants'
import { UIRenderer } from '@sker/prompt-renderer'

export class InputHandler {
  private llmService: LLMService
  private renderer: UIRenderer

  constructor(llmService: LLMService, renderer: UIRenderer) {
    this.llmService = llmService
    this.renderer = renderer
  }

  async handleInput(input: string): Promise<void> {
    const trimmed = input.trim()

    if (!trimmed) {
      return
    }

    try {
      const renderResult = this.renderer.getRenderResult()
      const request = new UnifiedRequestBuilder()
        .model(DEFAULT_MODEL)
        .system(renderResult.prompt)
        .user(trimmed)
        .build()

      const response = await this.llmService.chatWithTools(
        request,
        renderResult.tools,
        {
          maxIterations: MAX_ITERATIONS,
          async onToolAfter(_params, _result) {
            console.log(`调用工具: ${_params.name} 结果：${_result.content}`)
          },
          refreshPrompt: async () => {
            return this.renderer.getRenderResult()
          }
        }
      )
      const contents = response.content.map(item => {
        if (isUnifiedThinkingContent(item)) {
          return `<thinking>${item.thinking}</thinking>`
        }
        if (isUnifiedTextContent(item)) {
          return item.text
        }
        return ``
      })
      console.log(contents.join('\n'))
    } catch (error: any) {
      console.error(`\n错误: ${error.message}\n`)
    }
  }
}
