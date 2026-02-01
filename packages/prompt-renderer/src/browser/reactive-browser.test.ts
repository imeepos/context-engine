import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { ReactiveBrowser } from './reactive-browser';
import { createInjector } from '@sker/core';

describe('ReactiveBrowser', () => {
  it('should create reactive page', () => {
    const injector = createInjector([]);
    const browser = new ReactiveBrowser(injector);

    const Component = () => React.createElement('text', {}, 'Hello');
    const page = browser.createReactivePage('/', Component);

    expect(page).toBeDefined();
    expect(page.onRender).toBeDefined();
    expect(page.refresh).toBeDefined();
  });

  it('should throw error for invalid route', () => {
    const injector = createInjector([]);
    const browser = new ReactiveBrowser(injector);

    const Component = () => React.createElement('text', {}, 'Hello');

    expect(() => browser.createReactivePage('', Component)).toThrow('Invalid route format');
  });
});
