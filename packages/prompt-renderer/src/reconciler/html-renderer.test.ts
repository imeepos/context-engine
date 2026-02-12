import { describe, it, expect } from 'vitest';
import { renderToHtml } from './html-renderer';
import { createElement, createTextNode } from './dom';

describe('HTML Renderer - Text Nodes', () => {
  it('renders text node', () => {
    const node = createTextNode('Hello World');
    expect(renderToHtml(node)).toBe('Hello World');
  });

  it('escapes HTML special characters', () => {
    const node = createTextNode('<script>alert("xss")</script>');
    expect(renderToHtml(node)).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
  });

  it('escapes ampersands', () => {
    const node = createTextNode('A & B');
    expect(renderToHtml(node)).toBe('A &amp; B');
  });

  it('renders empty text node', () => {
    const node = createTextNode('');
    expect(renderToHtml(node)).toBe('');
  });
});

describe('HTML Renderer - Headings', () => {
  it('renders h1', () => {
    const node = createElement('h1', {}, [createTextNode('Title')]);
    expect(renderToHtml(node)).toBe('<h1>Title</h1>');
  });

  it('renders h2', () => {
    const node = createElement('h2', {}, [createTextNode('Subtitle')]);
    expect(renderToHtml(node)).toBe('<h2>Subtitle</h2>');
  });

  it('renders h3', () => {
    const node = createElement('h3', {}, [createTextNode('Section')]);
    expect(renderToHtml(node)).toBe('<h3>Section</h3>');
  });

  it('renders h4 through h6', () => {
    expect(renderToHtml(createElement('h4', {}, [createTextNode('H4')]))).toBe('<h4>H4</h4>');
    expect(renderToHtml(createElement('h5', {}, [createTextNode('H5')]))).toBe('<h5>H5</h5>');
    expect(renderToHtml(createElement('h6', {}, [createTextNode('H6')]))).toBe('<h6>H6</h6>');
  });

  it('renders empty heading', () => {
    const node = createElement('h1', {}, []);
    expect(renderToHtml(node)).toBe('<h1></h1>');
  });
});

describe('HTML Renderer - Text Elements', () => {
  it('renders p', () => {
    const node = createElement('p', {}, [createTextNode('Paragraph')]);
    expect(renderToHtml(node)).toBe('<p>Paragraph</p>');
  });

  it('renders span', () => {
    const node = createElement('span', {}, [createTextNode('Inline')]);
    expect(renderToHtml(node)).toBe('<span>Inline</span>');
  });

  it('renders div', () => {
    const node = createElement('div', {}, [createTextNode('Block')]);
    expect(renderToHtml(node)).toBe('<div>Block</div>');
  });

  it('renders strong/b', () => {
    const node = createElement('strong', {}, [createTextNode('Bold')]);
    expect(renderToHtml(node)).toBe('<strong>Bold</strong>');
  });

  it('renders em/i', () => {
    const node = createElement('em', {}, [createTextNode('Italic')]);
    expect(renderToHtml(node)).toBe('<em>Italic</em>');
  });

  it('renders del/s/strike', () => {
    const node = createElement('del', {}, [createTextNode('Deleted')]);
    expect(renderToHtml(node)).toBe('<del>Deleted</del>');
  });
});

describe('HTML Renderer - Lists', () => {
  it('renders ul with li', () => {
    const ul = createElement('ul', {}, [
      createElement('li', {}, [createTextNode('Item 1')]),
      createElement('li', {}, [createTextNode('Item 2')]),
    ]);
    expect(renderToHtml(ul)).toBe(
      '<ul><li>Item 1</li><li>Item 2</li></ul>'
    );
  });

  it('renders ol with li', () => {
    const ol = createElement('ol', {}, [
      createElement('li', {}, [createTextNode('First')]),
      createElement('li', {}, [createTextNode('Second')]),
    ]);
    expect(renderToHtml(ol)).toBe(
      '<ol><li>First</li><li>Second</li></ol>'
    );
  });

  it('renders empty ul', () => {
    const ul = createElement('ul', {}, []);
    expect(renderToHtml(ul)).toBe('<ul></ul>');
  });
});

