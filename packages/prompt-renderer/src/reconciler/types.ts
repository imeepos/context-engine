export interface TextNode {
  type: 'TEXT';
  content: string;
}

export interface ElementNode {
  type: string;
  props: Record<string, any>;
  children: VNode[];
}

export type VNode = TextNode | ElementNode;

export interface Tool {
  name: string;
  type: 'button' | 'input';
  label?: string;
  params?: any;
  inputType?: string;
  placeholder?: string;
}
