import { VNode, ElementNode, TextNode } from './types';

function escapeMarkdown(text: string): string {
  return text.replace(/([*_#[\]])/g, '\\$1');
}

function getTextContent(node: VNode, preserveWhitespace = false): string {
  if (node.type === 'TEXT') {
    return preserveWhitespace ? (node as TextNode).content : (node as TextNode).content;
  }
  return (node as ElementNode).children.map(child => getTextContent(child, preserveWhitespace)).join('');
}

function getTextContentDefault(node: VNode): string {
  return getTextContent(node, false);
}

export function renderToMarkdown(node: VNode): string {
  if (node.type === 'TEXT') {
    return escapeMarkdown((node as TextNode).content.trim());
  }

  const element = node as ElementNode;

  if (element.type === 'h1') {
    const content = element.children.map(getTextContentDefault).join('');
    return content ? `# ${content}\n` : '#';
  }
  if (element.type === 'h2') {
    const content = element.children.map(getTextContentDefault).join('');
    return content ? `## ${content}\n` : '##';
  }
  if (element.type === 'h3') {
    const content = element.children.map(getTextContentDefault).join('');
    return content ? `### ${content}\n` : '###';
  }
  if (element.type === 'h4') {
    const content = element.children.map(getTextContentDefault).join('');
    return content ? `#### ${content}\n` : '####';
  }
  if (element.type === 'h5') {
    const content = element.children.map(getTextContentDefault).join('');
    return content ? `##### ${content}\n` : '#####';
  }
  if (element.type === 'h6') {
    const content = element.children.map(getTextContentDefault).join('');
    return content ? `###### ${content}\n` : '######';
  }

  if (element.type === 'ul') {
    return element.children
      .map(child => `- ${getTextContentDefault(child)}`)
      .join('\n') + '\n';
  }

  if (element.type === 'ol') {
    return element.children
      .map((child, i) => `${i + 1}. ${getTextContentDefault(child)}`)
      .join('\n') + '\n';
  }

  if (element.type === 'button') {
    const label = getTextContentDefault(element);
    return `[${label}] `;
  }

  if (element.type === 'tool') {
    const label = getTextContentDefault(element);
    return `[@tool:${label}] `;
  }

  if (element.type === 'input') {
    const placeholder = element.props?.placeholder;
    return placeholder ? `[Input: ${placeholder}] ` : '[Input] ';
  }

  if (element.type === 'p') {
    const content = element.children.map(getTextContentDefault).join('').trim();
    return escapeMarkdown(content) + `\n`;
  }

  if (element.type === 'div') {
    const children = element.children
      .filter(child => child !== null && child !== undefined)
      .map(child => renderToMarkdown(child))
      .filter(content => content.length > 0);

    return children.join('') + '\n';
  }

  if (element.type === 'span') {
    return element.children.map(getTextContentDefault).join('');
  }

  if (element.type === 'table') {
    const rows = element.children.filter(child =>
      child !== null && child !== undefined && (child as ElementNode).type === 'tr'
    ) as ElementNode[];

    if (rows.length === 0) return '\n';

    const renderedRows = rows.map(row => {
      const cells = row.children.filter(child =>
        child !== null && child !== undefined
      );
      return '| ' + cells.map(cell => getTextContentDefault(cell)).join(' | ') + ' |';
    });

    return renderedRows.join('\n') + '\n';
  }

  if (element.type === 'pre' || element.type === 'code') {
    const content = element.children.map(child => getTextContent(child, true)).join('');
    const lang = element.props?.lang || element.props?.language || '';
    return '```' + lang + '\n' + content + '\n```\n';
  }

  if (element.type === 'Br' || element.type === 'br') {
    return '\n';
  }

  if (element.type === 'Tab') {
    return '    ';
  }

  if (element.type === 'Space') {
    const count = element.props?.count || 1;
    return ' '.repeat(count);
  }

  return element.children
    .filter(child => child !== null && child !== undefined)
    .map(child => renderToMarkdown(child))
    .join('');
}
