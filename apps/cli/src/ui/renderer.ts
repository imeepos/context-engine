import { Injector } from '@sker/core'
import { NavigateTool } from '../tools/NavigateTool'
import { DynamicToolExecutorService } from '../tools/DynamicToolExecutorService'
import { StateManager } from './state-manager'
import { AGENTS, CURRENT_AGENT_ID, MESSAGES, MESSAGE_SUBSCRIBER, NAVIGATE } from '../tokens'
import { RENDER_DEBOUNCE_MS } from '../config/constants'

export class UIRenderer {
  private browser: any
  private currentPage: any
  private renderResult: any = null
  private renderTimer: NodeJS.Timeout | null = null
  private dynamicToolExecutor: DynamicToolExecutorService
  private stateManager: StateManager

  constructor(
    browser: any,
    dynamicToolExecutor: DynamicToolExecutorService,
    stateManager: StateManager
  ) {
    this.browser = browser
    this.dynamicToolExecutor = dynamicToolExecutor
    this.stateManager = stateManager
  }

  private getStateProviders() {
    const state = this.stateManager.getState()
    return [
      { provide: AGENTS, useValue: state.agents },
      { provide: CURRENT_AGENT_ID, useValue: state.currentAgentId },
      { provide: MESSAGES, useValue: state.messages },
      { provide: MESSAGE_SUBSCRIBER, useValue: (callback: (messages: any[]) => void) => {
        return this.stateManager.subscribe((state) => callback(state.messages))
      }},
      { provide: NAVIGATE, useValue: (url: string) => {
        NavigateTool.setCurrentUrl(url)
      }}
    ]
  }

  render(): void {
    this.currentPage = this.browser.open(NavigateTool.getCurrentUrl(), this.getStateProviders())
    this.renderResult = this.currentPage.render()

    // 注册动态工具
    this.dynamicToolExecutor.clear()
    this.renderResult.executors.forEach((executor: () => void | Promise<void>, id: string) => {
      this.dynamicToolExecutor.register(id, executor)
    })

    // 清屏并重新渲染
    console.clear()
    console.log(this.renderResult.prompt)
  }

  debouncedRender(): void {
    if (this.renderTimer) clearTimeout(this.renderTimer)
    this.renderTimer = setTimeout(() => this.render(), RENDER_DEBOUNCE_MS)
  }

  getRenderResult(): any {
    return this.renderResult
  }
}
