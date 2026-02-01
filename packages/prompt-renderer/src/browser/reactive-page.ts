import { Inject, Injectable, Injector, Provider } from '@sker/core';
import { Page, RenderResult, CURRENT_ROUTE, COMPONENT } from './browser';
import { setCurrentFiber, resetCurrentFiber, getOrCreateFiberState, scheduler } from '../hooks/runtime';
import React from 'react';
import { renderToMarkdown } from '../reconciler/renderer';
import { extractTools } from '../reconciler/extractor';
import { createElement } from '../reconciler/dom';
import { reconciler } from '../reconciler/host-config';
import { createInjector } from '@sker/core';
import { interval, Subscription } from 'rxjs';

@Injectable()
export class ReactivePage extends Page {
  private renderListeners = new Set<(result: RenderResult) => void>();
  private currentResult: RenderResult | null = null;
  private fiber: any = null;
  private keepAliveSubscription: Subscription | null = null;

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
    if (!this.keepAliveSubscription) {
      this.keepAliveSubscription = interval(1000).subscribe(() => {
        // Keep event loop alive
      });
    }
  }

  dispose(): void {
    if (this.keepAliveSubscription) {
      this.keepAliveSubscription.unsubscribe();
      this.keepAliveSubscription = null;
    }
    scheduler.dispose();
  }

  render(providers: Provider[] = []): RenderResult {
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
      this.refresh();
    });

    return this.refresh();
  }

  refresh(): RenderResult {
    if (!this.fiber) {
      throw new Error('Page not initialized. Call render() first.');
    }

    const state = getOrCreateFiberState(this.fiber, this.fiber.component, this.fiber.props);

    const container = createElement('root', {}, []);
    const root = reconciler.createContainer(container, 0, null, false, null, '', () => {}, null);

    setCurrentFiber(this.fiber);
    const element = React.createElement(state.component, state.props);
    reconciler.updateContainer(element, root, null, () => {});
    resetCurrentFiber();

    const vnode = container.children[0] || container;
    const prompt = renderToMarkdown(vnode);
    const { tools, executors } = extractTools(vnode);

    this.currentResult = { prompt, tools, executors };

    this.renderListeners.forEach(callback => callback(this.currentResult!));

    return this.currentResult;
  }

  getCurrentPrompt(): string {
    return this.currentResult?.prompt || '';
  }

  getCurrentTools(): any[] {
    return this.currentResult?.tools || [];
  }
}
