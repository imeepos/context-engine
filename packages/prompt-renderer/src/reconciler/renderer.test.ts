import { describe, it, expect } from 'vitest';
import { renderToMarkdown } from './renderer';
import { createElement, createTextNode } from './dom';

describe('Markdown Renderer - Headings', () => {
  it('renders h1 to markdown', () => {
    const node = createElement('h1', {}, [createTextNode('Title')]);
    const markdown = renderToMarkdown(node);
    expect(markdown).toBe('# Title\n');
  });

  it('renders h2 to markdown', () => {
    const node = createElement('h2', {}, [createTextNode('Subtitle')]);
    const markdown = renderToMarkdown(node);
    expect(markdown).toBe('## Subtitle\n');
  });

  it('renders h3 to markdown', () => {
    const node = createElement('h3', {}, [createTextNode('Section')]);
    const markdown = renderToMarkdown(node);
    expect(markdown).toBe('### Section\n');
  });

  it('renders h4 to markdown', () => {
    const node = createElement('h4', {}, [createTextNode('Subsection')]);
    const markdown = renderToMarkdown(node);
    expect(markdown).toBe('#### Subsection\n');
  });

  it('renders h5 to markdown', () => {
    const node = createElement('h5', {}, [createTextNode('Minor heading')]);
    const markdown = renderToMarkdown(node);
    expect(markdown).toBe('##### Minor heading\n');
  });

  it('renders h6 to markdown', () => {
    const node = createElement('h6', {}, [createTextNode('Smallest heading')]);
    const markdown = renderToMarkdown(node);
    expect(markdown).toBe('###### Smallest heading\n');
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
    expect(markdown).toBe('Paragraph text\n');
  });

  it('renders span to markdown', () => {
    const node = createElement('span', {}, [createTextNode('Inline text')]);
    const markdown = renderToMarkdown(node);
    expect(markdown).toBe('Inline text');
  });

  it('renders div to markdown', () => {
    const node = createElement('div', {}, [createTextNode('Block text')]);
    const markdown = renderToMarkdown(node);
    expect(markdown).toBe('Block text\n');
  });

  it('renders empty p', () => {
    const node = createElement('p', {}, []);
    const markdown = renderToMarkdown(node);
    expect(markdown).toBe('\n');
  });
});

describe('Markdown Renderer - Lists', () => {
  it('renders ul with li children', () => {
    const li1 = createElement('li', {}, [createTextNode('Item 1')]);
    const li2 = createElement('li', {}, [createTextNode('Item 2')]);
    const ul = createElement('ul', {}, [li1, li2]);
    const markdown = renderToMarkdown(ul);
    expect(markdown).toBe('- Item 1\n- Item 2\n');
  });

  it('renders ol with li children', () => {
    const li1 = createElement('li', {}, [createTextNode('First')]);
    const li2 = createElement('li', {}, [createTextNode('Second')]);
    const ol = createElement('ol', {}, [li1, li2]);
    const markdown = renderToMarkdown(ol);
    expect(markdown).toBe('1. First\n2. Second\n');
  });

  it('renders empty ul', () => {
    const ul = createElement('ul', {}, []);
    const markdown = renderToMarkdown(ul);
    expect(markdown).toBe('\n');
  });

  it('renders ul with single item', () => {
    const li = createElement('li', {}, [createTextNode('Only item')]);
    const ul = createElement('ul', {}, [li]);
    const markdown = renderToMarkdown(ul);
    expect(markdown).toBe('- Only item\n');
  });

  it('renders ol with multiple items', () => {
    const items = [1, 2, 3, 4, 5].map(n =>
      createElement('li', {}, [createTextNode(`Item ${n}`)])
    );
    const ol = createElement('ol', {}, items);
    const markdown = renderToMarkdown(ol);
    expect(markdown).toBe('1. Item 1\n2. Item 2\n3. Item 3\n4. Item 4\n5. Item 5\n');
  });
});

