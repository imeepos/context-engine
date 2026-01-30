import { describe, it, expect } from 'vitest';
import { createTextNode, createElement } from './dom';

describe('Virtual DOM - Text Nodes', () => {
  it('creates text node with string content', () => {
    const node = createTextNode('Hello World');
    expect(node.type).toBe('TEXT');
    expect(node.content).toBe('Hello World');
  });

  it('creates text node with empty string', () => {
    const node = createTextNode('');
    expect(node.type).toBe('TEXT');
    expect(node.content).toBe('');
  });

  it('creates text node with special characters', () => {
    const node = createTextNode('Hello & <World> "Test"');
    expect(node.type).toBe('TEXT');
    expect(node.content).toBe('Hello & <World> "Test"');
  });
});

describe('Virtual DOM - Heading Elements', () => {
  it('creates h1 element node', () => {
    const node = createElement('h1', {}, []);
    expect(node.type).toBe('h1');
    expect(node.props).toEqual({});
    expect(node.children).toEqual([]);
  });

  it('creates h2 element node', () => {
    const node = createElement('h2', {}, []);
    expect(node.type).toBe('h2');
  });

  it('creates h3 element node', () => {
    const node = createElement('h3', {}, []);
    expect(node.type).toBe('h3');
  });

  it('creates h4 element node', () => {
    const node = createElement('h4', {}, []);
    expect(node.type).toBe('h4');
  });

  it('creates h5 element node', () => {
    const node = createElement('h5', {}, []);
    expect(node.type).toBe('h5');
  });

  it('creates h6 element node', () => {
    const node = createElement('h6', {}, []);
    expect(node.type).toBe('h6');
  });

  it('creates h1 with text child', () => {
    const textNode = createTextNode('Title');
    const node = createElement('h1', {}, [textNode]);
    expect(node.children).toHaveLength(1);
    expect(node.children[0]).toBe(textNode);
  });
});

describe('Virtual DOM - Text Elements', () => {
  it('creates p element node', () => {
    const node = createElement('p', {}, []);
    expect(node.type).toBe('p');
  });

  it('creates span element node', () => {
    const node = createElement('span', {}, []);
    expect(node.type).toBe('span');
  });

  it('creates div element node', () => {
    const node = createElement('div', {}, []);
    expect(node.type).toBe('div');
  });
});

describe('Virtual DOM - List Elements', () => {
  it('creates ul element node', () => {
    const node = createElement('ul', {}, []);
    expect(node.type).toBe('ul');
  });

  it('creates ol element node', () => {
    const node = createElement('ol', {}, []);
    expect(node.type).toBe('ol');
  });

  it('creates li element node', () => {
    const node = createElement('li', {}, []);
    expect(node.type).toBe('li');
  });

  it('creates ul with li children', () => {
    const li1 = createElement('li', {}, [createTextNode('Item 1')]);
    const li2 = createElement('li', {}, [createTextNode('Item 2')]);
    const ul = createElement('ul', {}, [li1, li2]);
    expect(ul.children).toHaveLength(2);
  });
});

describe('Virtual DOM - Interactive Elements', () => {
  it('creates button element node', () => {
    const node = createElement('button', {}, []);
    expect(node.type).toBe('button');
  });

  it('creates button with data-action prop', () => {
    const node = createElement('button', { 'data-action': 'submit' }, []);
    expect(node.props['data-action']).toBe('submit');
  });

  it('creates button with data-params prop', () => {
    const params = { id: '123', type: 'user' };
    const node = createElement('button', { 'data-params': params }, []);
    expect(node.props['data-params']).toEqual(params);
  });

  it('creates input element node', () => {
    const node = createElement('input', {}, []);
    expect(node.type).toBe('input');
  });

  it('creates input with name prop', () => {
    const node = createElement('input', { name: 'email' }, []);
    expect(node.props.name).toBe('email');
  });

  it('creates input with type prop', () => {
    const node = createElement('input', { type: 'text' }, []);
    expect(node.props.type).toBe('text');
  });

  it('creates input with placeholder prop', () => {
    const node = createElement('input', { placeholder: 'Enter email' }, []);
    expect(node.props.placeholder).toBe('Enter email');
  });

  it('creates input with multiple props', () => {
    const node = createElement('input', {
      name: 'username',
      type: 'text',
      placeholder: 'Enter username'
    }, []);
    expect(node.props.name).toBe('username');
    expect(node.props.type).toBe('text');
    expect(node.props.placeholder).toBe('Enter username');
  });
});

describe('Virtual DOM - Nested Elements', () => {
  it('creates nested div with p child', () => {
    const p = createElement('p', {}, [createTextNode('Content')]);
    const div = createElement('div', {}, [p]);
    expect(div.children).toHaveLength(1);
    expect(div.children[0].type).toBe('p');
  });

  it('creates deeply nested structure', () => {
    const text = createTextNode('Deep');
    const span = createElement('span', {}, [text]);
    const p = createElement('p', {}, [span]);
    const div = createElement('div', {}, [p]);
    expect(div.children[0].children[0].children[0].content).toBe('Deep');
  });

  it('creates element with multiple children', () => {
    const p1 = createElement('p', {}, [createTextNode('First')]);
    const p2 = createElement('p', {}, [createTextNode('Second')]);
    const p3 = createElement('p', {}, [createTextNode('Third')]);
    const div = createElement('div', {}, [p1, p2, p3]);
    expect(div.children).toHaveLength(3);
  });
});

describe('Virtual DOM - Edge Cases', () => {
  it('creates element with empty children array', () => {
    const node = createElement('div', {}, []);
    expect(node.children).toEqual([]);
  });

  it('creates element with empty props', () => {
    const node = createElement('div', {}, []);
    expect(node.props).toEqual({});
  });

  it('handles null children gracefully', () => {
    const node = createElement('div', {}, [null as any]);
    expect(node.children).toHaveLength(1);
  });

  it('handles undefined props gracefully', () => {
    const node = createElement('div', undefined as any, []);
    expect(node.props).toBeDefined();
  });
});

describe('Virtual DOM - Props Validation', () => {
  it('preserves all props passed to element', () => {
    const props = { id: 'test', className: 'container', 'data-value': '123' };
    const node = createElement('div', props, []);
    expect(node.props).toEqual(props);
  });

  it('does not mutate original props object', () => {
    const props = { id: 'test' };
    const node = createElement('div', props, []);
    node.props.id = 'modified';
    expect(props.id).toBe('test');
  });
});
