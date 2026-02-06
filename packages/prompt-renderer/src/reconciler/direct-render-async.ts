import { ReactElement, ReactNode } from 'react';
import { VNode } from './types';

export async function directRenderAsync(element: ReactNode): Promise<VNode | null> {
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
    const children = await Promise.all(
      element.map(directRenderAsync)
    );
    return {
      type: 'fragment',
      props: {},
      children: children.filter((node): node is VNode => node !== null)
    };
  }

  // 处理 React 元素
  const reactElement = element as ReactElement;
  const { type, props } = reactElement;

  // 处理函数组件（支持异步）
  if (typeof type === 'function') {
    const Component = type as (props: any) => ReactNode | Promise<ReactNode>;
    const result = await Component(props);
    return directRenderAsync(result);
  }

  // 处理原生元素
  const { children: propsChildren, ...restProps } = props || {};
  const childrenArray = Array.isArray(propsChildren)
    ? propsChildren
    : propsChildren != null
    ? [propsChildren]
    : [];

  const children = await Promise.all(
    childrenArray.map(directRenderAsync)
  );

  return {
    type: String(type),
    props: restProps,
    children: children.filter((node): node is VNode => node !== null)
  };
}
