import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createBrowser, Browser, Page, BrowserContext, PromptURL, Tool, ToolCall } from './index';

describe('Page', () => {
  let page: Page;
  let mockBrowser: Browser;

  beforeEach(() => {
    mockBrowser = createBrowser({
      routes: [
        {
          path: '/dashboard',
          component: DashboardComponent,
          tools: [
            {
              name: 'getUserData',
              handler: async (params: any) => ({ userId: params.id, name: 'John' })
            },
            {
              name: 'updateSettings',
              handler: async (params: any) => ({ success: true })
            }
          ]
        }
      ]
    });

    page = mockBrowser.open('prompt://app/dashboard');
  });

  describe('page.render', () => {
    it('returns prompt and tools', () => {
      const result = page.render();

      expect(result).toHaveProperty('prompt');
      expect(result).toHaveProperty('tools');
      expect(typeof result.prompt).toBe('string');
      expect(Array.isArray(result.tools)).toBe(true);
    });

    it('renders with context', () => {
      const result = page.render({
        user: { id: 123, name: 'Alice' },
        theme: 'dark'
      });

      expect(result.prompt).toBeDefined();
      expect(result.tools).toBeDefined();
    });

    it('includes all route tools in result', () => {
      const result = page.render();

      expect(result.tools.length).toBeGreaterThan(0);
      expect(result.tools.some(t => t.name === 'getUserData')).toBe(true);
      expect(result.tools.some(t => t.name === 'updateSettings')).toBe(true);
    });

    it('returns empty tools array when no tools defined', () => {
      const simpleBrowser = createBrowser({
        routes: [{ path: '/simple', component: () => null }]
      });
      const simplePage = simpleBrowser.open('prompt://app/simple');

      const result = simplePage.render();

      expect(result.tools).toEqual([]);
    });

    it('handles render errors gracefully', () => {
      const errorBrowser = createBrowser({
        routes: [{
          path: '/error',
          component: () => { throw new Error('Render failed'); }
        }]
      });
      const errorPage = errorBrowser.open('prompt://app/error');

      expect(() => {
        errorPage.render();
      }).toThrow('Render failed');
    });

    it('passes URL params to component', () => {
      const paramBrowser = createBrowser({
        routes: [{
          path: '/users/:id',
          component: ({ params }: any) => params.id
        }]
      });
      const paramPage = paramBrowser.open('prompt://app/users/456');

      const result = paramPage.render();

      expect(result.prompt).toContain('456');
    });
  });

  describe('page.execute', () => {
    it('executes tool by name', async () => {
      const result = await page.execute('getUserData', { id: 123 });

      expect(result).toEqual({ userId: 123, name: 'John' });
    });

    it('executes tool without params', async () => {
      const result = await page.execute('updateSettings');

      expect(result).toEqual({ success: true });
    });

    it('throws error for unknown tool', async () => {
      await expect(
        page.execute('unknownTool', {})
      ).rejects.toThrow('Tool not found: unknownTool');
    });

    it('throws error for invalid tool name', async () => {
      await expect(
        page.execute('', {})
      ).rejects.toThrow();
    });

    it('handles tool execution errors', async () => {
      const errorBrowser = createBrowser({
        routes: [{
          path: '/error',
          component: () => null,
          tools: [{
            name: 'failingTool',
            handler: async () => { throw new Error('Tool failed'); }
          }]
        }]
      });
      const errorPage = errorBrowser.open('prompt://app/error');

      await expect(
        errorPage.execute('failingTool')
      ).rejects.toThrow('Tool failed');
    });

    it('passes params correctly to tool handler', async () => {
      const result = await page.execute('getUserData', {
        id: 999,
        includeDetails: true
      });

      expect(result.userId).toBe(999);
    });

    it('returns tool result asynchronously', async () => {
      const promise = page.execute('getUserData', { id: 123 });

      expect(promise).toBeInstanceOf(Promise);

      const result = await promise;
      expect(result).toBeDefined();
    });
  });

  describe('page.executes', () => {
    it('executes multiple tools in batch', async () => {
      const results = await page.executes([
        { name: 'getUserData', params: { id: 1 } },
        { name: 'updateSettings', params: { theme: 'dark' } }
      ]);

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({ userId: 1, name: 'John' });
      expect(results[1]).toEqual({ success: true });
    });

    it('executes tools in order', async () => {
      const executionOrder: string[] = [];

      const orderBrowser = createBrowser({
        routes: [{
          path: '/order',
          component: () => null,
          tools: [
            {
              name: 'first',
              handler: async () => { executionOrder.push('first'); return 1; }
            },
            {
              name: 'second',
              handler: async () => { executionOrder.push('second'); return 2; }
            },
            {
              name: 'third',
              handler: async () => { executionOrder.push('third'); return 3; }
            }
          ]
        }]
      });
      const orderPage = orderBrowser.open('prompt://app/order');

      await orderPage.executes([
        { name: 'first' },
        { name: 'second' },
        { name: 'third' }
      ]);

      expect(executionOrder).toEqual(['first', 'second', 'third']);
    });

    it('handles empty tool call array', async () => {
      const results = await page.executes([]);

      expect(results).toEqual([]);
    });

    it('throws error if any tool fails', async () => {
      const mixedBrowser = createBrowser({
        routes: [{
          path: '/mixed',
          component: () => null,
          tools: [
            { name: 'success', handler: async () => 'ok' },
            { name: 'failure', handler: async () => { throw new Error('Failed'); } }
          ]
        }]
      });
      const mixedPage = mixedBrowser.open('prompt://app/mixed');

      await expect(
        mixedPage.executes([
          { name: 'success' },
          { name: 'failure' }
        ])
      ).rejects.toThrow('Failed');
    });

    it('handles tools with different param types', async () => {
      const results = await page.executes([
        { name: 'getUserData', params: { id: 1 } },
        { name: 'updateSettings', params: null },
        { name: 'getUserData', params: { id: 2 } }
      ]);

      expect(results).toHaveLength(3);
    });

    it('returns results in same order as calls', async () => {
      const results = await page.executes([
        { name: 'getUserData', params: { id: 100 } },
        { name: 'getUserData', params: { id: 200 } },
        { name: 'getUserData', params: { id: 300 } }
      ]);

      expect(results[0].userId).toBe(100);
      expect(results[1].userId).toBe(200);
      expect(results[2].userId).toBe(300);
    });
  });

  describe('page.subscribe', () => {
    it('returns unsubscribe function', () => {
      const callback = vi.fn();
      const unsubscribe = page.subscribe(callback);

      expect(typeof unsubscribe).toBe('function');
    });

    it('calls callback on URL change', () => {
      const callback = vi.fn();
      page.subscribe(callback);

      page.navigate('prompt://app/dashboard?tab=settings');

      expect(callback).toHaveBeenCalled();
      expect(callback).toHaveBeenCalledWith(expect.objectContaining({
        pathname: '/dashboard'
      }));
    });

    it('does not call callback after unsubscribe', () => {
      const callback = vi.fn();
      const unsubscribe = page.subscribe(callback);

      unsubscribe();
      page.navigate('prompt://app/dashboard?tab=profile');

      expect(callback).not.toHaveBeenCalled();
    });

    it('supports multiple subscribers', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      page.subscribe(callback1);
      page.subscribe(callback2);

      page.navigate('prompt://app/dashboard?tab=settings');

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    it('passes new URL to callback', () => {
      const callback = vi.fn();
      page.subscribe(callback);

      page.navigate('prompt://app/dashboard?tab=settings#section');

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          pathname: '/dashboard',
          hash: '#section'
        })
      );
    });

    it('handles callback errors gracefully', () => {
      const errorCallback = vi.fn(() => { throw new Error('Callback error'); });
      const normalCallback = vi.fn();

      page.subscribe(errorCallback);
      page.subscribe(normalCallback);

      expect(() => {
        page.navigate('prompt://app/dashboard?tab=settings');
      }).not.toThrow();

      expect(normalCallback).toHaveBeenCalled();
    });
  });

  describe('page.url', () => {
    it('returns current PromptURL', () => {
      expect(page.url).toBeDefined();
      expect(page.url.pathname).toBe('/dashboard');
    });

    it('includes search params', () => {
      const pageWithParams = mockBrowser.open('prompt://app/dashboard?foo=bar&baz=qux');

      expect(pageWithParams.url.searchParams.get('foo')).toBe('bar');
      expect(pageWithParams.url.searchParams.get('baz')).toBe('qux');
    });

    it('includes hash fragment', () => {
      const pageWithHash = mockBrowser.open('prompt://app/dashboard#section');

      expect(pageWithHash.url.hash).toBe('#section');
    });

    it('updates after navigation', () => {
      const initialUrl = page.url.href;

      page.navigate('prompt://app/dashboard?tab=settings');

      expect(page.url.href).not.toBe(initialUrl);
      expect(page.url.searchParams.get('tab')).toBe('settings');
    });

    it('is immutable', () => {
      const url1 = page.url;
      const url2 = page.url;

      expect(url1).not.toBe(url2); // Different object references
      expect(url1.href).toBe(url2.href); // Same values
    });
  });

  describe('context passing', () => {
    it('passes cookies to page', () => {
      const browserWithContext = createBrowser({
        routes: [{ path: '/home', component: () => null }],
        context: {
          cookies: { sessionId: 'abc123' }
        }
      });

      const contextPage = browserWithContext.open('prompt://app/home');

      expect(contextPage.context.cookies).toEqual({ sessionId: 'abc123' });
    });

    it('passes localStorage to page', () => {
      const browserWithContext = createBrowser({
        routes: [{ path: '/home', component: () => null }],
        context: {
          localStorage: { theme: 'dark', lang: 'en' }
        }
      });

      const contextPage = browserWithContext.open('prompt://app/home');

      expect(contextPage.context.localStorage).toEqual({ theme: 'dark', lang: 'en' });
    });

    it('allows updating page context', () => {
      page.setContext({
        cookies: { newToken: 'xyz789' }
      });

      expect(page.context.cookies).toEqual({ newToken: 'xyz789' });
    });
  });

  describe('edge cases', () => {
    it('handles page with no component', () => {
      const emptyBrowser = createBrowser({
        routes: [{ path: '/empty', component: null as any }]
      });

      expect(() => {
        emptyBrowser.open('prompt://app/empty');
      }).toThrow();
    });

    it('handles malformed URL', () => {
      expect(() => {
        mockBrowser.open('not a url at all');
      }).toThrow();
    });

    it('handles URL with special characters', () => {
      const specialBrowser = createBrowser({
        routes: [{ path: '/search', component: () => null }]
      });

      const specialPage = specialBrowser.open('prompt://app/search?q=hello%20world&filter=%3E100');

      expect(specialPage.url.searchParams.get('q')).toBe('hello world');
      expect(specialPage.url.searchParams.get('filter')).toBe('>100');
    });

    it('handles concurrent tool executions', async () => {
      const results = await Promise.all([
        page.execute('getUserData', { id: 1 }),
        page.execute('getUserData', { id: 2 }),
        page.execute('updateSettings', {})
      ]);

      expect(results).toHaveLength(3);
    });
  });
});

// Type definitions for tests
interface RenderContext {
  [key: string]: any;
}

interface RenderResult {
  prompt: string;
  tools: Tool[];
}

function DashboardComponent() {
  return null;
}
