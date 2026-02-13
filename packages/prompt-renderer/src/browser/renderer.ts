import type { Browser, RenderResult } from './browser'
import { Inject, Injectable, Injector, Optional, Provider } from '@sker/core'
import { BROWSER, RENDER_SNAPSHOT_HANDLER } from './tokens';
import type { RenderSnapshotHandler } from './tokens';
/** UI 渲染防抖延迟（毫秒） */
export const RENDER_DEBOUNCE_MS = 50

@Injectable()
export class UIRenderer {
    private browser: Browser;
    private currentPage: import('./browser').Page | null = null;
    private renderResult: RenderResult | null = null
    private renderTimer: any | null = null
    private snapshotHandler: RenderSnapshotHandler | null = null;
    currentUrl: string = `prompt:///`;
    providers: Provider[] = [];
    version: number = new Date().getTime();
    constructor(
        @Inject(BROWSER) browser: Browser,
        @Inject(Injector) private injector: Injector,
    ) {
        this.browser = browser
        try {
            this.snapshotHandler = this.injector.get(RENDER_SNAPSHOT_HANDLER, null)
        } catch {
            this.snapshotHandler = null
        }
    }

    async render(url?: string, providers: Provider[] = []): Promise<RenderResult> {
        console.log(`navigate: from ${this.currentUrl} to ${url}`)
        url = url || this.currentUrl;
        this.currentUrl = url;
        this.providers = providers;
        this.currentPage = this.browser.open(this.currentUrl, this.providers);
        this.renderResult = await this.currentPage?.render(providers) || null;
        this.saveSnapshotAsync();
        return this.renderResult;
    }

    async navigate(url: string, providers: Provider[] = []): Promise<RenderResult> {
        console.log(`navigate: from ${this.currentUrl} to ${url}`)
        this.currentUrl = url;
        this.providers = providers;
        this.currentPage = this.browser.open(this.currentUrl, this.providers);
        this.renderResult = await this.currentPage?.render(this.providers) || null;
        this.saveSnapshotAsync();
        return this.renderResult;
    }

    async refresh() {
        this.currentPage = this.browser.open(this.currentUrl, this.providers);
        this.renderResult = await this.currentPage?.render(this.providers) || null;
        this.saveSnapshotAsync();
        return this.renderResult;
    }

    private saveSnapshotAsync(): void {
        if (this.snapshotHandler && this.renderResult?.prompt) {
            this.snapshotHandler.saveSnapshot(this.currentUrl, this.renderResult.prompt)
        }
    }

    debouncedRender(): void {
        if (this.renderTimer) clearTimeout(this.renderTimer)
        this.renderTimer = setTimeout(() => this.render(), RENDER_DEBOUNCE_MS)
    }

    getRenderResult(): RenderResult {
        return this.renderResult!
    }
}
