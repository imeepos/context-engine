import { describe, it, expect } from 'vitest';
import { createBrowser, ROUTES } from './browser';
import React from 'react';

describe('Page.render() with async rendering', () => {
  it('should render React component to markdown', async () => {
    const TestComponent = () => {
      return React.createElement('div', {}, [
        React.createElement('h1', {}, 'Test Title'),
        React.createElement('p', {}, 'Test content')
      ]);
    };

    const browser = createBrowser([
      {
        provide: ROUTES,
        useValue: [
          { path: '/test', component: TestComponent, params: {} }
        ]
      }
    ]);

    const page = browser.open('prompt:///test');
    const result = await page.render();

    expect(result.prompt).toContain('# Test Title');
    expect(result.prompt).toContain('Test content');
    expect(result.prompt).not.toBe('[object Object]');
  });

  it('should handle nested React components', async () => {
    const TestComponent = () => {
      return React.createElement('div', {}, [
        React.createElement('ul', {}, [
          React.createElement('li', {}, 'Item 1'),
          React.createElement('li', {}, 'Item 2')
        ])
      ]);
    };

    const browser = createBrowser([
      {
        provide: ROUTES,
        useValue: [
          { path: '/list', component: TestComponent, params: {} }
        ]
      }
    ]);

    const page = browser.open('prompt:///list');
    const result = await page.render();

    expect(result.prompt).toContain('- Item 1');
    expect(result.prompt).toContain('- Item 2');
  });

  it('should render async component with data fetching', async () => {
    const AsyncComponent = async ({ injector: _injector }: any) => {
      // 模拟异步数据获取
      await new Promise(resolve => setTimeout(resolve, 10));
      const data = 'Async Data';
      return React.createElement('div', {}, [
        React.createElement('h1', {}, 'Async Title'),
        React.createElement('p', {}, data)
      ]);
    };

    const browser = createBrowser([
      {
        provide: ROUTES,
        useValue: [
          { path: '/async', component: AsyncComponent, params: {} }
        ]
      }
    ]);

    const page = browser.open('prompt:///async');
    const result = await page.render();

    expect(result.prompt).toContain('# Async Title');
    expect(result.prompt).toContain('Async Data');
  });
});


