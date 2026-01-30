import { describe, it, expect, beforeEach } from 'vitest';
import { createBrowser, Browser, BrowserContext, PromptURL, Tool, ToolCall } from './index';

describe('Browser', () => {
  describe('createBrowser', () => {
    it('creates browser with empty routes', () => {
      const browser = createBrowser({
        routes: []
      });

      expect(browser).toBeDefined();
      expect(browser.open).toBeInstanceOf(Function);
    });

    it('creates browser with route configuration', () => {
      const routes = [
        {
          path: '/home',
          component: () => null
        },
        {
          path: '/about',
          component: () => null
        }
      ];

      const browser = createBrowser({ routes });

      expect(browser).toBeDefined();
      expect(browser.open).toBeInstanceOf(Function);
    });

    it('creates browser with nested route configuration', () => {
      const routes = [
        {
          path: '/users/:id',
          component: () => null
        },
        {
          path: '/posts/:postId/comments/:commentId',
          component: () => null
        }
      ];

      const browser = createBrowser({ routes });

      expect(browser).toBeDefined();
    });

    it('throws error when routes is not an array', () => {
      expect(() => {
        createBrowser({ routes: null as any });
      }).toThrow();
    });
  });

  describe('browser.open', () => {
    let browser: Browser;

    beforeEach(() => {
      browser = createBrowser({
        routes: [
          {
            path: '/home',
            component: () => null
          },
          {
            path: '/users/:id',
            component: () => null
          }
        ]
      });
    });

    it('returns Page instance for valid URL', () => {
      const page = browser.open('prompt://app/home');

      expect(page).toBeDefined();
      expect(page.render).toBeInstanceOf(Function);
      expect(page.execute).toBeInstanceOf(Function);
      expect(page.executes).toBeInstanceOf(Function);
      expect(page.subscribe).toBeInstanceOf(Function);
    });

    it('returns Page instance for URL with params', () => {
      const page = browser.open('prompt://app/users/123');

      expect(page).toBeDefined();
      expect(page.url).toBeDefined();
    });

    it('throws error for invalid URL format', () => {
      expect(() => {
        browser.open('not-a-valid-url');
      }).toThrow('Invalid URL format');
    });

    it('throws error for unknown route', () => {
      expect(() => {
        browser.open('prompt://app/unknown-route');
      }).toThrow('Route not found');
    });

    it('throws error for empty URL', () => {
      expect(() => {
        browser.open('');
      }).toThrow();
    });

    it('handles URL with query parameters', () => {
      const page = browser.open('prompt://app/home?foo=bar&baz=qux');

      expect(page).toBeDefined();
      expect(page.url.searchParams.get('foo')).toBe('bar');
      expect(page.url.searchParams.get('baz')).toBe('qux');
    });

    it('handles URL with hash fragment', () => {
      const page = browser.open('prompt://app/home#section');

      expect(page).toBeDefined();
      expect(page.url.hash).toBe('#section');
    });
  });

  describe('browser context', () => {
    it('passes context to opened pages', () => {
      const browser = createBrowser({
        routes: [{ path: '/home', component: () => null }],
        context: {
          cookies: { sessionId: 'abc123' },
          localStorage: { theme: 'dark' }
        }
      });

      const page = browser.open('prompt://app/home');

      expect(page).toBeDefined();
    });

    it('allows updating browser context', () => {
      const browser = createBrowser({
        routes: [{ path: '/home', component: () => null }]
      });

      browser.setContext({
        cookies: { token: 'xyz789' }
      });

      const page = browser.open('prompt://app/home');

      expect(page).toBeDefined();
    });
  });
});

// Type definitions for tests
interface Page {
  render(ctx?: RenderContext): RenderResult;
  execute(toolName: string, params?: any): Promise<any>;
  executes(calls: ToolCall[]): Promise<any[]>;
  subscribe(callback: (url: PromptURL) => void): () => void;
  url: PromptURL;
}

interface RenderContext {
  [key: string]: any;
}

interface RenderResult {
  prompt: string;
  tools: Tool[];
}
