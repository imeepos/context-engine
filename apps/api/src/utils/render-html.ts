import React from 'react';
import { renderToString } from 'react-dom/server';

export interface HtmlRenderOptions {
  title?: string;
  description?: string;
  lang?: string;
}

export function renderToHtml(
  component: React.ReactElement,
  options: HtmlRenderOptions = {}
): string {
  const {
    title = 'Sker API',
    description = 'Sker API Documentation',
    lang = 'en'
  } = options;

  const content = renderToString(component);

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${description}">
  <title>${title}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px; }
    h2 { color: #555; margin-top: 30px; }
    code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; }
    pre { background: #f4f4f4; padding: 15px; border-radius: 5px; overflow-x: auto; }
    ul { padding-left: 20px; }
    a { color: #0066cc; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  ${content}
</body>
</html>`;
}
