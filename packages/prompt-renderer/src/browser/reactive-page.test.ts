import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { ReactivePage } from './reactive-page';
import { createInjector } from '@sker/core';
import { CURRENT_ROUTE } from './browser';
import { useState } from '../hooks/useState';

describe('ReactivePage', () => {
  it('should render component', async () => {
    const Component = () => React.createElement('text', {}, 'Hello World');

    const injector = createInjector([
      { provide: CURRENT_ROUTE, useValue: {
        route: { path: '/', component: Component, params: {} },
        params: {}
      }}
    ]);

    const page = new ReactivePage(injector);
    const result = await page.render();

    expect(result.prompt).toContain('Hello World');
  });

  it('should call render listeners on state change', async () => {
    const Component = () => {
      const [count, setCount] = useState(0);

      (globalThis as any).__testSetCount = setCount;

      return React.createElement('text', {}, `Count: ${count}`);
    };

    const injector = createInjector([
      { provide: CURRENT_ROUTE, useValue: {
        route: { path: '/', component: Component, params: {} },
        params: {}
      }}
    ]);

    const page = new ReactivePage(injector);
    const listener = vi.fn();
    page.onRender(listener);

    await page.render();
    expect(listener).toHaveBeenCalledTimes(1);

    (globalThis as any).__testSetCount(1);

    await new Promise(resolve => setTimeout(resolve, 10));

    expect(listener).toHaveBeenCalledTimes(2);
    expect(page.getCurrentPrompt()).toContain('Count: 1');
  });

  it('should unsubscribe render listener', async () => {
    const Component = () => React.createElement('text', {}, 'Test');

    const injector = createInjector([
      { provide: CURRENT_ROUTE, useValue: {
        route: { path: '/', component: Component, params: {} },
        params: {}
      }}
    ]);

    const page = new ReactivePage(injector);
    const listener = vi.fn();
    const unsubscribe = page.onRender(listener);

    await page.render();
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    await page.refresh();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('should get current prompt and tools', async () => {
    const Component = () => React.createElement('text', {}, 'Test Content');

    const injector = createInjector([
      { provide: CURRENT_ROUTE, useValue: {
        route: { path: '/', component: Component, params: {} },
        params: {}
      }}
    ]);

    const page = new ReactivePage(injector);
    await page.render();

    expect(page.getCurrentPrompt()).toContain('Test Content');
    expect(page.getCurrentTools()).toEqual([]);
  });
});