describe('Markdown Renderer - Interactive Elements', () => {
  it('renders button without data-action', () => {
    const button = createElement('button', {}, [createTextNode('Click me')]);
    const markdown = renderToMarkdown(button);
    expect(markdown).toBe('[Click me] ');
  });

  it('renders button with data-action', () => {
    const button = createElement('button', { 'data-action': 'submit' }, [createTextNode('Submit')]);
    const markdown = renderToMarkdown(button);
    expect(markdown).toBe('[Submit] ');
  });

  it('renders input with placeholder', () => {
    const input = createElement('input', { placeholder: 'Enter text' }, []);
    const markdown = renderToMarkdown(input);
    expect(markdown).toBe('[Input: Enter text] ');
  });

  it('renders input without placeholder', () => {
    const input = createElement('input', { name: 'email' }, []);
    const markdown = renderToMarkdown(input);
    expect(markdown).toBe('[Input] ');
  });

  it('renders input with type', () => {
    const input = createElement('input', { type: 'password', placeholder: 'Password' }, []);
    const markdown = renderToMarkdown(input);
    expect(markdown).toBe('[Input: Password] ');
  });
});

describe('Markdown Renderer - Nested Elements', () => {
  it('renders nested div with p', () => {
    const p = createElement('p', {}, [createTextNode('Content')]);
    const div = createElement('div', {}, [p]);
    const markdown = renderToMarkdown(div);
    expect(markdown).toBe('Content\n\n');
  });

  it('renders div with multiple p children', () => {
    const p1 = createElement('p', {}, [createTextNode('First')]);
    const p2 = createElement('p', {}, [createTextNode('Second')]);
    const div = createElement('div', {}, [p1, p2]);
    const markdown = renderToMarkdown(div);
    expect(markdown).toBe('First\nSecond\n\n');
  });

  it('renders deeply nested structure', () => {
    const span = createElement('span', {}, [createTextNode('Deep')]);
    const p = createElement('p', {}, [span]);
    const div = createElement('div', {}, [p]);
    const markdown = renderToMarkdown(div);
    expect(markdown).toBe('Deep\n\n');
  });

  it('renders h1 with nested span', () => {
    const span = createElement('span', {}, [createTextNode('Title')]);
    const h1 = createElement('h1', {}, [span]);
    const markdown = renderToMarkdown(h1);
    expect(markdown).toBe('# Title\n');
  });
});

describe('Markdown Renderer - Special Characters', () => {
  it('escapes markdown special characters in text', () => {
    const node = createElement('p', {}, [createTextNode('Text with * and _')]);
    const markdown = renderToMarkdown(node);
    expect(markdown).toBe('Text with \\* and \\_\n');
  });

  it('escapes # in text', () => {
    const node = createElement('p', {}, [createTextNode('Not a # heading')]);
    const markdown = renderToMarkdown(node);
    expect(markdown).toBe('Not a \\# heading\n');
  });

  it('escapes brackets in text', () => {
    const node = createElement('p', {}, [createTextNode('[Not a link]')]);
    const markdown = renderToMarkdown(node);
    expect(markdown).toBe('\\[Not a link\\]\n');
  });

  it('preserves ampersands', () => {
    const node = createElement('p', {}, [createTextNode('A & B')]);
    const markdown = renderToMarkdown(node);
    expect(markdown).toBe('A & B\n');
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
    expect(markdown).toBe('\n');
  });

  it('handles null children', () => {
    const node = createElement('div', {}, [null as any]);
    const markdown = renderToMarkdown(node);
    expect(markdown).toBe('\n');
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
    expect(markdown).toBe('Text\n');
  });

  it('trims trailing whitespace in text', () => {
    const node = createElement('p', {}, [createTextNode('Text  ')]);
    const markdown = renderToMarkdown(node);
    expect(markdown).toBe('Text\n');
  });

  it('preserves single spaces between words', () => {
    const node = createElement('p', {}, [createTextNode('Multiple words here')]);
    const markdown = renderToMarkdown(node);
    expect(markdown).toBe('Multiple words here\n');
  });
});

