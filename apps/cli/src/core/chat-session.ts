import * as readline from 'readline'
import { Injector } from '@sker/core'
import { LLMService } from '@sker/compiler'
import { InputHandler } from '../handlers/input-handler'
import { UIRenderer } from '@sker/prompt-renderer'

export interface ChatSessionConfig {
  llmInjector: Injector
}

export class ChatSession {
  private llmService: LLMService
  private renderer: UIRenderer
  private inputHandler: InputHandler
  private rl: readline.Interface | null = null

  constructor(config: ChatSessionConfig) {
    this.llmService = config.llmInjector.get(LLMService)
    this.renderer = config.llmInjector.get(UIRenderer)
    this.inputHandler = new InputHandler(this.llmService, this.renderer)
  }

  async start(): Promise<void> {
    // 初始渲染
    await this.renderer.render()
    // 创建 readline 接口
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '> '
    })

    this.rl.prompt()

    this.rl.on('line', async (input: string) => {
      await this.inputHandler.handleInput(input)
      this.rl!.prompt()
    })

    this.rl.on('close', async () => {
      process.exit(0)
    })
  }
}
