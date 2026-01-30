import { describe, it, expect } from 'vitest';
import { createBrowser, ROUTES } from './browser';
import React from 'react';

describe('Page.render() with reconciler integration', () => {
  it('should render React component to markdown using reconciler', () => {
    const TestComponent = () => {
      return React.createElement('div', {}, [
        React.createElement('h1', {}, 'Test Title'),
        React.createElement('p', {}, 'Test content')
      ]);
    };

    const browser = createBrowser([
      {
        provide: ROUTES,
        useValue: [
          { path: '/test', component: TestComponent, params: {} }
        ]
      }
    ]);

    const page = browser.open('prompt:///test');
    const result = page.render();

    expect(result.prompt).toContain('# Test Title');
    expect(result.prompt).toContain('Test content');
    expect(result.prompt).not.toBe('[object Object]');
  });

  it('should extract tools from React component', () => {
    const TestComponent = () => {
      return React.createElement('div', {}, [
        React.createElement('button', { 'data-action': 'submit' }, 'Submit'),
        React.createElement('input', { name: 'email', placeholder: 'Email' }, [])
      ]);
    };

    const browser = createBrowser([
      {
        provide: ROUTES,
        useValue: [
          { path: '/form', component: TestComponent, params: {} }
        ]
      }
    ]);

    const page = browser.open('prompt:///form');
    const result = page.render();

    expect(result.tools).toHaveLength(2);
    expect(result.tools[0]).toMatchObject({
      name: 'submit',
      type: 'button',
      label: 'Submit'
    });
    expect(result.tools[1]).toMatchObject({
      name: 'email',
      type: 'input',
      placeholder: 'Email'
    });
  });

  it('should handle nested React components', () => {
    const TestComponent = () => {
      return React.createElement('div', {}, [
        React.createElement('ul', {}, [
          React.createElement('li', {}, 'Item 1'),
          React.createElement('li', {}, 'Item 2')
        ])
      ]);
    };

    const browser = createBrowser([
      {
        provide: ROUTES,
        useValue: [
          { path: '/list', component: TestComponent, params: {} }
        ]
      }
    ]);

    const page = browser.open('prompt:///list');
    const result = page.render();

    expect(result.prompt).toContain('- Item 1');
    expect(result.prompt).toContain('- Item 2');
  });
});
