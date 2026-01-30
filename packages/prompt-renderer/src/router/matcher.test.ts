import { describe, it, expect } from 'vitest';
import { matchRoute, compilePattern, rankRoutes } from './matcher';

describe('Route Matcher', () => {
  describe('matchRoute', () => {
    it('matches static route exactly', () => {
      const result = matchRoute('/products', '/products');
      expect(result.matched).toBe(true);
      expect(result.params).toEqual({});
    });

    it('does not match different static routes', () => {
      const result = matchRoute('/products', '/users');
      expect(result.matched).toBe(false);
    });

    it('matches dynamic route with single parameter', () => {
      const result = matchRoute('/products/:id', '/products/123');
      expect(result.matched).toBe(true);
      expect(result.params).toEqual({ id: '123' });
    });

    it('matches dynamic route with multiple parameters', () => {
      const result = matchRoute('/users/:userId/posts/:postId', '/users/42/posts/99');
      expect(result.matched).toBe(true);
      expect(result.params).toEqual({ userId: '42', postId: '99' });
    });

    it('does not match if segment count differs', () => {
      const result = matchRoute('/products/:id', '/products/123/details');
      expect(result.matched).toBe(false);
    });

    it('matches wildcard route', () => {
      const result = matchRoute('/docs/*', '/docs/api/reference');
      expect(result.matched).toBe(true);
      expect(result.wildcard).toBe('api/reference');
    });

    it('matches root wildcard', () => {
      const result = matchRoute('/*', '/any/path/here');
      expect(result.matched).toBe(true);
      expect(result.wildcard).toBe('any/path/here');
    });

    it('handles trailing slashes consistently', () => {
      const result1 = matchRoute('/products/', '/products');
      const result2 = matchRoute('/products', '/products/');
      expect(result1.matched).toBe(true);
      expect(result2.matched).toBe(true);
    });

    it('matches root path', () => {
      const result = matchRoute('/', '/');
      expect(result.matched).toBe(true);
    });

    it('does not match root with other paths', () => {
      const result = matchRoute('/', '/products');
      expect(result.matched).toBe(false);
    });

    it('handles optional parameters', () => {
      const result = matchRoute('/products/:id?', '/products');
      expect(result.matched).toBe(true);
      expect(result.params).toEqual({});
    });

    it('matches optional parameter when provided', () => {
      const result = matchRoute('/products/:id?', '/products/123');
      expect(result.matched).toBe(true);
      expect(result.params).toEqual({ id: '123' });
    });
  });

  describe('compilePattern', () => {
    it('compiles static route to regex', () => {
      const regex = compilePattern('/products');
      expect(regex.test('/products')).toBe(true);
      expect(regex.test('/users')).toBe(false);
    });

    it('compiles dynamic route to regex', () => {
      const regex = compilePattern('/products/:id');
      expect(regex.test('/products/123')).toBe(true);
      expect(regex.test('/products/abc')).toBe(true);
      expect(regex.test('/products')).toBe(false);
    });

    it('compiles wildcard route to regex', () => {
      const regex = compilePattern('/docs/*');
      expect(regex.test('/docs/api')).toBe(true);
      expect(regex.test('/docs/api/reference')).toBe(true);
      expect(regex.test('/products')).toBe(false);
    });

    it('handles multiple dynamic segments', () => {
      const regex = compilePattern('/users/:userId/posts/:postId');
      expect(regex.test('/users/42/posts/99')).toBe(true);
      expect(regex.test('/users/42/posts')).toBe(false);
    });
  });

  describe('rankRoutes', () => {
    it('ranks static routes higher than dynamic', () => {
      const routes = ['/products/:id', '/products/new'];
      const ranked = rankRoutes(routes);
      expect(ranked[0]).toBe('/products/new');
      expect(ranked[1]).toBe('/products/:id');
    });

    it('ranks dynamic routes higher than wildcards', () => {
      const routes = ['/docs/*', '/docs/:page'];
      const ranked = rankRoutes(routes);
      expect(ranked[0]).toBe('/docs/:page');
      expect(ranked[1]).toBe('/docs/*');
    });

    it('ranks by specificity: static > dynamic > wildcard', () => {
      const routes = ['/docs/*', '/docs/:page', '/docs/intro'];
      const ranked = rankRoutes(routes);
      expect(ranked[0]).toBe('/docs/intro');
      expect(ranked[1]).toBe('/docs/:page');
      expect(ranked[2]).toBe('/docs/*');
    });

    it('ranks longer paths higher', () => {
      const routes = ['/docs', '/docs/api', '/docs/api/reference'];
      const ranked = rankRoutes(routes);
      expect(ranked[0]).toBe('/docs/api/reference');
      expect(ranked[2]).toBe('/docs');
    });
  });
});
