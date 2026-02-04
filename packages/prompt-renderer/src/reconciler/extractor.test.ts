import { describe, it, expect } from 'vitest';
import { extractTools } from './extractor';
import { createElement, createTextNode } from './dom';

describe('Tool Extractor - Button Elements', () => {
  it('extracts tool from button with data-action', () => {
    const button = createElement('button', { 'data-action': 'submit' }, [createTextNode('Submit')]);
    const tools = extractTools(button);
    expect(tools).toHaveLength(1);
    expect(tools[0].name).toBe('submit');
    expect(tools[0].description).toBe('Submit');
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
    expect(tools[0].parameters.properties.params).toBeDefined();
  });

  it('does not extract tool from button without data-action', () => {
    const button = createElement('button', {}, [createTextNode('Click')]);
    const tools = extractTools(button);
    expect(tools).toHaveLength(0);
  });

  it('extracts button label from text content', () => {
    const button = createElement('button', { 'data-action': 'save' }, [createTextNode('Save Changes')]);
    const tools = extractTools(button);
    expect(tools[0].description).toBe('Save Changes');
  });

  it('extracts button with empty label', () => {
    const button = createElement('button', { 'data-action': 'action' }, []);
    const tools = extractTools(button);
    expect(tools[0].description).toBe('');
  });

  it('extracts button with nested text', () => {
    const span = createElement('span', {}, [createTextNode('Nested')]);
    const button = createElement('button', { 'data-action': 'test' }, [span]);
    const tools = extractTools(button);
    expect(tools[0].description).toBe('Nested');
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
    expect(tools[0].parameters.properties.params).toBeDefined();
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

  it('handles button with empty data-action', () => {
    const button = createElement('button', {
      'data-action': ''
    }, [createTextNode('Empty')]);
    const tools = extractTools(button);
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
    expect(tool).toHaveProperty('description');
    expect(tool).toHaveProperty('parameters');
    expect(tool.parameters.type).toBe('object');
  });

  it('omits params property for button without data-params', () => {
    const button = createElement('button', {
      'data-action': 'test'
    }, [createTextNode('Test')]);
    const tools = extractTools(button);
    expect(tools[0].parameters.properties.params).toBeUndefined();
  });
});
