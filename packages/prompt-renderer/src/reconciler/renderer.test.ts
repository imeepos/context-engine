import { describe, it, expect } from 'vitest';
import { renderToMarkdown } from './renderer';
import { createElement, createTextNode } from './dom';

describe('Markdown Renderer - Headings', () => {
  it('renders h1 to markdown', () => {
    const node = createElement('h1', {}, [createTextNode('Title')]);
    const markdown = renderToMarkdown(node);
    expect(markdown).toBe('# Title');
  });

  it('renders h2 to markdown', () => {
    const node = createElement('h2', {}, [createTextNode('Subtitle')]);
    const markdown = renderToMarkdown(node);
    expect(markdown).toBe('## Subtitle');
  });

  it('renders h3 to markdown', () => {
    const node = createElement('h3', {}, [createTextNode('Section')]);
    const markdown = renderToMarkdown(node);
    expect(markdown).toBe('### Section');
  });

  it('renders h4 to markdown', () => {
    const node = createElement('h4', {}, [createTextNode('Subsection')]);
    const markdown = renderToMarkdown(node);
    expect(markdown).toBe('#### Subsection');
  });

  it('renders h5 to markdown', () => {
    const node = createElement('h5', {}, [createTextNode('Minor heading')]);
    const markdown = renderToMarkdown(node);
    expect(markdown).toBe('##### Minor heading');
  });

  it('renders h6 to markdown', () => {
    const node = createElement('h6', {}, [createTextNode('Smallest heading')]);
    const markdown = renderToMarkdown(node);
    expect(markdown).toBe('###### Smallest heading');
  });

  it('renders empty h1', () => {
    const node = createElement('h1', {}, []);
    const markdown = renderToMarkdown(node);
    expect(markdown).toBe('#');
  });
});

describe('Markdown Renderer - Text Elements', () => {
  it('renders p to markdown', () => {
    const node = createElement('p', {}, [createTextNode('Paragraph text')]);
    const markdown = renderToMarkdown(node);
    expect(markdown).toBe('Paragraph text');
  });

  it('renders span to markdown', () => {
    const node = createElement('span', {}, [createTextNode('Inline text')]);
    const markdown = renderToMarkdown(node);
    expect(markdown).toBe('Inline text');
  });

  it('renders div to markdown', () => {
    const node = createElement('div', {}, [createTextNode('Block text')]);
    const markdown = renderToMarkdown(node);
    expect(markdown).toBe('Block text');
  });

  it('renders empty p', () => {
    const node = createElement('p', {}, []);
    const markdown = renderToMarkdown(node);
    expect(markdown).toBe('');
  });
});

describe('Markdown Renderer - Lists', () => {
  it('renders ul with li children', () => {
    const li1 = createElement('li', {}, [createTextNode('Item 1')]);
    const li2 = createElement('li', {}, [createTextNode('Item 2')]);
    const ul = createElement('ul', {}, [li1, li2]);
    const markdown = renderToMarkdown(ul);
    expect(markdown).toBe('- Item 1\n- Item 2');
  });

  it('renders ol with li children', () => {
    const li1 = createElement('li', {}, [createTextNode('First')]);
    const li2 = createElement('li', {}, [createTextNode('Second')]);
    const ol = createElement('ol', {}, [li1, li2]);
    const markdown = renderToMarkdown(ol);
    expect(markdown).toBe('1. First\n2. Second');
  });

  it('renders empty ul', () => {
    const ul = createElement('ul', {}, []);
    const markdown = renderToMarkdown(ul);
    expect(markdown).toBe('');
  });

  it('renders ul with single item', () => {
    const li = createElement('li', {}, [createTextNode('Only item')]);
    const ul = createElement('ul', {}, [li]);
    const markdown = renderToMarkdown(ul);
    expect(markdown).toBe('- Only item');
  });

  it('renders ol with multiple items', () => {
    const items = [1, 2, 3, 4, 5].map(n =>
      createElement('li', {}, [createTextNode(`Item ${n}`)])
    );
    const ol = createElement('ol', {}, items);
    const markdown = renderToMarkdown(ol);
    expect(markdown).toBe('1. Item 1\n2. Item 2\n3. Item 3\n4. Item 4\n5. Item 5');
  });
});

describe('Markdown Renderer - Interactive Elements', () => {
  it('renders button without data-action', () => {
    const button = createElement('button', {}, [createTextNode('Click me')]);
    const markdown = renderToMarkdown(button);
    expect(markdown).toBe('[Click me]');
  });

  it('renders button with data-action', () => {
    const button = createElement('button', { 'data-action': 'submit' }, [createTextNode('Submit')]);
    const markdown = renderToMarkdown(button);
    expect(markdown).toBe('[Submit]');
  });

  it('renders input with placeholder', () => {
    const input = createElement('input', { placeholder: 'Enter text' }, []);
    const markdown = renderToMarkdown(input);
    expect(markdown).toBe('[Input: Enter text]');
  });

  it('renders input without placeholder', () => {
    const input = createElement('input', { name: 'email' }, []);
    const markdown = renderToMarkdown(input);
    expect(markdown).toBe('[Input]');
  });

  it('renders input with type', () => {
    const input = createElement('input', { type: 'password', placeholder: 'Password' }, []);
    const markdown = renderToMarkdown(input);
    expect(markdown).toBe('[Input: Password]');
  });
});

