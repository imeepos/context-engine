import type { Browser, RenderResult } from './browser'
import { Inject, Injectable, Injector, Optional, Provider } from '@sker/core'
import { BROWSER, RENDER_SNAPSHOT_HANDLER } from './tokens';
import type { RenderSnapshotHandler } from './tokens';
/** UI 渲染防抖延迟（毫秒） */
export const RENDER_DEBOUNCE_MS = 50

/** 最大历史记录数量 */
const MAX_HISTORY_SIZE = 50

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

    /** 历史记录栈 */
    private historyStack: string[] = ['prompt:///'];
    /** 当前历史索引 */
    private historyIndex: number = 0;

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

    /** 是否可以返回上一页 */
    canGoBack(): boolean {
        return this.historyIndex > 0
    }

    /** 是否可以前进到下一页 */
    canGoForward(): boolean {
        return this.historyIndex < this.historyStack.length - 1
    }

    /** 获取历史记录长度 */
    getHistoryLength(): number {
        return this.historyStack.length
    }

    /** 返回上一页 */
    async goBack(providers: Provider[] = []): Promise<RenderResult> {
        if (!this.canGoBack()) {
            throw new Error('Cannot go back: already at the first page')
        }
        this.historyIndex--
        const url = this.historyStack[this.historyIndex]!
        console.log(`goBack: from ${this.currentUrl} to ${url}`)
        this.currentUrl = url
        this.providers = providers
        this.currentPage = this.browser.open(this.currentUrl, this.providers)
        this.renderResult = await this.currentPage?.render(this.providers) || null
        return this.renderResult
    }

    /** 前进到下一页 */
    async goForward(providers: Provider[] = []): Promise<RenderResult> {
        if (!this.canGoForward()) {
            throw new Error('Cannot go forward: already at the latest page')
        }
        this.historyIndex++
        const url = this.historyStack[this.historyIndex]!
        console.log(`goForward: from ${this.currentUrl} to ${url}`)
        this.currentUrl = url
        this.providers = providers
        this.currentPage = this.browser.open(this.currentUrl, this.providers)
        this.renderResult = await this.currentPage?.render(this.providers) || null
        return this.renderResult
    }

    /** 将 URL 添加到历史记录 */
    private pushHistory(url: string): void {
        // 如果当前不在历史栈末尾，清除当前位置之后的所有历史
        if (this.historyIndex < this.historyStack.length - 1) {
            this.historyStack = this.historyStack.slice(0, this.historyIndex + 1)
        }

        // 添加新 URL 到历史栈
        this.historyStack.push(url)
        this.historyIndex = this.historyStack.length - 1

        // 限制历史记录大小
        if (this.historyStack.length > MAX_HISTORY_SIZE) {
            const removeCount = this.historyStack.length - MAX_HISTORY_SIZE
            this.historyStack = this.historyStack.slice(removeCount)
            this.historyIndex = Math.max(0, this.historyIndex - removeCount)
        }
    }

    async render(url?: string, providers: Provider[] = []): Promise<RenderResult> {
        url = url || this.currentUrl;
        // 支持相对路径：如果 URL 以 / 开头但不是 prompt://，则自动添加 prompt:// 前缀
        const normalizedUrl = url.startsWith('/') && !url.startsWith('prompt://')
            ? `prompt://${url}`
            : url;
        console.log(`navigate: from ${this.currentUrl} to ${normalizedUrl}`)
        this.currentUrl = normalizedUrl;
        this.pushHistory(normalizedUrl);
        this.providers = providers;
        this.currentPage = this.browser.open(this.currentUrl, this.providers);
        this.renderResult = await this.currentPage?.render(providers) || null;
        this.saveSnapshotAsync();
        return this.renderResult;
    }

    async navigate(url: string, providers: Provider[] = []): Promise<RenderResult> {
        // 支持相对路径：如果 URL 以 / 开头但不是 prompt://，则自动添加 prompt:// 前缀
        const normalizedUrl = url.startsWith('/') && !url.startsWith('prompt://')
            ? `prompt://${url}`
            : url;
        console.log(`navigate: from ${this.currentUrl} to ${normalizedUrl}`)
        this.currentUrl = normalizedUrl;
        this.pushHistory(normalizedUrl);
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
