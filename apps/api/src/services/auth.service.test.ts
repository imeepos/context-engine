import { describe, expect, it } from 'vitest';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  it('should create @sker/auth middleware and plugin instance', () => {
    const service = new AuthService();

    const middleware = service.createRequireAuthMiddleware();
    const plugin = service.createPlugin();

    expect(typeof middleware).toBe('function');
    expect(plugin.id).toBe('api-auth');
    expect(typeof plugin.endpoints).toBe('object');
  });
});
