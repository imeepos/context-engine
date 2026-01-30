# Reconciler Usage

## Overview

The reconciler system provides virtual DOM functionality for rendering React components to markdown and extracting interactive tools.

## Creating VNodes

### Text Nodes

```typescript
import { createTextNode } from '@sker/prompt-renderer';

const textNode = createTextNode('Hello, world!');
// { type: 'TEXT', content: 'Hello, world!' }
```

### Element Nodes

```typescript
import { createElement } from '@sker/prompt-renderer';

const element = createElement(
  'div',
  { className: 'container' },
  [
    createTextNode('Content here')
  ]
);
```

## Rendering to Markdown

### Basic Rendering

```typescript
import { renderToMarkdown } from '@sker/prompt-renderer';

const vnode = createElement('h1', {}, [createTextNode('Title')]);
const markdown = renderToMarkdown(vnode);
// "# Title"
```

### Supported Elements

**Headers**:
```typescript
createElement('h1', {}, [createTextNode('H1')]) // "# H1"
createElement('h2', {}, [createTextNode('H2')]) // "## H2"
createElement('h3', {}, [createTextNode('H3')]) // "### H3"
// h4, h5, h6 also supported
```

**Lists**:
```typescript
// Unordered list
createElement('ul', {}, [
  createElement('li', {}, [createTextNode('Item 1')]),
  createElement('li', {}, [createTextNode('Item 2')])
])
// "- Item 1\n- Item 2"

// Ordered list
createElement('ol', {}, [
  createElement('li', {}, [createTextNode('First')]),
  createElement('li', {}, [createTextNode('Second')])
])
// "1. First\n2. Second"
```

**Interactive Elements**:
```typescript
// Button
createElement('button', {}, [createTextNode('Click Me')])
// "[Click Me]"

// Input
createElement('input', { placeholder: 'Enter name' }, [])
// "[Input: Enter name]"
```

**Containers**:
```typescript
// Paragraph
createElement('p', {}, [createTextNode('Text')])

// Div (multiple children separated by double newlines)
createElement('div', {}, [
  createElement('p', {}, [createTextNode('Para 1')]),
  createElement('p', {}, [createTextNode('Para 2')])
])
// "Para 1\n\nPara 2"

// Span (inline)
createElement('span', {}, [createTextNode('Inline')])
```

## Tool Extraction

### Extracting Tools from VNodes

```typescript
import { extractTools } from '@sker/prompt-renderer';

const vnode = createElement('div', {}, [
  createElement('button', {
    'data-action': 'submit',
    'data-params': { id: 123 }
  }, [createTextNode('Submit')]),

  createElement('input', {
    name: 'username',
    type: 'text',
    placeholder: 'Enter username'
  }, [])
]);

const tools = extractTools(vnode);
// [
//   {
//     name: 'submit',
//     type: 'button',
//     label: 'Submit',
//     params: { id: 123 }
//   },
//   {
//     name: 'username',
//     type: 'input',
//     inputType: 'text',
//     placeholder: 'Enter username'
//   }
// ]
```

### Button Tools

Buttons become tools when they have `data-action` attribute:

```typescript
createElement('button', {
  'data-action': 'refresh',
  'data-params': { force: true }
}, [createTextNode('Refresh')])

// Extracted tool:
// {
//   name: 'refresh',
//   type: 'button',
//   label: 'Refresh',
//   params: { force: true }
// }
```

### Input Tools

Inputs become tools when they have `name` attribute:

```typescript
createElement('input', {
  name: 'email',
  type: 'email',
  placeholder: 'user@example.com'
}, [])

// Extracted tool:
// {
//   name: 'email',
//   type: 'input',
//   inputType: 'email',
//   placeholder: 'user@example.com'
// }
```

## Markdown Escaping

Special markdown characters are automatically escaped in text content:

```typescript
const vnode = createTextNode('Text with *asterisks* and _underscores_');
renderToMarkdown(vnode);
// "Text with \\*asterisks\\* and \\_underscores\\_"
```

Escaped characters: `*`, `_`, `#`, `[`, `]`

## Complete Example

```typescript
import { createElement, createTextNode, renderToMarkdown, extractTools } from '@sker/prompt-renderer';

// Build VNode tree
const vnode = createElement('div', {}, [
  createElement('h1', {}, [createTextNode('Dashboard')]),
  createElement('p', {}, [createTextNode('Welcome to your dashboard')]),
  createElement('button', {
    'data-action': 'refresh',
    'data-params': { timestamp: Date.now() }
  }, [createTextNode('Refresh Data')]),
  createElement('input', {
    name: 'search',
    type: 'text',
    placeholder: 'Search...'
  }, [])
]);

// Render to markdown
const markdown = renderToMarkdown(vnode);
console.log(markdown);
// # Dashboard
//
// Welcome to your dashboard
//
// [Refresh Data]
//
// [Input: Search...]

// Extract tools
const tools = extractTools(vnode);
console.log(tools);
// [
//   { name: 'refresh', type: 'button', label: 'Refresh Data', params: { timestamp: ... } },
//   { name: 'search', type: 'input', inputType: 'text', placeholder: 'Search...' }
// ]
```
