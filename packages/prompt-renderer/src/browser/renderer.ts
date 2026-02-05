import { Page } from './browser'
import { Browser, RenderResult } from './browser'
import { Inject, Injectable, Provider } from '@sker/core'
import { BROWSER } from './tokens';
/** UI 渲染防抖延迟（毫秒） */
export const RENDER_DEBOUNCE_MS = 50

@Injectable({
    providedIn: 'auto'
})
export class UIRenderer {
    private browser: Browser;
    private currentPage: Page | null = null;
    private renderResult: RenderResult | null = null
    private renderTimer: any | null = null

    constructor(
        @Inject(BROWSER) browser: Browser,
    ) {
        this.browser = browser
    }

    async render(providers: Provider[] = []): Promise<RenderResult> {
        this.currentPage = this.browser.open(this.browser.getCurrentUrl());
        this.renderResult = await this.currentPage?.render(providers) || null;
        return this.renderResult;
    }

    debouncedRender(): void {
        if (this.renderTimer) clearTimeout(this.renderTimer)
        this.renderTimer = setTimeout(() => this.render(), RENDER_DEBOUNCE_MS)
    }

    getRenderResult(): RenderResult {
        return this.renderResult!
    }
}
