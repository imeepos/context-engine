import { VNode, ElementNode, TextNode } from './types';

function escapeMarkdown(text: string): string {
  return text.replace(/([*_#])/g, '\\$1');
}

function getTextContent(node: VNode): string {
  if (node.type === 'TEXT') {
    return (node as TextNode).content;
  }
  return (node as ElementNode).children.map(getTextContent).join('');
}

export function renderToMarkdown(node: VNode): string {
  if (node.type === 'TEXT') {
    return (node as TextNode).content;
  }

  const element = node as ElementNode;

  if (element.type === 'h1') {
    const content = element.children.map(getTextContent).join('');
    return content ? `# ${content}\n` : '#\n';
  }
  if (element.type === 'h2') {
    const content = element.children.map(getTextContent).join('');
    return content ? `## ${content}\n` : '##\n';
  }
  if (element.type === 'h3') {
    const content = element.children.map(getTextContent).join('');
    return content ? `### ${content}\n` : '###\n';
  }
  if (element.type === 'h4') {
    const content = element.children.map(getTextContent).join('');
    return content ? `#### ${content}\n` : '####\n';
  }
  if (element.type === 'h5') {
    const content = element.children.map(getTextContent).join('');
    return content ? `##### ${content}\n` : '#####\n';
  }
  if (element.type === 'h6') {
    const content = element.children.map(getTextContent).join('');
    return content ? `###### ${content}\n` : '######\n';
  }

  if (element.type === 'ul') {
    return element.children
      .map(child => `- ${getTextContent(child)}`)
      .join('\n') + '\n';
  }

  if (element.type === 'ol') {
    return element.children
      .map((child, i) => `${i + 1}. ${getTextContent(child)}`)
      .join('\n') + '\n';
  }

  if (element.type === 'button') {
    const label = getTextContent(element);
    return `[${label}]`;
  }

  if (element.type === 'input') {
    const placeholder = element.props.placeholder;
    return placeholder ? `[Input: ${placeholder}]` : '[Input]';
  }

  if (element.type === 'p') {
    const content = element.children.map(getTextContent).join('');
    return content ? `${content}\n` : '';
  }

  if (element.type === 'div') {
    const children = element.children
      .filter(child => child !== null && child !== undefined)
      .map(child => renderToMarkdown(child));

    const content = children.join('');
    return content ? content + '\n' : '';
  }

  if (element.type === 'span') {
    return element.children.map(getTextContent).join('');
  }

  return element.children
    .filter(child => child !== null && child !== undefined)
    .map(child => renderToMarkdown(child))
    .join('');
}
