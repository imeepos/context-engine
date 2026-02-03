import { Module } from '@sker/core';
import { createBrowser, Browser, ROUTES } from '@sker/prompt-renderer';
import { HomePage, GitDocsPage } from '../www/pages';

@Module({
  providers: [
    {
      provide: Browser, useFactory: () => createBrowser([
        {
          provide: ROUTES,
          useValue: [
            { path: '/', component: HomePage, params: {} },
            { path: '/docs/api', component: GitDocsPage, params: {} }
          ]
        }
      ])
    }
  ],
  exports: [Browser, ROUTES]
})
export class PageModule { }
