import { describe, it, expect } from 'vitest';
import { extractTools } from './extractor';
import { createElement, createTextNode } from './dom';

describe('Tool Extractor - Button Elements', () => {
  it('extracts tool from button with data-action', () => {
    const button = createElement('button', { 'data-action': 'submit' }, [createTextNode('Submit')]);
    const tools = extractTools(button);
    expect(tools).toHaveLength(1);
    expect(tools[0].name).toBe('submit');
    expect(tools[0].type).toBe('button');
  });

  it('extracts tool from button with data-action and data-params', () => {
    const params = { id: '123', type: 'user' };
    const button = createElement('button', {
      'data-action': 'delete',
      'data-params': params
    }, [createTextNode('Delete')]);
    const tools = extractTools(button);
    expect(tools).toHaveLength(1);
    expect(tools[0].name).toBe('delete');
    expect(tools[0].params).toEqual(params);
  });

  it('does not extract tool from button without data-action', () => {
    const button = createElement('button', {}, [createTextNode('Click')]);
    const tools = extractTools(button);
    expect(tools).toHaveLength(0);
  });

  it('extracts button label from text content', () => {
    const button = createElement('button', { 'data-action': 'save' }, [createTextNode('Save Changes')]);
    const tools = extractTools(button);
    expect(tools[0].label).toBe('Save Changes');
  });

  it('extracts button with empty label', () => {
    const button = createElement('button', { 'data-action': 'action' }, []);
    const tools = extractTools(button);
    expect(tools[0].label).toBe('');
  });

  it('extracts button with nested text', () => {
    const span = createElement('span', {}, [createTextNode('Nested')]);
    const button = createElement('button', { 'data-action': 'test' }, [span]);
    const tools = extractTools(button);
    expect(tools[0].label).toBe('Nested');
  });
});

describe('Tool Extractor - Input Elements', () => {
  it('extracts tool from input with name', () => {
    const input = createElement('input', { name: 'email' }, []);
    const tools = extractTools(input);
    expect(tools).toHaveLength(1);
    expect(tools[0].name).toBe('email');
    expect(tools[0].type).toBe('input');
  });

  it('extracts tool from input with name and type', () => {
    const input = createElement('input', { name: 'password', type: 'password' }, []);
    const tools = extractTools(input);
    expect(tools).toHaveLength(1);
    expect(tools[0].name).toBe('password');
    expect(tools[0].inputType).toBe('password');
  });

  it('extracts tool from input with placeholder', () => {
    const input = createElement('input', { name: 'username', placeholder: 'Enter username' }, []);
    const tools = extractTools(input);
    expect(tools).toHaveLength(1);
    expect(tools[0].placeholder).toBe('Enter username');
  });

  it('extracts tool from input with all attributes', () => {
    const input = createElement('input', {
      name: 'search',
      type: 'text',
      placeholder: 'Search...'
    }, []);
    const tools = extractTools(input);
    expect(tools).toHaveLength(1);
    expect(tools[0].name).toBe('search');
    expect(tools[0].inputType).toBe('text');
    expect(tools[0].placeholder).toBe('Search...');
  });

  it('does not extract tool from input without name', () => {
    const input = createElement('input', { type: 'text' }, []);
    const tools = extractTools(input);
    expect(tools).toHaveLength(0);
  });

  it('defaults input type to text when not specified', () => {
    const input = createElement('input', { name: 'field' }, []);
    const tools = extractTools(input);
    expect(tools[0].inputType).toBe('text');
  });
});

describe('Tool Extractor - Nested Elements', () => {
  it('extracts tools from nested buttons', () => {
    const button1 = createElement('button', { 'data-action': 'save' }, [createTextNode('Save')]);
    const button2 = createElement('button', { 'data-action': 'cancel' }, [createTextNode('Cancel')]);
    const div = createElement('div', {}, [button1, button2]);
    const tools = extractTools(div);
    expect(tools).toHaveLength(2);
    expect(tools[0].name).toBe('save');
    expect(tools[1].name).toBe('cancel');
  });

  it('extracts tools from nested inputs', () => {
    const input1 = createElement('input', { name: 'email' }, []);
    const input2 = createElement('input', { name: 'password' }, []);
    const form = createElement('div', {}, [input1, input2]);
    const tools = extractTools(form);
    expect(tools).toHaveLength(2);
    expect(tools[0].name).toBe('email');
    expect(tools[1].name).toBe('password');
  });

  it('extracts mixed button and input tools', () => {
    const input = createElement('input', { name: 'username' }, []);
    const button = createElement('button', { 'data-action': 'submit' }, [createTextNode('Submit')]);
    const form = createElement('div', {}, [input, button]);
    const tools = extractTools(form);
    expect(tools).toHaveLength(2);
    expect(tools[0].type).toBe('input');
    expect(tools[1].type).toBe('button');
  });

  it('extracts tools from deeply nested structure', () => {
    const button = createElement('button', { 'data-action': 'deep' }, [createTextNode('Deep')]);
    const p = createElement('p', {}, [button]);
    const div = createElement('div', {}, [p]);
    const tools = extractTools(div);
    expect(tools).toHaveLength(1);
    expect(tools[0].name).toBe('deep');
  });

  it('extracts tools in document order', () => {
    const button1 = createElement('button', { 'data-action': 'first' }, [createTextNode('1')]);
    const button2 = createElement('button', { 'data-action': 'second' }, [createTextNode('2')]);
    const button3 = createElement('button', { 'data-action': 'third' }, [createTextNode('3')]);
    const root = createElement('div', {}, [button1, button2, button3]);
    const tools = extractTools(root);
    expect(tools[0].name).toBe('first');
    expect(tools[1].name).toBe('second');
    expect(tools[2].name).toBe('third');
  });
});

