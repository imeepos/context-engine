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

  it('should throw when URL is invalid', () => {
    const browser = createBrowser([{ provide: ROUTES, useValue: [] }]);

    expect(() => browser.open('')).toThrow('Invalid URL format');
    expect(() => browser.open('http://not-supported')).toThrow('Invalid URL format');
  });

  it('should throw with available routes when no route matches', async () => {
    const browser = createBrowser([{
      provide: ROUTES,
      useValue: [{ path: '/exists', component: () => React.createElement('div', {}, 'ok'), params: {} }]
    }]);

    const page = browser.open('prompt:///missing');
    await expect(page.render()).rejects.toThrow(/No route matched.*\/exists/);
  });

  it('should support nested parameter routes', async () => {
    const UserPost = ({ userId, postId }: { userId: string, postId: string }) =>
      React.createElement('div', {}, [
        React.createElement('h2', {}, `User ${userId}`),
        React.createElement('p', {}, `Post ${postId}`)
      ]);

    const browser = createBrowser([{
      provide: ROUTES,
      useValue: [{ path: '/users/:userId/posts/:postId', component: UserPost as any, params: {} }]
    }]);

    const page = browser.open('prompt:///users/42/posts/7');
    const result = await page.render();

    expect(result.prompt).toContain('User 42');
    expect(result.prompt).toContain('Post 7');
  });

  it('should render async component that awaits nested async work', async () => {
    const AsyncChild = async () => {
      await new Promise(resolve => setTimeout(resolve, 5));
      return React.createElement('span', {}, 'child-ready');
    };

    const AsyncParent = async () => {
      const child = await AsyncChild();
      return React.createElement('div', {}, [
        React.createElement('p', {}, 'parent-ready'),
        child
      ]);
    };

    const browser = createBrowser([{
      provide: ROUTES,
      useValue: [{ path: '/nested-async', component: AsyncParent as any, params: {} }]
    }]);

    const page = browser.open('prompt:///nested-async');
    const result = await page.render();

    expect(result.prompt).toContain('parent-ready');
    expect(result.prompt).toContain('child-ready');
  });
});