describe('Markdown Renderer - Table', () => {
  it('renders table with single row', () => {
    const td1 = createElement('td', {}, [createTextNode('A')]);
    const td2 = createElement('td', {}, [createTextNode('B')]);
    const tr = createElement('tr', {}, [td1, td2]);
    const table = createElement('table', {}, [tr]);
    const markdown = renderToMarkdown(table);
    expect(markdown).toBe('| A | B |\n');
  });

  it('renders table with multiple rows', () => {
    const row1 = createElement('tr', {}, [
      createElement('td', {}, [createTextNode('♜')]),
      createElement('td', {}, [createTextNode('♞')]),
      createElement('td', {}, [createTextNode('♝')])
    ]);
    const row2 = createElement('tr', {}, [
      createElement('td', {}, [createTextNode('♟')]),
      createElement('td', {}, [createTextNode('♟')]),
      createElement('td', {}, [createTextNode('♟')])
    ]);
    const table = createElement('table', {}, [row1, row2]);
    const markdown = renderToMarkdown(table);
    expect(markdown).toBe('| ♜ | ♞ | ♝ |\n| ♟ | ♟ | ♟ |\n');
  });

  it('renders empty table', () => {
    const table = createElement('table', {}, []);
    const markdown = renderToMarkdown(table);
    expect(markdown).toBe('\n');
  });

  it('renders table with th elements', () => {
    const row = createElement('tr', {}, [
      createElement('th', {}, [createTextNode('Header 1')]),
      createElement('th', {}, [createTextNode('Header 2')])
    ]);
    const table = createElement('table', {}, [row]);
    const markdown = renderToMarkdown(table);
    expect(markdown).toBe('| Header 1 | Header 2 |\n');
  });
});

describe('Markdown Renderer - Code Blocks', () => {
  it('renders pre element as code block', () => {
    const pre = createElement('pre', {}, [createTextNode('  code with spaces  ')]);
    const markdown = renderToMarkdown(pre);
    expect(markdown).toBe('```\n  code with spaces  \n```\n');
  });

  it('renders code element as code block', () => {
    const code = createElement('code', {}, [createTextNode('const x = 1;')]);
    const markdown = renderToMarkdown(code);
    expect(markdown).toBe('```\nconst x = 1;\n```\n');
  });

  it('renders code block with language', () => {
    const code = createElement('code', { lang: 'javascript' }, [createTextNode('const x = 1;')]);
    const markdown = renderToMarkdown(code);
    expect(markdown).toBe('```javascript\nconst x = 1;\n```\n');
  });

  it('preserves whitespace in pre element', () => {
    const pre = createElement('pre', {}, [createTextNode('  ♜ ♞ ♝\n  ♟ ♟ ♟')]);
    const markdown = renderToMarkdown(pre);
    expect(markdown).toBe('```\n  ♜ ♞ ♝\n  ♟ ♟ ♟\n```\n');
  });

  it('renders empty pre element', () => {
    const pre = createElement('pre', {}, []);
    const markdown = renderToMarkdown(pre);
    expect(markdown).toBe('```\n\n```\n');
  });
});

describe('Markdown Renderer - Special Layout Components', () => {
  it('renders Br element as newline', () => {
    const div = createElement('div', {}, [
      createTextNode('Line 1'),
      createElement('Br', {}, []),
      createTextNode('Line 2')
    ]);
    const markdown = renderToMarkdown(div);
    expect(markdown).toBe('Line 1\nLine 2\n');
  });

  it('renders br element as newline', () => {
    const div = createElement('div', {}, [
      createTextNode('Line 1'),
      createElement('br', {}, []),
      createTextNode('Line 2')
    ]);
    const markdown = renderToMarkdown(div);
    expect(markdown).toBe('Line 1\nLine 2\n');
  });

  it('renders Tab element as 4 spaces', () => {
    const div = createElement('div', {}, [
      createElement('Tab', {}, []),
      createTextNode('Indented')
    ]);
    const markdown = renderToMarkdown(div);
    expect(markdown).toBe('    Indented\n');
  });

  it('renders Space element as single space', () => {
    const div = createElement('div', {}, [
      createTextNode('A'),
      createElement('Space', {}, []),
      createTextNode('B')
    ]);
    const markdown = renderToMarkdown(div);
    expect(markdown).toBe('A B\n');
  });

  it('renders Space element with count', () => {
    const div = createElement('div', {}, [
      createTextNode('A'),
      createElement('Space', { count: 5 }, []),
      createTextNode('B')
    ]);
    const markdown = renderToMarkdown(div);
    expect(markdown).toBe('A     B\n');
  });

  it('renders complex layout with multiple special components', () => {
    const div = createElement('div', {}, [
      createTextNode('Name:'),
      createElement('Space', { count: 2 }, []),
      createTextNode('John'),
      createElement('Br', {}, []),
      createTextNode('Age:'),
      createElement('Space', { count: 3 }, []),
      createTextNode('25')
    ]);
    const markdown = renderToMarkdown(div);
    expect(markdown).toBe('Name:  John\nAge:   25\n');
  });
});
