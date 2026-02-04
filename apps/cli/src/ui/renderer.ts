import { NavigateTool } from '../tools/NavigateTool'
import { NAVIGATE } from '../tokens'
import { RENDER_DEBOUNCE_MS } from '../config/constants'
import { Page } from '@sker/prompt-renderer'
import { Browser, RenderResult } from '@sker/prompt-renderer/dist/browser/browser'
import { Provider } from '@sker/core'

export class UIRenderer {
  private browser: Browser;
  private currentPage: Page | null = null;
  private renderResult: RenderResult | null = null
  private renderTimer: NodeJS.Timeout | null = null

  constructor(
    browser: Browser,
  ) {
    this.browser = browser
  }

  private getStateProviders() {
    return [
      {
        provide: NAVIGATE, useValue: (url: string) => {
          NavigateTool.setCurrentUrl(url)
        }
      }
    ]
  }

  async render(providers: Provider[] = []): Promise<void> {
    this.currentPage = this.browser.open(NavigateTool.getCurrentUrl(), this.getStateProviders())
    this.renderResult = await this.currentPage?.render(providers) || null;
    // 清屏并重新渲染
    console.log(this.renderResult?.prompt)
  }

  debouncedRender(): void {
    if (this.renderTimer) clearTimeout(this.renderTimer)
    this.renderTimer = setTimeout(() => this.render(), RENDER_DEBOUNCE_MS)
  }

  getRenderResult(): RenderResult {
    return this.renderResult!
  }
}
