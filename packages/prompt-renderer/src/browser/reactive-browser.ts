import { Inject, Injectable, Injector, createInjector } from '@sker/core';
import { Browser, CURRENT_URL, CURRENT_ROUTE, CURRENT_PAGE } from './browser';
import { ReactivePage } from './reactive-page';
import React from 'react';

function parsePromptURL(url: string): any {
  const urlObj = new URL(url);
  return {
    href: url,
    pathname: urlObj.pathname,
    searchParams: urlObj.searchParams,
    hash: urlObj.hash
  };
}

@Injectable()
export class ReactiveBrowser extends Browser {
  constructor(@Inject(Injector) parent: Injector) {
    super(parent);
  }

  createReactivePage(route: string, component: React.FunctionComponent): ReactivePage {
    if (!route || typeof route !== 'string') {
      throw new Error('Invalid route format');
    }

    const url = `prompt://${route}`;
    const pageInjector = createInjector([
      { provide: CURRENT_URL, useFactory: () => parsePromptURL(url) },
      { provide: CURRENT_ROUTE, useValue: {
        route: { path: route, component, params: {} },
        params: {}
      }},
      { provide: CURRENT_PAGE, useClass: ReactivePage },
    ], (this as any).parent);

    return pageInjector.get(CURRENT_PAGE) as ReactivePage;
  }
}
