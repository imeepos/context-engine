import { Context } from 'hono';
import { PageRendererService } from '../services/page-renderer.service';
import { HomePage, GitDocsPage } from '../www/pages';

export async function renderHomePage(c: Context) {
  const injector = c.get('injector');
  const renderer = injector.get(PageRendererService);

  const acceptHeader = c.req.header('accept');
  const format = renderer.detectFormat(acceptHeader);

  const html = renderer.renderPage(HomePage, {}, format, {
    title: 'Sker API - Home',
    description: 'Modern API with Git/File management and MCP support'
  });

  const contentType = format === 'markdown' ? 'text/markdown' : 'text/html';
  return c.html(html, 200, { 'Content-Type': contentType });
}

export async function renderGitDocsPage(c: Context) {
  const injector = c.get('injector');
  const renderer = injector.get(PageRendererService);

  const acceptHeader = c.req.header('accept');
  const format = renderer.detectFormat(acceptHeader);

  const html = renderer.renderPage(GitDocsPage, {}, format, {
    title: 'Git Integration Guide',
    description: 'Complete guide for GitHub/Gitea integration'
  });

  const contentType = format === 'markdown' ? 'text/markdown' : 'text/html';
  return c.html(html, 200, { 'Content-Type': contentType });
}
