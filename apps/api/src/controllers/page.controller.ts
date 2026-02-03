import { Controller, Injectable, Get, Query, Inject } from '@sker/core';
import { PageRendererService, type RenderFormat } from '../services/page-renderer.service';
import { HomePage, GitDocsPage } from '../www/pages';

@Controller('/pages')
@Injectable({ providedIn: 'auto' })
export class PageController {
  constructor(
    @Inject(PageRendererService) private renderer: PageRendererService
  ) { }

  @Get('/home')
  async renderHomePage(@Query('format') format?: RenderFormat) {
    const detectedFormat = format || 'html';

    const html = this.renderer.renderPage(HomePage, {}, detectedFormat, {
      title: 'Sker API - Home',
      description: 'Modern API with Git/File management and MCP support'
    });

    const contentType = detectedFormat === 'markdown' ? 'text/markdown' : 'text/html';
    return new Response(html, {
      status: 200,
      headers: { 'Content-Type': contentType }
    });
  }

  @Get('/git-docs')
  async renderGitDocsPage(@Query('format') format?: RenderFormat) {
    const detectedFormat = format || 'html';

    const html = this.renderer.renderPage(GitDocsPage, {}, detectedFormat, {
      title: 'Git Integration Guide',
      description: 'Complete guide for GitHub/Gitea integration'
    });

    const contentType = detectedFormat === 'markdown' ? 'text/markdown' : 'text/html';
    return new Response(html, {
      status: 200,
      headers: { 'Content-Type': contentType }
    });
  }
}


