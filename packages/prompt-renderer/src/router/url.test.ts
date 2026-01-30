import { describe, it, expect } from 'vitest';
import { parseUrl, buildUrl, extractParams } from './url';

describe('URL Parser', () => {
  describe('parseUrl', () => {
    it('parses pathname correctly', () => {
      const result = parseUrl('/products/123');
      expect(result.pathname).toBe('/products/123');
    });

    it('parses query parameters correctly', () => {
      const result = parseUrl('/products?color=red&size=large');
      expect(result.query).toEqual({ color: 'red', size: 'large' });
    });

    it('parses pathname with query parameters', () => {
      const result = parseUrl('/products/123?color=red');
      expect(result.pathname).toBe('/products/123');
      expect(result.query).toEqual({ color: 'red' });
    });

    it('handles empty query string', () => {
      const result = parseUrl('/products/123?');
      expect(result.pathname).toBe('/products/123');
      expect(result.query).toEqual({});
    });

    it('handles root path', () => {
      const result = parseUrl('/');
      expect(result.pathname).toBe('/');
      expect(result.query).toEqual({});
    });

    it('handles multiple query parameters with same key', () => {
      const result = parseUrl('/search?tag=react&tag=typescript');
      expect(result.query.tag).toEqual(['react', 'typescript']);
    });

    it('decodes URL-encoded characters in pathname', () => {
      const result = parseUrl('/products/hello%20world');
      expect(result.pathname).toBe('/products/hello world');
    });

    it('decodes URL-encoded characters in query values', () => {
      const result = parseUrl('/search?q=hello%20world');
      expect(result.query.q).toBe('hello world');
    });

    it('handles hash fragments', () => {
      const result = parseUrl('/products/123#reviews');
      expect(result.pathname).toBe('/products/123');
      expect(result.hash).toBe('#reviews');
    });

    it('throws error for invalid URL format', () => {
      expect(() => parseUrl('not-a-valid-url')).toThrow();
    });

    it('throws error for empty string', () => {
      expect(() => parseUrl('')).toThrow();
    });
  });

  describe('buildUrl', () => {
    it('builds URL from pathname', () => {
      const url = buildUrl({ pathname: '/products/123' });
      expect(url).toBe('/products/123');
    });

    it('builds URL with query parameters', () => {
      const url = buildUrl({
        pathname: '/products',
        query: { color: 'red', size: 'large' }
      });
      expect(url).toBe('/products?color=red&size=large');
    });

    it('builds URL with hash', () => {
      const url = buildUrl({
        pathname: '/products/123',
        hash: '#reviews'
      });
      expect(url).toBe('/products/123#reviews');
    });

    it('encodes special characters in query values', () => {
      const url = buildUrl({
        pathname: '/search',
        query: { q: 'hello world' }
      });
      expect(url).toBe('/search?q=hello%20world');
    });

    it('handles array query parameters', () => {
      const url = buildUrl({
        pathname: '/search',
        query: { tag: ['react', 'typescript'] }
      });
      expect(url).toBe('/search?tag=react&tag=typescript');
    });

    it('handles empty query object', () => {
      const url = buildUrl({
        pathname: '/products',
        query: {}
      });
      expect(url).toBe('/products');
    });
  });

  describe('extractParams', () => {
    it('extracts single dynamic parameter', () => {
      const params = extractParams('/products/:id', '/products/123');
      expect(params).toEqual({ id: '123' });
    });

    it('extracts multiple dynamic parameters', () => {
      const params = extractParams('/users/:userId/posts/:postId', '/users/42/posts/99');
      expect(params).toEqual({ userId: '42', postId: '99' });
    });

    it('returns empty object for static route', () => {
      const params = extractParams('/products', '/products');
      expect(params).toEqual({});
    });

    it('returns null for non-matching route', () => {
      const params = extractParams('/products/:id', '/users/123');
      expect(params).toBeNull();
    });

    it('handles trailing slashes', () => {
      const params = extractParams('/products/:id/', '/products/123/');
      expect(params).toEqual({ id: '123' });
    });
  });
});
