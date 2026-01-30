import { TextNode, ElementNode } from './types';

export function createTextNode(text: string): TextNode {
  return {
    type: 'TEXT',
    content: text
  };
}

export function createElement(
  type: string,
  props: Record<string, any>,
  children: any[]
): ElementNode {
  return {
    type,
    props: props ? { ...props } : {},
    children: children || []
  };
}
