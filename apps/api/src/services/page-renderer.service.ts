import { Injectable } from '@sker/core';
import { renderToHtml, HtmlRenderOptions } from '../utils/render-html';
import { renderComponent } from '../utils/render-component';
import React from 'react';

export type RenderFormat = 'html' | 'markdown';

@Injectable()
export class PageRendererService {
  renderPage(
    component: React.ComponentType<any>,
    props: any = {},
    format: RenderFormat = 'html',
    options?: HtmlRenderOptions
  ): string {
    const element = React.createElement(component, props);

    if (format === 'markdown') {
      return renderComponent(component, props);
    }

    return renderToHtml(element, options);
  }

  detectFormat(acceptHeader?: string): RenderFormat {
    if (!acceptHeader) return 'html';

    if (acceptHeader.includes('text/markdown')) return 'markdown';
    if (acceptHeader.includes('text/html')) return 'html';

    return 'html';
  }
}
