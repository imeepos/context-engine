import { Injectable, Inject, InjectionToken, Provider } from '@sker/core';
import { createBrowser, Browser, ROUTES, Route } from '@sker/prompt-renderer';
import React from 'react';

export const PROMPT_ROUTES = new InjectionToken<Route[]>('PROMPT_ROUTES');

@Injectable()
export class PromptRendererService {
  private browser: Browser;

  constructor(@Inject(PROMPT_ROUTES) routes: Route[]) {
    this.browser = createBrowser([
      { provide: ROUTES, useValue: routes }
    ]);
  }

  render(path: string): string {
    const url = `prompt://${path}`;
    const page = this.browser.open(url);
    const result = page.render();
    return result.prompt;
  }
}