describe('HTML Renderer - Links', () => {
  it('renders a tag with href', () => {
    const a = createElement('a', { href: '/tasks' }, [
      createTextNode('Tasks'),
    ]);
    expect(renderToHtml(a)).toBe('<a href="/tasks">Tasks</a>');
  });

  it('renders Link component with to prop', () => {
    const link = createElement('Link', { to: '/market' }, [
      createTextNode('Market'),
    ]);
    expect(renderToHtml(link)).toBe(
      '<a href="/market" data-navigate="true">Market</a>'
    );
  });

  it('renders a tag without href', () => {
    const a = createElement('a', {}, [createTextNode('No link')]);
    expect(renderToHtml(a)).toBe('<a>No link</a>');
  });
});

describe('HTML Renderer - Interactive Elements', () => {
  it('renders button', () => {
    const btn = createElement('button', {}, [
      createTextNode('Click me'),
    ]);
    expect(renderToHtml(btn)).toBe(
      '<button>Click me</button>'
    );
  });

  it('renders button with data-action', () => {
    const btn = createElement(
      'button',
      { 'data-action': 'submit' },
      [createTextNode('Submit')]
    );
    expect(renderToHtml(btn)).toBe(
      '<button data-action="submit">Submit</button>'
    );
  });

  it('renders tool as button', () => {
    const tool = createElement(
      'tool',
      { name: 'create_task' },
      [createTextNode('Create Task')]
    );
    expect(renderToHtml(tool)).toBe(
      '<button class="tool-btn" data-tool="create_task">'
      + 'Create Task</button>'
    );
  });

  it('renders input text', () => {
    const input = createElement(
      'input',
      { placeholder: 'Enter text', type: 'text' },
      []
    );
    expect(renderToHtml(input)).toBe(
      '<input type="text" placeholder="Enter text" />'
    );
  });

  it('renders checkbox', () => {
    const cb = createElement(
      'input',
      { type: 'checkbox', checked: true },
      []
    );
    expect(renderToHtml(cb)).toBe(
      '<input type="checkbox" checked />'
    );
  });

  it('renders unchecked checkbox', () => {
    const cb = createElement(
      'input',
      { type: 'checkbox', checked: false },
      []
    );
    expect(renderToHtml(cb)).toBe(
      '<input type="checkbox" />'
    );
  });

  it('renders radio', () => {
    const r = createElement(
      'input',
      { type: 'radio', checked: true },
      []
    );
    expect(renderToHtml(r)).toBe(
      '<input type="radio" checked />'
    );
  });

  it('renders select', () => {
    const sel = createElement(
      'select',
      { value: 'opt1' },
      []
    );
    expect(renderToHtml(sel)).toBe(
      '<select value="opt1"></select>'
    );
  });

  it('renders textarea', () => {
    const ta = createElement(
      'textarea',
      { placeholder: 'Write here' },
      []
    );
    expect(renderToHtml(ta)).toBe(
      '<textarea placeholder="Write here"></textarea>'
    );
  });
});

describe('HTML Renderer - Table', () => {
  it('renders table with rows', () => {
    const row1 = createElement('tr', {}, [
      createElement('td', {}, [createTextNode('A')]),
      createElement('td', {}, [createTextNode('B')]),
    ]);
    const row2 = createElement('tr', {}, [
      createElement('td', {}, [createTextNode('C')]),
      createElement('td', {}, [createTextNode('D')]),
    ]);
    const table = createElement('table', {}, [row1, row2]);
    expect(renderToHtml(table)).toBe(
      '<table><tr><td>A</td><td>B</td></tr>'
      + '<tr><td>C</td><td>D</td></tr></table>'
    );
  });

  it('renders table with th', () => {
    const row = createElement('tr', {}, [
      createElement('th', {}, [createTextNode('Header')]),
    ]);
    const table = createElement('table', {}, [row]);
    expect(renderToHtml(table)).toBe(
      '<table><tr><th>Header</th></tr></table>'
    );
  });

  it('renders empty table', () => {
    const table = createElement('table', {}, []);
    expect(renderToHtml(table)).toBe('<table></table>');
  });
});

