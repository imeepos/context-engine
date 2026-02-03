import { Injectable, Inject } from '@sker/core';
import { renderToHtml, HtmlRenderOptions } from '../utils/render-html';
import { Browser, ROUTES } from '@sker/prompt-renderer';
import React from 'react';

export type RenderFormat = 'html' | 'markdown';

@Injectable()
export class PageRendererService {
  constructor(@Inject(Browser) private browser: Browser) { }

  renderPage(
    uri: string
  ) {
    const page = this.browser.open(uri, []);
    const result = page.render();
    return result;
  }
}
