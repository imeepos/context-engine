import { LLMService, UnifiedRequestBuilder } from '@sker/compiler'
import { UIRenderer } from '../ui/renderer'
import { DEFAULT_MODEL, MAX_ITERATIONS } from '../config/constants'

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

      await this.llmService.chatWithTools(
        request,
        renderResult.tools,
        {
          maxIterations: MAX_ITERATIONS,
          async onToolAfter(params, result) {
            // console.log({ params, result })
          },
          refreshPrompt: async () => {
            return this.renderer.getRenderResult()
          }
        }
      )
    } catch (error: any) {
      console.error(`\n错误: ${error.message}\n`)
    }
  }
}