describe('Markdown Renderer - Nested Elements', () => {
  it('renders nested div with p', () => {
    const p = createElement('p', {}, [createTextNode('Content')]);
    const div = createElement('div', {}, [p]);
    const markdown = renderToMarkdown(div);
    expect(markdown).toBe('Content');
  });

  it('renders div with multiple p children', () => {
    const p1 = createElement('p', {}, [createTextNode('First')]);
    const p2 = createElement('p', {}, [createTextNode('Second')]);
    const div = createElement('div', {}, [p1, p2]);
    const markdown = renderToMarkdown(div);
    expect(markdown).toBe('First\n\nSecond');
  });

  it('renders deeply nested structure', () => {
    const span = createElement('span', {}, [createTextNode('Deep')]);
    const p = createElement('p', {}, [span]);
    const div = createElement('div', {}, [p]);
    const markdown = renderToMarkdown(div);
    expect(markdown).toBe('Deep');
  });

  it('renders h1 with nested span', () => {
    const span = createElement('span', {}, [createTextNode('Title')]);
    const h1 = createElement('h1', {}, [span]);
    const markdown = renderToMarkdown(h1);
    expect(markdown).toBe('# Title');
  });
});

describe('Markdown Renderer - Special Characters', () => {
  it('escapes markdown special characters in text', () => {
    const node = createElement('p', {}, [createTextNode('Text with * and _')]);
    const markdown = renderToMarkdown(node);
    expect(markdown).toBe('Text with \\* and \\_');
  });

  it('escapes # in text', () => {
    const node = createElement('p', {}, [createTextNode('Not a # heading')]);
    const markdown = renderToMarkdown(node);
    expect(markdown).toBe('Not a \\# heading');
  });

  it('escapes brackets in text', () => {
    const node = createElement('p', {}, [createTextNode('[Not a link]')]);
    const markdown = renderToMarkdown(node);
    expect(markdown).toBe('\\[Not a link\\]');
  });

  it('preserves ampersands', () => {
    const node = createElement('p', {}, [createTextNode('A & B')]);
    const markdown = renderToMarkdown(node);
    expect(markdown).toBe('A & B');
  });
});

describe('Markdown Renderer - Edge Cases', () => {
  it('renders text node directly', () => {
    const node = createTextNode('Plain text');
    const markdown = renderToMarkdown(node);
    expect(markdown).toBe('Plain text');
  });

  it('renders empty text node', () => {
    const node = createTextNode('');
    const markdown = renderToMarkdown(node);
    expect(markdown).toBe('');
  });

  it('renders element with no children', () => {
    const node = createElement('div', {}, []);
    const markdown = renderToMarkdown(node);
    expect(markdown).toBe('');
  });

  it('handles null children', () => {
    const node = createElement('div', {}, [null as any]);
    const markdown = renderToMarkdown(node);
    expect(markdown).toBe('');
  });

  it('renders complex document structure', () => {
    const h1 = createElement('h1', {}, [createTextNode('Title')]);
    const p1 = createElement('p', {}, [createTextNode('First paragraph')]);
    const li1 = createElement('li', {}, [createTextNode('Item 1')]);
    const li2 = createElement('li', {}, [createTextNode('Item 2')]);
    const ul = createElement('ul', {}, [li1, li2]);
    const root = createElement('div', {}, [h1, p1, ul]);
    const markdown = renderToMarkdown(root);
    expect(markdown).toContain('# Title');
    expect(markdown).toContain('First paragraph');
    expect(markdown).toContain('- Item 1');
    expect(markdown).toContain('- Item 2');
  });
});

describe('Markdown Renderer - Whitespace Handling', () => {
  it('trims leading whitespace in text', () => {
    const node = createElement('p', {}, [createTextNode('  Text')]);
    const markdown = renderToMarkdown(node);
    expect(markdown).toBe('Text');
  });

  it('trims trailing whitespace in text', () => {
    const node = createElement('p', {}, [createTextNode('Text  ')]);
    const markdown = renderToMarkdown(node);
    expect(markdown).toBe('Text');
  });

  it('preserves single spaces between words', () => {
    const node = createElement('p', {}, [createTextNode('Multiple words here')]);
    const markdown = renderToMarkdown(node);
    expect(markdown).toBe('Multiple words here');
  });
});
