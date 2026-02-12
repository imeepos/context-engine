import { renderToHtml } from
  '@sker/prompt-renderer';
import type { VNode } from
  '@sker/prompt-renderer';
import { wrapInHtmlPage } from './html-template';

interface UIRendererLike {
  navigate(
    url: string, providers?: any[]
  ): Promise<{
    prompt: string;
    tools: any[];
    vnode?: VNode;
  }>;
  render(
    url?: string, providers?: any[]
  ): Promise<{
    prompt: string;
    tools: any[];
    vnode?: VNode;
  }>;
  getRenderResult(): {
    prompt: string;
    tools: any[];
    vnode?: VNode;
  };
  currentUrl: string;
  providers: any[];
}

export class WebRenderer {
  constructor(
    private uiRenderer: UIRendererLike
  ) {}

  async renderPage(
    pathname: string
  ): Promise<string> {
    const url = `prompt://${pathname}`;
    const result = await this.uiRenderer.navigate(
      url,
      this.uiRenderer.providers
    );
    if (!result.vnode) {
      return wrapInHtmlPage(
        '<p>No content</p>'
      );
    }
    const bodyHtml = renderToHtml(result.vnode);
    return wrapInHtmlPage(bodyHtml);
  }

  renderCurrent(): string {
    const result =
      this.uiRenderer.getRenderResult();
    if (!result?.vnode) {
      return wrapInHtmlPage(
        '<p>No content</p>'
      );
    }
    const bodyHtml = renderToHtml(result.vnode);
    return wrapInHtmlPage(bodyHtml);
  }
}
