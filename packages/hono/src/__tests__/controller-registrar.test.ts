import 'reflect-metadata';
import { Body, Controller, Get, Param, Post, Query, RequirePermissions, type Provider } from '@sker/core';
import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { registerSkerControllers } from '../controller-registrar';

@Controller('/hono-test')
class DemoController {
  private providerMap: Map<unknown, unknown>;

  constructor(private providers: Provider[] = []) {
    this.providerMap = new Map(
      providers
        .filter((provider): provider is Provider & { useValue: unknown } => 'useValue' in provider)
        .map((provider) => [provider.provide, provider.useValue])
    );
  }

  @Get('/status')
  status(@Query('trace') trace?: string) {
    return {
      trace: trace ?? null,
      hasBase: this.providerMap.get('BASE') === 'base-provider',
    };
  }

  @Post('/:id')
  @RequirePermissions({ roles: 'user' })
  create(
    @Param('id') id: string,
    @Body(z.object({ name: z.string().min(1) })) body: { name: string }
  ) {
    return {
      id,
      name: body.name,
      hasSession: this.providerMap.get('SESSION') === 'session-provider',
    };
  }

  @Get('/fail')
  fail() {
    throw new Error('boom');
  }
}

function createTestApplication() {
  return {
    getModuleRefByFeature<T>(featureType: new (providers?: Provider[]) => T) {
      return {
        getFeatureFactory<U>(innerFeatureType: new (providers?: Provider[]) => U) {
          return (providers?: Provider[]) => new innerFeatureType(providers);
        },
      };
    },
  };
}

describe('controller-registrar', () => {
  it('registers routes and resolves params through hooks and providers', async () => {
    const app = new Hono();
    registerSkerControllers(app, createTestApplication(), {
      baseProviders: () => [{ provide: 'BASE', useValue: 'base-provider' }],
      beforeInvoke: (_ctx, route) => {
        if (route.permissions) {
          return {
            providers: [{ provide: 'SESSION', useValue: 'session-provider' }],
          };
        }
      },
    });

    const statusResponse = await app.request('http://localhost/hono-test/status?trace=t1');
    expect(statusResponse.status).toBe(200);
    await expect(statusResponse.json()).resolves.toMatchObject({
      success: true,
      data: { trace: 't1', hasBase: true },
    });

    const createResponse = await app.request('http://localhost/hono-test/plugin-1', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ name: 'demo-plugin' }),
    });
    expect(createResponse.status).toBe(200);
    await expect(createResponse.json()).resolves.toMatchObject({
      success: true,
      data: { id: 'plugin-1', name: 'demo-plugin', hasSession: true },
    });
  });

  it('supports beforeInvoke short-circuit response', async () => {
    const app = new Hono();
    registerSkerControllers(app, createTestApplication(), {
      beforeInvoke: (_ctx, route) => {
        if (route.permissions) {
          return new Response(JSON.stringify({ success: false, code: 'UNAUTHORIZED' }), {
            status: 401,
            headers: { 'content-type': 'application/json' },
          });
        }
      },
    });

    const response = await app.request('http://localhost/hono-test/plugin-1', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ name: 'demo-plugin' }),
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ success: false, code: 'UNAUTHORIZED' });
  });

  it('delegates errors to onError callback', async () => {
    const app = new Hono();
    registerSkerControllers(app, createTestApplication(), {
      onError: (error) => {
        return new Response(JSON.stringify({ code: 'HOOK_ERROR', message: String(error) }), {
          status: 418,
          headers: { 'content-type': 'application/json' },
        });
      },
    });

    const response = await app.request('http://localhost/hono-test/fail');

    expect(response.status).toBe(418);
    await expect(response.json()).resolves.toMatchObject({ code: 'HOOK_ERROR' });
  });
});
