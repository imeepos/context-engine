import { Inject, Injectable, Injector, Provider, createInjector } from '@sker/core';
import { Page, RenderResult, CURRENT_ROUTE, COMPONENT } from './browser';
import { setCurrentFiber, resetCurrentFiber, getOrCreateFiberState, scheduler } from '../hooks/runtime';
import React from 'react';
import { renderToMarkdown } from '../reconciler/renderer';
import { extractTools } from '../reconciler/extractor';
import { directRenderAsync } from '../reconciler/direct-render-async';

@Injectable()
export class ReactivePage extends Page {
  private renderListeners = new Set<(result: RenderResult) => void>();
  private currentResult: RenderResult | null = null;
  private fiber: any = null;
  private keepAliveTimer: ReturnType<typeof setInterval> | null = null;

  constructor(@Inject(Injector) parent: Injector) {
    super(parent);
  }

  onRender(callback: (result: RenderResult) => void): () => void {
    this.renderListeners.add(callback);
    return () => {
      this.renderListeners.delete(callback);
    };
  }

  keepAlive(): void {
    if (!this.keepAliveTimer) {
      this.keepAliveTimer = setInterval(() => {
        // Keep event loop alive
      }, 1000);
    }
  }

  dispose(): void {
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
    scheduler.dispose();
  }

  async render(providers: Provider[] = []): Promise<RenderResult> {
    const currentRoute = (this as any).parent.get(CURRENT_ROUTE);
    if (!currentRoute) {
      throw new Error('No route matched');
    }

    const component = currentRoute.route.component;
    const injector = createInjector([
      { provide: COMPONENT, useValue: component },
      ...providers,
    ], (this as any).parent);

    this.fiber = { component, props: { injector } };
    getOrCreateFiberState(this.fiber, component, { injector });

    scheduler.subscribe(this.fiber, () => {
      void this.refresh();
    });

    return this.refresh();
  }

  async refresh(): Promise<RenderResult> {
    if (!this.fiber) {
      throw new Error('Page not initialized. Call render() first.');
    }

    const state = getOrCreateFiberState(
      this.fiber, this.fiber.component, this.fiber.props
    );

    setCurrentFiber(this.fiber);
    const element = React.createElement(state.component, state.props);
    const vnode = await directRenderAsync(element);
    resetCurrentFiber();

    if (!vnode) {
      const empty: RenderResult = { prompt: '', tools: [] };
      this.currentResult = empty;
      return empty;
    }

    const prompt = renderToMarkdown(vnode);
    const tools = extractTools(vnode);

    this.currentResult = { prompt, tools };

    for (const callback of this.renderListeners) {
      callback(this.currentResult);
    }

    return this.currentResult;
  }

  getCurrentPrompt(): string {
    return this.currentResult?.prompt || '';
  }

  getCurrentTools(): any[] {
    return this.currentResult?.tools || [];
  }
}
