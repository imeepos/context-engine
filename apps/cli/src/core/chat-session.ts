import * as readline from 'readline'
import { Injector } from '@sker/core'
import { LLMService } from '@sker/compiler'
import { InputHandler } from '../handlers/input-handler'
import { UIRenderer } from '@sker/prompt-renderer'
import { TaskRecoveryService } from '../services/task-recovery.service'
import { WebRenderer } from '../web/web-renderer'
import { SseManager } from '../web/sse'
import { WebServer } from '../web/server'

export interface ChatSessionConfig {
  llmInjector: Injector
  enableWebServer?: boolean
}

export class ChatSession {
  private llmService: LLMService
  private renderer: UIRenderer
  private inputHandler: InputHandler
  private taskRecoveryService: TaskRecoveryService | null
  private rl: readline.Interface | null = null
  private version: number = new Date().getTime();
  private llmInjector: Injector
  private webServer: WebServer | null = null
  private sseManager: SseManager | null = null

  private enableWebServer: boolean

  constructor(config: ChatSessionConfig) {
    this.llmInjector = config.llmInjector
    this.enableWebServer = config.enableWebServer ?? false
    this.llmService = config.llmInjector.get(LLMService)
    this.renderer = config.llmInjector.get(UIRenderer)
    console.log(`current chat session version: ${this.version}, current renderer version: ${this.renderer.version}`)
    this.inputHandler = new InputHandler(this.llmService, this.renderer, this.llmInjector)
    try {
      this.taskRecoveryService = config.llmInjector.get(TaskRecoveryService)
    } catch {
      this.taskRecoveryService = null
    }
  }

  async start(): Promise<void> {
    this.taskRecoveryService?.start()

    // 启动 Web 服务器（人类界面）
    if (this.enableWebServer) {
      this.sseManager = new SseManager()
      const webRenderer = new WebRenderer(
        this.renderer as any
      )
      const port = Number(
        process.env.WEB_PORT || 3000
      )
      this.webServer = new WebServer(
        webRenderer, this.sseManager, port
      )
      await this.webServer.start()
      console.log(
        `Web UI: http://localhost:${port}`
      )
    }

    const result = await this.renderer.render()
    console.log(result.prompt + '\n\n')

    // SSE 推送初始页面
    if (result.vnode && this.sseManager) {
      const { renderToHtml } =
        await import('@sker/prompt-renderer')
      const html = renderToHtml(result.vnode)
      this.sseManager.broadcast('update', html)
    }

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
