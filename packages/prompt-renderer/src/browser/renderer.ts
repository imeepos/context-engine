import { Page } from './browser'
import type { Browser, RenderResult } from './browser'
import { Inject, Injectable, Provider } from '@sker/core'
import { BROWSER } from './tokens';
/** UI 渲染防抖延迟（毫秒） */
export const RENDER_DEBOUNCE_MS = 50

@Injectable()
export class UIRenderer {
    private browser: Browser;
    private currentPage: Page | null = null;
    private renderResult: RenderResult | null = null
    private renderTimer: any | null = null
    currentUrl: string = `prompt:///`;
    providers: Provider[] = [];
    version: number = new Date().getTime();
    constructor(
        @Inject(BROWSER) browser: Browser,
    ) {
        this.browser = browser
    }

    async render(url?: string, providers: Provider[] = []): Promise<RenderResult> {
        console.log(`navigate: from ${this.currentUrl} to ${url}`)
        url = url || this.currentUrl;
        this.currentUrl = url;
        this.providers = providers;
        this.currentPage = this.browser.open(this.currentUrl, this.providers);
        this.renderResult = await this.currentPage?.render(providers) || null;
        return this.renderResult;
    }


    async navigate(url: string, providers: Provider[] = []): Promise<RenderResult> {
        console.log(`navigate: from ${this.currentUrl} to ${url}`)
        this.currentUrl = url;
        this.providers = providers;
        this.currentPage = this.browser.open(this.currentUrl, this.providers);
        this.renderResult = await this.currentPage?.render(this.providers) || null;
        return this.renderResult;
    }

    async refresh() {
        console.log(`refresh current url ${this.currentUrl}`)
        this.currentPage = this.browser.open(this.currentUrl, this.providers);
        this.renderResult = await this.currentPage?.render(this.providers) || null;
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
