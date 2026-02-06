import { describe, expect, it } from 'vitest';
import { METHOD_METADATA, PATH_METADATA, RequestMethod } from '@sker/core';
import { AuthController } from './auth.controller';

describe('AuthController route contract (M1 Red)', () => {
  it('should expose register/login/logout/password routes', () => {
    const proto = AuthController.prototype as unknown as Record<string, unknown>;
    const routes: Array<{ name: string; method: RequestMethod; path: string }> = [
      { name: 'register', method: RequestMethod.POST, path: '/register' },
      { name: 'login', method: RequestMethod.POST, path: '/login' },
      { name: 'logout', method: RequestMethod.POST, path: '/logout' },
      { name: 'updatePassword', method: RequestMethod.PUT, path: '/password' },
    ];

    for (const route of routes) {
      const handler = proto[route.name] as object | undefined;
      expect(typeof handler).toBe('function');
      if (!handler) {
        throw new Error(`Missing route handler: ${route.name}`);
      }
      expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(route.path);
      expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(route.method);
    }
  });
});
