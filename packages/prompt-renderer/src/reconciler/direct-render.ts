import { ReactElement, ReactNode } from 'react';
import { VNode } from './types';

export function directRender(element: ReactNode): VNode | null {
  // 处理 null/undefined/boolean
  if (element == null || typeof element === 'boolean') {
    return null;
  }

  // 处理文本节点
  if (typeof element === 'string' || typeof element === 'number') {
    return {
      type: 'TEXT',
      content: String(element)
    };
  }

  // 处理数组
  if (Array.isArray(element)) {
    const children = element
      .map(directRender)
      .filter((node): node is VNode => node !== null);

    return {
      type: 'fragment',
      props: {},
      children
    };
  }

  // 处理 React 元素
  const reactElement = element as ReactElement;
  const { type, props } = reactElement;

  // 处理函数组件
  if (typeof type === 'function') {
    const Component = type as (props: any) => ReactNode;
    const result = Component(props);
    return directRender(result);
  }

  // 处理原生元素
  const { children: propsChildren, ...restProps } = props || {};
  const childrenArray = Array.isArray(propsChildren)
    ? propsChildren
    : propsChildren != null
    ? [propsChildren]
    : [];

  const children = childrenArray
    .map(directRender)
    .filter((node): node is VNode => node !== null);

  return {
    type: String(type),
    props: restProps,
    children
  };
}
