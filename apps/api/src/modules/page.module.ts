import { Module } from '@sker/core';
import { PageRendererService } from '../services/page-renderer.service';
import { createBrowser, Browser, ROUTES } from '@sker/prompt-renderer';
import { HomePage, GitDocsPage } from '../www/pages';

@Module({
  providers: [
    { provide: PageRendererService, useClass: PageRendererService },
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
  exports: [PageRendererService]
})
export class PageModule { }
