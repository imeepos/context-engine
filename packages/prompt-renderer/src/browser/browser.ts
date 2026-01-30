import { Page, createPage } from './page';

export interface BrowserOptions {
  routes: Route[];
  context?: BrowserContext;
}

export interface Route {
  path: string;
  component: any;
  tools?: RouteTool[];
}

export interface RouteTool {
  name: string;
  handler: (params?: any) => Promise<any>;
  description?: string;
  parameters?: any;
}

export interface BrowserContext {
  cookies?: Record<string, string>;
  localStorage?: Record<string, string>;
}

export interface Browser {
  open(url: string): Page;
  setContext(context: BrowserContext): void;
}

export function createBrowser(options: BrowserOptions): Browser {
  if (!Array.isArray(options.routes)) {
    throw new Error('Routes must be an array');
  }

  let browserContext = options.context || {};

  return {
    open(url: string): Page {
      if (!url || typeof url !== 'string') {
        throw new Error('Invalid URL format');
      }

      if (!url.startsWith('prompt://')) {
        throw new Error('Invalid URL format');
      }

      const parsedUrl = parsePromptURL(url);
      const matchedRoute = matchRoute(parsedUrl.pathname, options.routes);

      if (!matchedRoute) {
        throw new Error('Route not found');
      }

      if (!matchedRoute.route.component) {
        throw new Error('Route component is required');
      }

      return createPage({
        url: parsedUrl,
        route: matchedRoute.route,
        params: matchedRoute.params,
        context: browserContext
      });
    },

    setContext(context: BrowserContext): void {
      browserContext = { ...browserContext, ...context };
    }
  };
}

interface PromptURL {
  href: string;
  pathname: string;
  searchParams: URLSearchParams;
  hash: string;
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

function matchRoute(pathname: string, routes: Route[]): { route: Route; params: Record<string, string> } | null {
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