describe('HTML Renderer - Code Blocks', () => {
  it('renders pre as code block', () => {
    const pre = createElement('pre', {}, [
      createTextNode('const x = 1;'),
    ]);
    expect(renderToHtml(pre)).toBe(
      '<pre><code>const x = 1;</code></pre>'
    );
  });

  it('renders code element', () => {
    const code = createElement('code', {}, [
      createTextNode('inline code'),
    ]);
    expect(renderToHtml(code)).toBe(
      '<code>inline code</code>'
    );
  });

  it('renders code with language', () => {
    const code = createElement(
      'code',
      { lang: 'typescript' },
      [createTextNode('const x: number = 1;')]
    );
    expect(renderToHtml(code)).toBe(
      '<code class="language-typescript">'
      + 'const x: number = 1;</code>'
    );
  });

  it('renders pre with language', () => {
    const pre = createElement(
      'pre',
      { lang: 'javascript' },
      [createTextNode('let a = 1;')]
    );
    expect(renderToHtml(pre)).toBe(
      '<pre><code class="language-javascript">'
      + 'let a = 1;</code></pre>'
    );
  });

  it('preserves whitespace in pre', () => {
    const pre = createElement('pre', {}, [
      createTextNode('  line1\n  line2'),
    ]);
    expect(renderToHtml(pre)).toBe(
      '<pre><code>  line1\n  line2</code></pre>'
    );
  });
});

describe('HTML Renderer - Layout Components', () => {
  it('renders Br as <br />', () => {
    const br = createElement('Br', {}, []);
    expect(renderToHtml(br)).toBe('<br />');
  });

  it('renders br as <br />', () => {
    const br = createElement('br', {}, []);
    expect(renderToHtml(br)).toBe('<br />');
  });

  it('renders Tab as spaces span', () => {
    const tab = createElement('Tab', {}, []);
    expect(renderToHtml(tab)).toBe(
      '<span class="tab">&nbsp;&nbsp;&nbsp;&nbsp;</span>'
    );
  });

  it('renders Space as nbsp span', () => {
    const space = createElement('Space', {}, []);
    expect(renderToHtml(space)).toBe(
      '<span class="space">&nbsp;</span>'
    );
  });

  it('renders Space with count', () => {
    const space = createElement('Space', { count: 3 }, []);
    expect(renderToHtml(space)).toBe(
      '<span class="space">&nbsp;&nbsp;&nbsp;</span>'
    );
  });
});

describe('HTML Renderer - Nested & Edge Cases', () => {
  it('renders nested div > p > span', () => {
    const span = createElement('span', {}, [
      createTextNode('Deep'),
    ]);
    const p = createElement('p', {}, [span]);
    const div = createElement('div', {}, [p]);
    expect(renderToHtml(div)).toBe(
      '<div><p><span>Deep</span></p></div>'
    );
  });

  it('handles null children', () => {
    const div = createElement('div', {}, [null as any]);
    expect(renderToHtml(div)).toBe('<div></div>');
  });

  it('renders complex document', () => {
    const h1 = createElement('h1', {}, [
      createTextNode('Title'),
    ]);
    const li1 = createElement('li', {}, [
      createTextNode('Item 1'),
    ]);
    const li2 = createElement('li', {}, [
      createTextNode('Item 2'),
    ]);
    const ul = createElement('ul', {}, [li1, li2]);
    const root = createElement('div', {}, [h1, ul]);
    const html = renderToHtml(root);
    expect(html).toContain('<h1>Title</h1>');
    expect(html).toContain('<li>Item 1</li>');
    expect(html).toContain('<li>Item 2</li>');
  });

  it('renders unknown element as div', () => {
    const node = createElement('custom', {}, [
      createTextNode('Content'),
    ]);
    expect(renderToHtml(node)).toBe(
      '<div>Content</div>'
    );
  });

  it('renders checkbox shorthand element', () => {
    const cb = createElement(
      'checkbox', { checked: true }, []
    );
    expect(renderToHtml(cb)).toBe(
      '<input type="checkbox" checked />'
    );
  });

  it('renders radio shorthand element', () => {
    const r = createElement(
      'radio', { checked: false }, []
    );
    expect(renderToHtml(r)).toBe(
      '<input type="radio" />'
    );
  });

  it('renders pre with nested span children', () => {
    const span = createElement('span', {}, [
      createTextNode('nested'),
    ]);
    const pre = createElement('pre', {}, [span]);
    expect(renderToHtml(pre)).toBe(
      '<pre><code>nested</code></pre>'
    );
  });

  it('renders code with nested element children', () => {
    const span = createElement('span', {}, [
      createTextNode('inner'),
    ]);
    const code = createElement('code', {}, [span]);
    expect(renderToHtml(code)).toBe(
      '<code>inner</code>'
    );
  });
});
