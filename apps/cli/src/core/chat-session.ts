import * as readline from 'readline'
import { Injector } from '@sker/core'
import { LLMService } from '@sker/compiler'
import { InputHandler } from '../handlers/input-handler'
import { UIRenderer } from '@sker/prompt-renderer'
import { TaskRecoveryService } from '../services/task-recovery.service'

export interface ChatSessionConfig {
  llmInjector: Injector
}

export class ChatSession {
  private llmService: LLMService
  private renderer: UIRenderer
  private inputHandler: InputHandler
  private taskRecoveryService: TaskRecoveryService | null
  private rl: readline.Interface | null = null

  constructor(config: ChatSessionConfig) {
    this.llmService = config.llmInjector.get(LLMService)
    this.renderer = config.llmInjector.get(UIRenderer)
    this.inputHandler = new InputHandler(this.llmService, this.renderer)
    try {
      this.taskRecoveryService = config.llmInjector.get(TaskRecoveryService)
    } catch {
      this.taskRecoveryService = null
    }
  }

  async start(): Promise<void> {
    this.taskRecoveryService?.start()

    const result = await this.renderer.render()
    console.log(result.prompt + '\n\n')

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
      this.taskRecoveryService?.stop()
      process.exit(0)
    })
  }
}