describe('Tool Extractor - Edge Cases', () => {
  it('returns empty array for text node', () => {
    const text = createTextNode('Plain text');
    const tools = extractTools(text);
    expect(tools).toEqual([]);
  });

  it('returns empty array for element with no tools', () => {
    const div = createElement('div', {}, [createTextNode('No tools here')]);
    const tools = extractTools(div);
    expect(tools).toEqual([]);
  });

  it('handles null children gracefully', () => {
    const div = createElement('div', {}, [null as any]);
    const tools = extractTools(div);
    expect(tools).toEqual([]);
  });

  it('handles empty element', () => {
    const div = createElement('div', {}, []);
    const tools = extractTools(div);
    expect(tools).toEqual([]);
  });

  it('extracts tool from button with complex params', () => {
    const params = {
      id: 123,
      nested: { key: 'value' },
      array: [1, 2, 3],
      bool: true
    };
    const button = createElement('button', {
      'data-action': 'complex',
      'data-params': params
    }, [createTextNode('Complex')]);
    const tools = extractTools(button);
    expect(tools[0].params).toEqual(params);
  });

  it('handles button with data-params but no data-action', () => {
    const button = createElement('button', {
      'data-params': { id: '123' }
    }, [createTextNode('No action')]);
    const tools = extractTools(button);
    expect(tools).toHaveLength(0);
  });
});

describe('Tool Extractor - Error Handling', () => {
  it('handles button with invalid data-action type', () => {
    const button = createElement('button', {
      'data-action': 123 as any
    }, [createTextNode('Invalid')]);
    const tools = extractTools(button);
    expect(tools).toHaveLength(0);
  });

  it('handles input with invalid name type', () => {
    const input = createElement('input', {
      name: 123 as any
    }, []);
    const tools = extractTools(input);
    expect(tools).toHaveLength(0);
  });

  it('handles button with empty data-action', () => {
    const button = createElement('button', {
      'data-action': ''
    }, [createTextNode('Empty')]);
    const tools = extractTools(button);
    expect(tools).toHaveLength(0);
  });

  it('handles input with empty name', () => {
    const input = createElement('input', {
      name: ''
    }, []);
    const tools = extractTools(input);
    expect(tools).toHaveLength(0);
  });
});

describe('Tool Extractor - Tool Structure', () => {
  it('creates tool with correct structure for button', () => {
    const button = createElement('button', {
      'data-action': 'test',
      'data-params': { key: 'value' }
    }, [createTextNode('Test')]);
    const tools = extractTools(button);
    const tool = tools[0];
    expect(tool).toHaveProperty('name');
    expect(tool).toHaveProperty('type');
    expect(tool).toHaveProperty('label');
    expect(tool).toHaveProperty('params');
    expect(tool.type).toBe('button');
  });

  it('creates tool with correct structure for input', () => {
    const input = createElement('input', {
      name: 'test',
      type: 'email',
      placeholder: 'Test'
    }, []);
    const tools = extractTools(input);
    const tool = tools[0];
    expect(tool).toHaveProperty('name');
    expect(tool).toHaveProperty('type');
    expect(tool).toHaveProperty('inputType');
    expect(tool).toHaveProperty('placeholder');
    expect(tool.type).toBe('input');
  });

  it('omits undefined params for button without data-params', () => {
    const button = createElement('button', {
      'data-action': 'test'
    }, [createTextNode('Test')]);
    const tools = extractTools(button);
    expect(tools[0].params).toBeUndefined();
  });

  it('omits undefined placeholder for input without placeholder', () => {
    const input = createElement('input', { name: 'test' }, []);
    const tools = extractTools(input);
    expect(tools[0].placeholder).toBeUndefined();
  });
});
