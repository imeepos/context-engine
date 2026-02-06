import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('cloudflare:workers', () => {
  class MockDurableObject {
    protected ctx: any;
    constructor(state: any) {
      this.ctx = state;
    }
  }
  return { DurableObject: MockDurableObject };
});

describe('Worker entry integration', () => {
  let worker: { fetch: (request: Request, env: Env, ctx: ExecutionContext) => Promise<Response> };

  beforeAll(async () => {
    const mod = await import('./index.js');
    worker = mod.default as unknown as typeof worker;
  });

  it('should return health payload from /health', async () => {
    const env = {
      DB: {} as D1Database,
      SITE_URL: 'http://localhost',
      BETTER_AUTH_SECRET: 'test-secret-that-is-long-enough-123456',
      MCP_SESSION: {
        idFromName: () => ({ toString: () => 'session-1' }),
        get: () => ({ fetch: async () => new Response('mcp-stub', { status: 200 }) }),
      },
    } as unknown as Env;

    const response = await worker.fetch(
      new Request('http://localhost/health'),
      env,
      {} as ExecutionContext
    );

    expect(response.status).toBe(200);
    const body = await response.json<{ status: string }>();
    expect(body.status).toBe('ok');
  });

  it('should resolve controller route /plugins/status', async () => {
    const env = {
      DB: {} as D1Database,
      SITE_URL: 'http://localhost',
      BETTER_AUTH_SECRET: 'test-secret-that-is-long-enough-123456',
      MCP_SESSION: {
        idFromName: () => ({ toString: () => 'session-1' }),
        get: () => ({ fetch: async () => new Response('mcp-stub', { status: 200 }) }),
      },
    } as unknown as Env;

    const response = await worker.fetch(
      new Request('http://localhost/plugins/status'),
      env,
      {} as ExecutionContext
    );

    expect(response.status).toBe(200);
    const body = await response.json<{ success: boolean; data: { status: string } }>();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('ready');
  });

  it('should reject protected marketplace route without bearer token', async () => {
    const env = {
      DB: {} as D1Database,
      SITE_URL: 'http://localhost',
      BETTER_AUTH_SECRET: 'test-secret-that-is-long-enough-123456',
      MCP_SESSION: {
        idFromName: () => ({ toString: () => 'session-1' }),
        get: () => ({ fetch: async () => new Response('mcp-stub', { status: 200 }) }),
      },
    } as unknown as Env;

    const response = await worker.fetch(
      new Request('http://localhost/plugins/installed'),
      env,
      {} as ExecutionContext
    );

    expect(response.status).toBe(401);
    const body = await response.json<{ success: boolean; error: { code: string } }>();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('should expose Better Auth route on /api/auth/get-session', async () => {
    const env = {
      DB: {} as D1Database,
      SITE_URL: 'http://localhost',
      BETTER_AUTH_SECRET: 'test-secret-that-is-long-enough-123456',
      MCP_SESSION: {
        idFromName: () => ({ toString: () => 'session-1' }),
        get: () => ({ fetch: async () => new Response('mcp-stub', { status: 200 }) }),
      },
    } as unknown as Env;

    const response = await worker.fetch(
      new Request('http://localhost/api/auth/get-session'),
      env,
      {} as ExecutionContext
    );

    expect(response.status).not.toBe(404);
  });
});
