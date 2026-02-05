import "reflect-metadata";
// Browser and Page API
export { createBrowser } from './browser/browser';
export * from './browser/index';

// Router
export { parseUrl, buildUrl, extractParams } from './router/url';
export { matchRoute, compilePattern, rankRoutes } from './router/matcher';
export type { PromptURL } from './router/url';
export type { Match } from './router/matcher';

// Reconciler
export { createTextNode, createElement } from './reconciler/dom';
export { renderToMarkdown } from './reconciler/renderer';
export { extractTools } from './reconciler/extractor';
export { directRender } from './reconciler/direct-render';
export { directRenderAsync } from './reconciler/direct-render-async';
export type { VNode, TextNode, ElementNode, Tool as ToolDefinition } from './reconciler/types';

// Components
export { Tool, ToolUse } from './components/Tool';
export type { ToolProps, ToolUseProps } from './components/Tool';
export { Space, Tab, Br } from './components/Layout';
export type { SpaceProps, TabProps, BrProps } from './components/Layout';
export { Link } from './components/Link';
export type { LinkProps } from './components/Link';
export * from './module';
