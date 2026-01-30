import { Route, RouteTool, BrowserContext } from './browser';

export interface PageOptions {
  url: PromptURL;
  route: Route;
  params: Record<string, string>;
  context: BrowserContext;
}

export interface PromptURL {
  href: string;
  pathname: string;
  searchParams: URLSearchParams;
  hash: string;
}

export interface RenderResult {
  prompt: string;
  tools: Tool[];
}

export interface Tool {
  name: string;
  description?: string;
  parameters?: any;
}

export interface ToolCall {
  name: string;
  params?: any;
}

export interface Page {
  render(ctx?: any): RenderResult;
  execute(toolName: string, params?: any): Promise<any>;
  executes(calls: ToolCall[]): Promise<any[]>;
  subscribe(callback: (url: PromptURL) => void): () => void;
  navigate(url: string): void;
  setContext(context: BrowserContext): void;
  url: PromptURL;
  context: BrowserContext;
}

export function createPage(options: PageOptions): Page {
  let currentUrl = options.url;
  let pageContext = options.context;
  const subscribers: Array<(url: PromptURL) => void> = [];

  return {
    get url(): PromptURL {
      return {
        href: currentUrl.href,
        pathname: currentUrl.pathname,
        searchParams: new URLSearchParams(currentUrl.searchParams),
        hash: currentUrl.hash
      };
    },

    get context(): BrowserContext {
      return pageContext;
    },

    render(ctx?: any): RenderResult {
      const component = options.route.component;
      const props = {
        params: options.params,
        searchParams: currentUrl.searchParams,
        ...ctx
      };

      let result = component(props);

      if (result === null || result === undefined) {
        result = '';
      }

      const prompt = String(result);
      const tools = (options.route.tools || []).map(tool => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }));

      return { prompt, tools };
    },

    async execute(toolName: string, params?: any): Promise<any> {
      if (!toolName) {
        throw new Error('Tool name is required');
      }

      const tool = options.route.tools?.find(t => t.name === toolName);
      if (!tool) {
        throw new Error(`Tool not found: ${toolName}`);
      }

      return await tool.handler(params);
    },

    async executes(calls: ToolCall[]): Promise<any[]> {
      const results: any[] = [];
      for (const call of calls) {
        const result = await this.execute(call.name, call.params);
        results.push(result);
      }
      return results;
    },

    subscribe(callback: (url: PromptURL) => void): () => void {
      subscribers.push(callback);
      return () => {
        const index = subscribers.indexOf(callback);
        if (index > -1) {
          subscribers.splice(index, 1);
        }
      };
    },

    navigate(url: string): void {
      const urlObj = new URL(url);
      currentUrl = {
        href: url,
        pathname: urlObj.pathname,
        searchParams: urlObj.searchParams,
        hash: urlObj.hash
      };

      const urlSnapshot = this.url;
      subscribers.forEach(callback => {
        try {
          callback(urlSnapshot);
        } catch (error) {
          // Silently handle callback errors
        }
      });
    },

    setContext(context: BrowserContext): void {
      pageContext = { ...pageContext, ...context };
    }
  };
}
