import { describe, expect, it } from 'vitest';
import { createAuth } from './better-auth.config';

describe('createAuth', () => {
  it('should create Better Auth instance with handler and api', () => {
    const auth = createAuth({} as D1Database, {
      baseURL: 'http://localhost',
      secret: 'test-secret-that-is-long-enough-123456',
    });

    expect(typeof auth.handler).toBe('function');
    expect(typeof auth.api.getSession).toBe('function');
  });
});
