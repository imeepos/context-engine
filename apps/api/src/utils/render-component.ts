import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Simple React to Markdown converter
function htmlToMarkdown(html: string): string {
  return html
    .replace(/<h1[^>]*>(.*?)<\/h1>/g, '# $1\n\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/g, '## $1\n\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/g, '### $1\n\n')
    .replace(/<p[^>]*>(.*?)<\/p>/g, '$1\n\n')
    .replace(/<strong[^>]*>(.*?)<\/strong>/g, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/g, '*$1*')
    .replace(/<code[^>]*>(.*?)<\/code>/g, '`$1`')
    .replace(/<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gs, '```\n$1\n```\n\n')
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/g, '[$2]($1)')
    .replace(/<li[^>]*>(.*?)<\/li>/g, '- $1\n')
    .replace(/<ul[^>]*>(.*?)<\/ul>/gs, '$1\n')
    .replace(/<div[^>]*>(.*?)<\/div>/gs, '$1')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function renderComponent(component: React.ComponentType<any>, props: any = {}): string {
  const element = React.createElement(component, props);
  const html = renderToStaticMarkup(element);
  return htmlToMarkdown(html);
}
