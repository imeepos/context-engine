import { describe, it, expect } from 'vitest';
import { wrapInHtmlPage } from './html-template';

describe('HTML Template', () => {
  it('wraps content in full HTML page', () => {
    const html = wrapInHtmlPage('<h1>Hello</h1>', 'Test');
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html');
    expect(html).toContain('<title>Test</title>');
    expect(html).toContain('<h1>Hello</h1>');
    expect(html).toContain('</html>');
  });

  it('includes Tailwind CSS CDN', () => {
    const html = wrapInHtmlPage('<p>Content</p>');
    expect(html).toContain('tailwindcss');
  });

  it('includes SSE script', () => {
    const html = wrapInHtmlPage('<p>Content</p>');
    expect(html).toContain('EventSource');
  });

  it('includes navigation script', () => {
    const html = wrapInHtmlPage('<p>Content</p>');
    expect(html).toContain('data-navigate');
  });

  it('uses default title when none provided', () => {
    const html = wrapInHtmlPage('<p>Hi</p>');
    expect(html).toContain('<title>Sker CLI</title>');
  });

  it('includes nav menu', () => {
    const html = wrapInHtmlPage('<p>Hi</p>');
    expect(html).toContain('nav');
  });
});
