import { VNode, ElementNode, Tool } from './types';

function getTextContent(node: VNode): string {
  if (node.type === 'TEXT') {
    return (node as import('./types').TextNode).content;
  }
  return (node as ElementNode).children.map(getTextContent).join('');
}

export function extractTools(node: VNode): Tool[] {
  if (node.type === 'TEXT') {
    return [];
  }

  const element = node as ElementNode;
  const tools: Tool[] = [];

  if (element.type === 'button') {
    const action = element.props['data-action'];
    if (typeof action === 'string' && action.length > 0) {
      const tool: Tool = {
        name: action,
        type: 'button',
        label: getTextContent(element)
      };
      if (element.props['data-params'] !== undefined) {
        tool.params = element.props['data-params'];
      }
      tools.push(tool);
    }
  }

  if (element.type === 'input') {
    const name = element.props.name;
    if (typeof name === 'string' && name.length > 0) {
      const tool: Tool = {
        name,
        type: 'input',
        inputType: element.props.type || 'text'
      };
      if (element.props.placeholder !== undefined) {
        tool.placeholder = element.props.placeholder;
      }
      tools.push(tool);
    }
  }

  for (const child of element.children) {
    if (child !== null && child !== undefined) {
      tools.push(...extractTools(child));
    }
  }

  return tools;
}
