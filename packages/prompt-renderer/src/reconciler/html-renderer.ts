import { VNode, ElementNode, TextNode } from './types';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderChildren(children: VNode[]): string {
  return children
    .filter(child => child !== null && child !== undefined)
    .map(child => renderToHtml(child))
    .join('');
}

function renderAttrs(props: Record<string, any>,
  include: string[]): string {
  const parts: string[] = [];
  for (const key of include) {
    const val = props[key];
    if (val === undefined || val === null) continue;
    if (typeof val === 'boolean') {
      if (val) parts.push(` ${key}`);
    } else {
      parts.push(` ${key}="${escapeHtml(String(val))}"`);
    }
  }
  return parts.join('');
}

const HTML_TAGS = new Set([
  'h1','h2','h3','h4','h5','h6',
  'p','div','span','strong','b','em','i',
  'del','s','strike',
  'ul','ol','li',
  'table','tr','td','th',
  'button',
]);

const SELF_CLOSING = new Set(['br', 'Br']);

export function renderToHtml(node: VNode): string {
  if (node.type === 'TEXT') {
    return escapeHtml((node as TextNode).content);
  }

  const el = node as ElementNode;
  const children = renderChildren(el.children);

  // Self-closing: br/Br
  if (SELF_CLOSING.has(el.type)) {
    return '<br />';
  }

  // Layout: Tab
  if (el.type === 'Tab') {
    return '<span class="tab">'
      + '&nbsp;&nbsp;&nbsp;&nbsp;</span>';
  }

  // Layout: Space
  if (el.type === 'Space') {
    const count = el.props?.count || 1;
    const nbsp = '&nbsp;'.repeat(count);
    return `<span class="space">${nbsp}</span>`;
  }

  // Link component → <a> with data-navigate
  if (el.type === 'Link') {
    const href = el.props?.to || el.props?.href;
    const hrefAttr = href
      ? ` href="${escapeHtml(href)}" data-navigate="true"`
      : '';
    return `<a${hrefAttr}>${children}</a>`;
  }

  // Native <a>
  if (el.type === 'a') {
    const href = el.props?.href;
    const hrefAttr = href
      ? ` href="${escapeHtml(href)}"`
      : '';
    return `<a${hrefAttr}>${children}</a>`;
  }

  // Tool → button with data-tool
  if (el.type === 'tool') {
    const name = el.props?.name || '';
    return '<button class="tool-btn"'
      + ` data-tool="${escapeHtml(name)}">`
      + `${children}</button>`;
  }

  // Input (self-closing)
  if (el.type === 'input') {
    const attrs = renderAttrs(el.props,
      ['type','placeholder','value','name','checked']);
    return `<input${attrs} />`;
  }

  // Checkbox/Radio shorthand
  if (el.type === 'checkbox') {
    const attrs = renderAttrs(
      { ...el.props, type: 'checkbox' },
      ['type','checked']);
    return `<input${attrs} />`;
  }
  if (el.type === 'radio') {
    const attrs = renderAttrs(
      { ...el.props, type: 'radio' },
      ['type','checked']);
    return `<input${attrs} />`;
  }

  // Select
  if (el.type === 'select') {
    const attrs = renderAttrs(el.props,
      ['value','placeholder']);
    return `<select${attrs}>${children}</select>`;
  }

  // Textarea
  if (el.type === 'textarea') {
    const attrs = renderAttrs(el.props,
      ['placeholder','rows','cols']);
    return `<textarea${attrs}>${children}</textarea>`;
  }

  // Pre → <pre><code>
  if (el.type === 'pre') {
    const lang = el.props?.lang
      || el.props?.language || '';
    const cls = lang
      ? ` class="language-${escapeHtml(lang)}"`
      : '';
    const raw = el.children
      .filter(c => c !== null && c !== undefined)
      .map(c => getTextContent(c))
      .join('');
    return `<pre><code${cls}>${raw}</code></pre>`;
  }

  // Code
  if (el.type === 'code') {
    const lang = el.props?.lang
      || el.props?.language || '';
    const cls = lang
      ? ` class="language-${escapeHtml(lang)}"`
      : '';
    const raw = el.children
      .filter(c => c !== null && c !== undefined)
      .map(c => getTextContent(c))
      .join('');
    return `<code${cls}>${raw}</code>`;
  }

  // Button with data-action
  if (el.type === 'button') {
    const action = el.props?.['data-action'];
    const actionAttr = action
      ? ` data-action="${escapeHtml(action)}"`
      : '';
    return `<button${actionAttr}>${children}</button>`;
  }

  // Standard HTML tags
  if (HTML_TAGS.has(el.type)) {
    return `<${el.type}>${children}</${el.type}>`;
  }

  // Unknown → div fallback
  return `<div>${children}</div>`;
}

function getTextContent(node: VNode): string {
  if (node.type === 'TEXT') {
    return (node as TextNode).content;
  }
  return (node as ElementNode).children
    .filter(c => c !== null && c !== undefined)
    .map(c => getTextContent(c))
    .join('');
}
