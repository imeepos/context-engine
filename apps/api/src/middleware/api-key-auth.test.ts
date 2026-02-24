import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createApiKeyAuthMiddleware,
  isValidApiKeyFormat,
  extractApiKey,
  hasApiKeyAuth,
  getApiKeyPayload,
  type ApiKeyPayload,
} from './api-key-auth';

describe('API Key Auth Middleware', () => {
  describe('isValidApiKeyFormat', () => {
    it('should validate correct API key format', () => {
      // sker_ prefix (5 chars) + 32 alphanumeric chars = 37 total
      expect(isValidApiKeyFormat('sker_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')).toBe(true);
      expect(isValidApiKeyFormat('sker_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')).toBe(true);
      expect(isValidApiKeyFormat('sker_12345678901234567890123456789012')).toBe(true);
    });

    it('should reject invalid API key formats', () => {
      // Too short
      expect(isValidApiKeyFormat('sker_short')).toBe(false);
      // Too long
      expect(isValidApiKeyFormat('sker_abcdefghijklmnopqrstuvwxyz1234567')).toBe(false);
      // Missing prefix
      expect(isValidApiKeyFormat('abcdefghijklmnopqrstuvwxyz123456')).toBe(false);
      // Wrong prefix
      expect(isValidApiKeyFormat('api_abcdefghijklmnopqrstuvwxyz123456')).toBe(false);
      // Special characters
      expect(isValidApiKeyFormat('sker_abcdefghijklmnopqrstuvwx!z123456')).toBe(false);
      // Empty
      expect(isValidApiKeyFormat('')).toBe(false);
    });
  });

  describe('extractApiKey', () => {
    it('should extract API key from Authorization header', () => {
      const c = {
        req: {
          header: vi.fn((name: string) => {
            if (name === 'Authorization') {
              return 'Bearer sker_abcdefghijklmnopqrstuvwxyz123456';
            }
            return undefined;
          }),
          query: vi.fn(() => undefined),
        },
      } as any;

      const key = extractApiKey(c);
      expect(key).toBe('sker_abcdefghijklmnopqrstuvwxyz123456');
    });

    it('should extract API key from X-API-Key header', () => {
      const c = {
        req: {
          header: vi.fn((name: string) => {
            if (name === 'X-API-Key') {
              return 'sker_abcdefghijklmnopqrstuvwxyz123456';
            }
            return undefined;
          }),
          query: vi.fn(() => undefined),
        },
      } as any;

      const key = extractApiKey(c);
      expect(key).toBe('sker_abcdefghijklmnopqrstuvwxyz123456');
    });

    it('should extract API key from query parameter', () => {
      const c = {
        req: {
          header: vi.fn(() => undefined),
          query: vi.fn((name: string) => {
            if (name === 'api_key') {
              return 'sker_abcdefghijklmnopqrstuvwxyz123456';
            }
            return undefined;
          }),
        },
      } as any;

      const key = extractApiKey(c);
      expect(key).toBe('sker_abcdefghijklmnopqrstuvwxyz123456');
    });

    it('should prioritize Authorization header over X-API-Key', () => {
      const c = {
        req: {
          header: vi.fn((name: string) => {
            if (name === 'Authorization') {
              return 'Bearer sker_auth123456789012345678901234';
            }
            if (name === 'X-API-Key') {
              return 'sker_header123456789012345678901234';
            }
            return undefined;
          }),
          query: vi.fn(() => undefined),
        },
      } as any;

      const key = extractApiKey(c);
      expect(key).toBe('sker_auth123456789012345678901234');
    });

    it('should return null if no API key provided', () => {
      const c = {
        req: {
          header: vi.fn(() => undefined),
          query: vi.fn(() => undefined),
        },
      } as any;

      const key = extractApiKey(c);
      expect(key).toBeNull();
    });
  });

  describe('hasApiKeyAuth', () => {
    it('should return true if API key payload exists', () => {
      const c = {
        get: vi.fn(() => ({ userId: 'user-123' })),
      } as any;

      expect(hasApiKeyAuth(c)).toBe(true);
    });

    it('should return false if no API key payload', () => {
      const c = {
        get: vi.fn(() => undefined),
      } as any;

      expect(hasApiKeyAuth(c)).toBe(false);
    });
  });

  describe('getApiKeyPayload', () => {
    it('should return API key payload', () => {
      const payload: ApiKeyPayload = {
        id: 'key-1',
        userId: 'user-123',
        name: 'Test Key',
        permissions: ['read'],
        expiresAt: null,
      };

      const c = {
        get: vi.fn(() => payload),
      } as any;

      expect(getApiKeyPayload(c)).toEqual(payload);
    });

    it('should return undefined if no payload', () => {
      const c = {
        get: vi.fn(() => undefined),
      } as any;

      expect(getApiKeyPayload(c)).toBeUndefined();
    });
  });

  describe('createApiKeyAuthMiddleware', () => {
    it('should pass through if no API key provided', async () => {
      const c = {
        req: {
          header: vi.fn(() => undefined),
          query: vi.fn(() => undefined),
        },
        env: {
          DB: {},
        },
        get: vi.fn(),
        set: vi.fn(),
        json: vi.fn((body, status) => ({ body, status })),
      } as any;

      const mockNext = vi.fn(async () => {});
      const middleware = createApiKeyAuthMiddleware(c.env.DB);

      await middleware(c, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 401 for invalid API key format', async () => {
      const c = {
        req: {
          header: vi.fn((name: string) => {
            if (name === 'Authorization') {
              return 'Bearer invalid_key';
            }
            return undefined;
          }),
          query: vi.fn(() => undefined),
        },
        env: {
          DB: {},
        },
        get: vi.fn(),
        set: vi.fn(),
        json: vi.fn((body, status) => ({ body, status })),
      } as any;

      const mockNext = vi.fn(async () => {});
      const middleware = createApiKeyAuthMiddleware(c.env.DB);

      const result = await middleware(c, mockNext);

      expect(result).toEqual({
        body: { error: 'Invalid API key format' },
        status: 401,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
