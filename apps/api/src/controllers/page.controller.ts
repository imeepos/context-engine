import { Controller, Injectable, Get, Query, Inject } from '@sker/core';
import { PageRendererService, type RenderFormat } from '../services/page-renderer.service';
import { HomePage, GitDocsPage } from '../www/pages';
import { Browser } from '@sker/prompt-renderer';

@Controller('/')
@Injectable({ providedIn: 'auto' })
export class PageController {
  constructor(
    @Inject(Browser) private browser: Browser
  ) { }

  @Get('/')
  async renderHomePage() {
    const page = this.browser.open('prompt://');
    return page.render()
  }

  @Get('/docs/api')
  async renderGitDocsPage() {
    const page = this.browser.open('prompt://docs/api');
    return page.render()
  }
}


