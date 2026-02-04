import * as readline from 'readline'
import { Injector } from '@sker/core'
import { LLMService } from '@sker/compiler'
import { AgentRegistryService } from '../services/agent-registry.service'
import { MessageBrokerService } from '../services/message-broker.service'
import { StateManager } from '../ui/state-manager'
import { UIRenderer } from '../ui/renderer'
import { InputHandler } from '../handlers/input-handler'
import { createRouter } from '../router'

export interface ChatSessionConfig {
  llmInjector: Injector
  agentRegistry: AgentRegistryService
  messageBroker: MessageBrokerService
  stateManager: StateManager
}

export class ChatSession {
  private llmService: LLMService
  private agentRegistry: AgentRegistryService
  private messageBroker: MessageBrokerService
  private renderer: UIRenderer
  private inputHandler: InputHandler
  private rl: readline.Interface | null = null

  constructor(config: ChatSessionConfig) {
    this.llmService = config.llmInjector.get(LLMService)
    this.agentRegistry = config.agentRegistry
    this.messageBroker = config.messageBroker

    const browser = createRouter(config.llmInjector)
    this.renderer = new UIRenderer(browser)
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
      await this.agentRegistry.unregister()
      console.log('\nGoodbye!')
      process.exit(0)
    })
  }
}
