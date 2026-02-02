import { createInjector, Inject, Injectable, InjectionToken, Injector, Provider } from '@sker/core'
import { UnifiedTool } from '@sker/compiler'
import React from 'react';
import { renderToMarkdown } from '../reconciler/renderer';
import { extractTools } from '../reconciler/extractor';
import { createElement } from '../reconciler/dom';
import { reconciler } from '../reconciler/host-config';

export interface Route<T = any> {
  path: string;
  component: React.FunctionComponent<T & { injector: Injector }>;
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
export const TOOLS = new InjectionToken<RouteTool[]>(`TOOLS`);
export interface RouteTool {
  name: string;
  handler: (params?: any) => Promise<any>;
  description?: string;
  parameters?: any;
}
@Injectable()
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
      { provide: CURRENT_ROUTE, useFactory: (parsedUrl: URL, pageInjector: Injector) => matchRoute(parsedUrl.pathname, pageInjector), deps: [CURRENT_URL, Injector] },
      { provide: CURRENT_PAGE, useClass: Page },
      ...providers
    ], this.parent)

    return pageInjector.get(CURRENT_PAGE);
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

  if (patternParts.length !== pathParts.length) {
    return null;
  }

  const params: Record<string, string> = {};

  for (let i = 0; i < patternParts.length; i++) {
    const patternPart = patternParts[i];
    const pathPart = pathParts[i];

    if (patternPart.startsWith(':')) {
      params[patternPart.slice(1)] = pathPart;
    } else if (patternPart !== pathPart) {
      return null;
    }
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
  executors: Map<string, () => void | Promise<void>>;
}

export interface ToolCall {
  name: string;
  params?: any;
}

@Injectable({ providedIn: 'auto' })
export class Page {
  constructor(@Inject(Injector) private parent: Injector) { }
  render(providers: Provider[] = []): RenderResult {
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

    const element = React.createElement(component, { injector });
    const container = createElement('root', {}, []);
    const root = reconciler.createContainer(container, 0, null, false, null, '', () => {}, null);

    reconciler.updateContainer(element, root, null, () => {});

    const vnode = container.children[0] || container;
    const prompt = renderToMarkdown(vnode);
    const { tools, executors } = extractTools(vnode);

    return { prompt, tools, executors };
  }
  async execute(toolName: string, params?: any): Promise<any> {
    if (!toolName) {
      throw new Error('Tool name is required');
    }
    const tools = this.parent.get(TOOLS, []);
    const tool = tools?.find(t => t.name === toolName);
    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`);
    }

    return await tool.handler(params);
  }
  async executes(calls: ToolCall[]): Promise<any[]> {
    const results: any[] = [];
    for (const call of calls) {
      const result = await this.execute(call.name, call.params);
      results.push(result);
    }
    return results;
  }
  navigate(url: string): Page {
    const browser = this.parent.get(Browser);
    return browser.open(url)
  }
  get url(): PromptURL {
    return this.parent.get(CURRENT_URL);
  }
}
