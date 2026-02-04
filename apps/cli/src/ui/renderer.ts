import { NavigateTool } from '../tools/NavigateTool'
import { StateManager } from './state-manager'
import { AGENTS, CURRENT_AGENT_ID, MESSAGES, MESSAGE_SUBSCRIBER, NAVIGATE } from '../tokens'
import { RENDER_DEBOUNCE_MS } from '../config/constants'
import { Page } from '@sker/prompt-renderer'
import { Browser, RenderResult } from '@sker/prompt-renderer/dist/browser/browser'
import { Provider } from '@sker/core'

export class UIRenderer {
  private browser: Browser;
  private currentPage: Page | null = null;
  private renderResult: RenderResult | null = null
  private renderTimer: NodeJS.Timeout | null = null
  private stateManager: StateManager

  constructor(
    browser: Browser,
    stateManager: StateManager
  ) {
    this.browser = browser
    this.stateManager = stateManager
  }

  private getStateProviders() {
    const state = this.stateManager.getState()
    return [
      { provide: AGENTS, useValue: state.agents },
      { provide: CURRENT_AGENT_ID, useValue: state.currentAgentId },
      { provide: MESSAGES, useValue: state.messages },
      {
        provide: MESSAGE_SUBSCRIBER, useValue: (callback: (messages: any[]) => void) => {
          return this.stateManager.subscribe((state) => callback(state.messages))
        }
      },
      {
        provide: NAVIGATE, useValue: (url: string) => {
          NavigateTool.setCurrentUrl(url)
        }
      }
    ]
  }

  render(providers: Provider[] = []): void {
    this.currentPage = this.browser.open(NavigateTool.getCurrentUrl(), this.getStateProviders())
    this.renderResult = this.currentPage?.render(providers) || null;
    // 清屏并重新渲染
    console.log(this.renderResult?.prompt)
  }

  debouncedRender(): void {
    if (this.renderTimer) clearTimeout(this.renderTimer)
    this.renderTimer = setTimeout(() => this.render(), RENDER_DEBOUNCE_MS)
  }

  getRenderResult(): any {
    return this.renderResult
  }
}
