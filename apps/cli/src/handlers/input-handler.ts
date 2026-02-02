import { LLMService, UnifiedRequestBuilder } from '@sker/compiler'
import { StateManager } from '../ui/state-manager'
import { UIRenderer } from '../ui/renderer'
import { DEFAULT_MODEL, MAX_ITERATIONS } from '../config/constants'

export class InputHandler {
  private llmService: LLMService
  private stateManager: StateManager
  private renderer: UIRenderer

  constructor(llmService: LLMService, stateManager: StateManager, renderer: UIRenderer) {
    this.llmService = llmService
    this.stateManager = stateManager
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
          onAfterToolExecution: async () => {
            await this.stateManager.updateState({})
            return this.renderer.getRenderResult().prompt
          }
        }
      )
    } catch (error: any) {
      console.error(`\n错误: ${error.message}\n`)
    }
  }
}
