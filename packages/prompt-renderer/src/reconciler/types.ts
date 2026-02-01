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
  description?: string;
  params?: {
    properties?: Record<string, any>;
    required?: string[];
    bound?: Record<string, any>;
  };
  inputType?: string;
  placeholder?: string;
}
