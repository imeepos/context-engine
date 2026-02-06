import { describe, expect, it, vi } from 'vitest';
import { AuthController } from './auth.controller';
import { AuthError, AuthService } from '../services/auth.service';

describe('AuthController', () => {
  it('should return 201 on successful register', async () => {
    const service = {
      register: vi.fn().mockResolvedValue({ token: 'token-1', user: { id: 'u1', email: 'a@b.com', displayName: null } }),
      login: vi.fn(),
      logout: vi.fn(),
      updatePassword: vi.fn(),
    } as unknown as AuthService;

    const controller = new AuthController(service, new Request('http://localhost/auth/register'));
    const response = await controller.register({ email: 'a@b.com', password: 'password123' });
    const payload = await response.json<{ success: boolean }>();

    expect(response.status).toBe(201);
    expect(payload.success).toBe(true);
  });

  it('should return 401 when login credentials are invalid', async () => {
    const service = {
      register: vi.fn(),
      login: vi.fn().mockRejectedValue(new AuthError(401, 'auth.invalid_credentials', 'Invalid email or password')),
      logout: vi.fn(),
      updatePassword: vi.fn(),
    } as unknown as AuthService;

    const controller = new AuthController(service, new Request('http://localhost/auth/login'));
    const response = await controller.login({ email: 'a@b.com', password: 'wrong' });

    expect(response.status).toBe(401);
  });

  it('should return 401 when logout is called without bearer token', async () => {
    const service = {
      register: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
      updatePassword: vi.fn(),
    } as unknown as AuthService;

    const controller = new AuthController(service, new Request('http://localhost/auth/logout'));
    const response = await controller.logout();

    expect(response.status).toBe(401);
  });
});
