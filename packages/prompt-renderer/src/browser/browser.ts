import { createInjector, Inject, Injectable, InjectionToken, Injector, Provider } from '@sker/core'
import { UnifiedTool } from '@sker/compiler'
import React from 'react';
import { renderToMarkdown } from '../reconciler/renderer';
import { extractTools } from '../reconciler/extractor';
import { directRenderAsync } from '../reconciler/direct-render-async';

export interface Route<T = any> {
  path: string;
  component: React.FunctionComponent<T & { injector: Injector }> | ((props: T & { injector: Injector }) => Promise<React.ReactElement>);
  params: T;
}

export interface RouteMatch {
  route: Route;
  params: Record<string, string>;
}

export const ROUTES = new InjectionToken<Route[]>('ROUTES');
export const CURRENT_URL = new InjectionToken<URL>(`CURRENT_URL`);
export const CURRENT_ROUTE = new InjectionToken<RouteMatch>(`CURRENT_ROUTE`);
export const CURRENT_PAGE = new InjectionToken<Page>(`CURRENT_PAGE`);
export const COMPONENT = new InjectionToken<React.FunctionComponent>(`COMPONENT`);
export const INPUT = new InjectionToken<string>(`INPUT`);

@Injectable({
  providedIn: 'auto',
})
export class Browser {

  constructor(@Inject(Injector) private parent: Injector) { }

  open(url: string, providers: Provider[] = []): Page {
    if (!url || typeof url !== 'string') {
      throw new Error('Invalid URL format');
    }
    if (!url.startsWith('prompt://')) {
      throw new Error('Invalid URL format');
    }

    const pageInjector = createInjector([
      { provide: CURRENT_URL, useFactory: () => parsePromptURL(url) },
      {
        provide: CURRENT_ROUTE, useFactory: (parsedUrl: URL, pageInjector: Injector) => {
          return matchRoute(parsedUrl.pathname, pageInjector);
        }, deps: [CURRENT_URL, Injector]
      },
      ...providers
    ], this.parent)

    return pageInjector.get(Page);
  }
}

export function createBrowser(providers: Provider[], parent?: Injector): Browser {
  const browserInjector = createInjector([
    { provide: Browser, useClass: Browser },
    ...providers
  ], parent);
  return browserInjector.get(Browser)
}

function parsePromptURL(url: string): PromptURL {
  const urlObj = new URL(url);
  return {
    href: url,
    pathname: urlObj.pathname,
    searchParams: urlObj.searchParams,
    hash: urlObj.hash
  };
}

function matchRoute(pathname: string, injector: Injector): RouteMatch | null {
  const routes = injector.get(ROUTES, [])
  for (const route of routes) {
    const params = matchPath(pathname, route.path);
    if (params !== null) {
      return { route, params };
    }
  }
  return null;
}

function matchPath(pathname: string, pattern: string): Record<string, string> | null {
  const patternParts = pattern.split('/').filter(Boolean);
  const pathParts = pathname.split('/').filter(Boolean);

  // 检查是否有通配符
  const hasWildcard = patternParts[patternParts.length - 1] === '*';

  if (hasWildcard) {
    // 通配符模式：路径部分数量必须 >= 模式部分数量 - 1
    if (pathParts.length < patternParts.length - 1) {
      return null;
    }
  } else {
    // 精确模式：路径部分数量必须完全相等
    if (patternParts.length !== pathParts.length) {
      return null;
    }
  }

  const params: Record<string, string> = {};

  // 匹配非通配符部分
  const compareLength = hasWildcard ? patternParts.length - 1 : patternParts.length;

  for (let i = 0; i < compareLength; i++) {
    const patternPart = patternParts[i];
    const pathPart = pathParts[i];

    if (patternPart.startsWith(':')) {
      params[patternPart.slice(1)] = pathPart;
    } else if (patternPart !== pathPart) {
      return null;
    }
  }

  // 如果有通配符，将剩余路径部分作为 '*' 参数
  if (hasWildcard && pathParts.length > compareLength) {
    params['*'] = pathParts.slice(compareLength).join('/');
  } else if (hasWildcard) {
    params['*'] = '';
  }

  return params;
}


export interface PageOptions {
  url: PromptURL;
  route: Route;
  params: Record<string, string>;
  context: Injector;
}

export interface PromptURL {
  href: string;
  pathname: string;
  searchParams: URLSearchParams;
  hash: string;
}

export interface RenderResult {
  prompt: string;
  tools: UnifiedTool[];
}

export interface ToolCall {
  name: string;
  params?: any;
}

@Injectable({ providedIn: 'auto' })
export class Page {
  constructor(@Inject(Injector) private parent: Injector) { }
  async render(providers: Provider[] = []): Promise<RenderResult> {
    const currentRoute = this.parent.get(CURRENT_ROUTE);
    if (!currentRoute) {
      const url = this.parent.get(CURRENT_URL);
      const routes = this.parent.get(ROUTES, []);
      throw new Error(`No route matched for URL: ${url.pathname}. Available routes: ${routes.map(r => r.path).join(', ')}`);
    }
    const component = currentRoute.route.component;
    const injector = createInjector([
      { provide: COMPONENT, useValue: component },
      ...providers,
    ], this.parent);

    // 直接调用组件函数而不是使用 React.createElement
    // 这样可以支持异步组件
    const result = component({ injector, ...currentRoute.params });
    const element = result instanceof Promise ? await result : result;
    const vnode = await directRenderAsync(element);

    if (!vnode) {
      return { prompt: '', tools: [] };
    }

    const prompt = renderToMarkdown(vnode);
    const tools = extractTools(vnode);
    return { prompt, tools };
  }
  navigate(url: string): Page {
    const browser = this.parent.get(Browser);
    return browser.open(url)
  }
  get url(): PromptURL {
    return this.parent.get(CURRENT_URL);
  }
}
