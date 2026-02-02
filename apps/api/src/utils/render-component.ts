import { createElement, renderToMarkdown } from '@sker/prompt-renderer';
import React from 'react';

// 注意：这里需要从 prompt-renderer 内部导入 reconciler
// 但由于它没有被导出，我们需要使用 Browser/Page API
import { createBrowser, ROUTES } from '@sker/prompt-renderer';

export function renderComponent(component: React.ComponentType<any>, props: any = {}): string {
  const browser = createBrowser([
    { provide: ROUTES, useValue: [
      { path: '/render', component, params: props }
    ]}
  ]);

  const page = browser.open('prompt://render');
  const result = page.render();
  return result.prompt;
}
