import { describe, it, expect } from 'vitest';
import React from 'react';
import { directRender } from './direct-render';
import { ElementNode, TextNode } from './types';

describe('directRender - Primitives', () => {
  it('renders null as null', () => {
    const result = directRender(null);
    expect(result).toBeNull();
  });

  it('renders undefined as null', () => {
    const result = directRender(undefined);
    expect(result).toBeNull();
  });

  it('renders boolean as null', () => {
    expect(directRender(true)).toBeNull();
    expect(directRender(false)).toBeNull();
  });

  it('renders string as text node', () => {
    const result = directRender('Hello') as TextNode;
    expect(result.type).toBe('TEXT');
    expect(result.content).toBe('Hello');
  });

  it('renders number as text node', () => {
    const result = directRender(42) as TextNode;
    expect(result.type).toBe('TEXT');
    expect(result.content).toBe('42');
  });
});

describe('directRender - Arrays', () => {
  it('renders array as fragment', () => {
    const result = directRender(['Hello', 'World']) as ElementNode;
    expect(result.type).toBe('fragment');
    expect(result.children).toHaveLength(2);
    expect((result.children[0] as TextNode).content).toBe('Hello');
    expect((result.children[1] as TextNode).content).toBe('World');
  });

  it('filters out null values in arrays', () => {
    const result = directRender(['Hello', null, 'World']) as ElementNode;
    expect(result.type).toBe('fragment');
    expect(result.children).toHaveLength(2);
  });

  it('renders empty array as fragment with no children', () => {
    const result = directRender([]) as ElementNode;
    expect(result.type).toBe('fragment');
    expect(result.children).toHaveLength(0);
  });
});

describe('directRender - Native Elements', () => {
  it('renders div element', () => {
    const element = React.createElement('div', null, 'Content');
    const result = directRender(element) as ElementNode;
    expect(result.type).toBe('div');
    expect(result.children).toHaveLength(1);
    expect((result.children[0] as TextNode).content).toBe('Content');
  });

  it('renders element with props', () => {
    const element = React.createElement('input', { placeholder: 'Enter text', type: 'text' });
    const result = directRender(element) as ElementNode;
    expect(result.type).toBe('input');
    expect(result.props.placeholder).toBe('Enter text');
    expect(result.props.type).toBe('text');
  });

  it('renders element with multiple children', () => {
    const element = React.createElement('div', null, 'First', 'Second', 'Third');
    const result = directRender(element) as ElementNode;
    expect(result.type).toBe('div');
    expect(result.children).toHaveLength(3);
  });

  it('renders nested elements', () => {
    const element = React.createElement('div', null,
      React.createElement('p', null, 'Paragraph')
    );
    const result = directRender(element) as ElementNode;
    expect(result.type).toBe('div');
    expect(result.children).toHaveLength(1);
    const child = result.children[0] as ElementNode;
    expect(child.type).toBe('p');
    expect((child.children[0] as TextNode).content).toBe('Paragraph');
  });
});

describe('directRender - Function Components', () => {
  it('renders function component', () => {
    const MyComponent = () => React.createElement('div', null, 'Hello');
    const element = React.createElement(MyComponent);
    const result = directRender(element) as ElementNode;
    expect(result.type).toBe('div');
    expect((result.children[0] as TextNode).content).toBe('Hello');
  });

  it('renders function component with props', () => {
    const Greeting = ({ name }: { name: string }) =>
      React.createElement('h1', null, `Hello ${name}`);
    const element = React.createElement(Greeting, { name: 'World' });
    const result = directRender(element) as ElementNode;
    expect(result.type).toBe('h1');
    expect((result.children[0] as TextNode).content).toBe('Hello World');
  });

  it('renders nested function components', () => {
    const Inner = () => React.createElement('span', null, 'Inner');
    const Outer = () => React.createElement('div', null, React.createElement(Inner));
    const element = React.createElement(Outer);
    const result = directRender(element) as ElementNode;
    expect(result.type).toBe('div');
    const child = result.children[0] as ElementNode;
    expect(child.type).toBe('span');
    expect((child.children[0] as TextNode).content).toBe('Inner');
  });

  it('renders component returning null', () => {
    const Empty = () => null;
    const element = React.createElement(Empty);
    const result = directRender(element);
    expect(result).toBeNull();
  });
});

describe('directRender - Complex Structures', () => {
  it('renders complex nested structure', () => {
    const element = React.createElement('div', null,
      React.createElement('h1', null, 'Title'),
      React.createElement('p', null, 'Paragraph'),
      React.createElement('ul', null,
        React.createElement('li', null, 'Item 1'),
        React.createElement('li', null, 'Item 2')
      )
    );
    const result = directRender(element) as ElementNode;
    expect(result.type).toBe('div');
    expect(result.children).toHaveLength(3);
    expect((result.children[0] as ElementNode).type).toBe('h1');
    expect((result.children[1] as ElementNode).type).toBe('p');
    expect((result.children[2] as ElementNode).type).toBe('ul');
  });

  it('handles mixed children types', () => {
    const element = React.createElement('div', null,
      'Text',
      React.createElement('span', null, 'Span'),
      null,
      42,
      React.createElement('p', null, 'Paragraph')
    );
    const result = directRender(element) as ElementNode;
    expect(result.type).toBe('div');
    expect(result.children).toHaveLength(4); // null is filtered out
  });
});

describe('directRender - Edge Cases', () => {
  it('handles empty props', () => {
    const element = React.createElement('div', {});
    const result = directRender(element) as ElementNode;
    expect(result.type).toBe('div');
    expect(result.props).toEqual({});
  });

  it('handles null children prop', () => {
    const element = React.createElement('div', { children: null });
    const result = directRender(element) as ElementNode;
    expect(result.type).toBe('div');
    expect(result.children).toHaveLength(0);
  });

  it('handles undefined children prop', () => {
    const element = React.createElement('div', { children: undefined });
    const result = directRender(element) as ElementNode;
    expect(result.type).toBe('div');
    expect(result.children).toHaveLength(0);
  });

  it('excludes children from props', () => {
    const element = React.createElement('div', { id: 'test', children: 'Content' });
    const result = directRender(element) as ElementNode;
    expect(result.props.id).toBe('test');
    expect(result.props.children).toBeUndefined();
  });
});
