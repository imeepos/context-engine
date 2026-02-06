import 'reflect-metadata'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthSessionService } from './auth-session.service'
import { MarketplaceApiService } from './marketplace-api.service'
import type { Storage } from '../storage/storage.interface'

class InMemoryStorage implements Storage {
  private data = new Map<string, unknown>()

  async read<T>(key: string): Promise<T | null> {
    return (this.data.get(key) as T) ?? null
  }
  async write<T>(key: string, value: T): Promise<void> {
    this.data.set(key, value)
  }
  async delete(key: string): Promise<void> {
    this.data.delete(key)
  }
  async exists(key: string): Promise<boolean> {
    return this.data.has(key)
  }
  async list(_pattern: string): Promise<string[]> {
    return []
  }
  watch(_key: string, _callback: (data: any) => void): () => void {
    return () => undefined
  }
}

describe('Marketplace workflow e2e (mocked HTTP)', () => {
  const authHeaders: string[] = []
  let service: MarketplaceApiService

  beforeEach(() => {
    authHeaders.length = 0
    const session = new AuthSessionService(new InMemoryStorage())
    service = new MarketplaceApiService({ baseUrl: 'https://mcp.sker.us', timeout: 5000 }, session)

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
      const requestUrl = typeof input === 'string' ? input : input.toString()
      const { pathname } = new URL(requestUrl)
      const method = (init?.method ?? 'GET').toUpperCase()
      const headers = new Headers(init?.headers)
      const auth = headers.get('authorization')
      if (auth) authHeaders.push(auth)

      if (pathname === '/auth/login' && method === 'POST') {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              token: 'token-workflow',
              user: { id: 'u1', email: 'u1@example.com', displayName: 'u1' }
            }
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        )
      }

      if (pathname === '/plugins' && method === 'POST') {
        return new Response(JSON.stringify({ success: true, data: { id: 'plugin-1', version: '1.0.0' } }), {
          status: 201,
          headers: { 'content-type': 'application/json' }
        })
      }

      if (pathname === '/plugins' && method === 'GET') {
        return new Response(JSON.stringify({ success: true, data: { items: [{ id: 'plugin-1', name: 'Plugin One' }], total: 1 } }), {
          status: 200,
          headers: { 'content-type': 'application/json' }
        })
      }

      if (pathname === '/plugins/plugin-1/install' && method === 'POST') {
        return new Response(JSON.stringify({ success: true, data: { pluginId: 'plugin-1', installedVersion: '1.0.0' } }), {
          status: 200,
          headers: { 'content-type': 'application/json' }
        })
      }

      if (pathname === '/plugins/plugin-1/install' && method === 'DELETE') {
        return new Response(JSON.stringify({ success: true, data: { pluginId: 'plugin-1', removed: true } }), {
          status: 200,
          headers: { 'content-type': 'application/json' }
        })
      }

      return new Response(
        JSON.stringify({ success: false, error: { code: 'not_implemented', message: `${method} ${pathname}` } }),
        { status: 501, headers: { 'content-type': 'application/json' } }
      )
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('runs login -> publish -> search -> install -> uninstall flow', async () => {
    const login = await service.login({ email: 'u1@example.com', password: 'password-123' })
    expect(login.user.id).toBe('u1')

    const publish = await service.publishPlugin({
      slug: 'plugin-one',
      name: 'Plugin One',
      version: '1.0.0',
      sourceCode: 'export const plugin = true'
    })
    expect(publish.id).toBe('plugin-1')

    const search = await service.listPlugins({ q: 'Plugin' })
    expect((search as any).items).toHaveLength(1)

    const install = await service.installPlugin('plugin-1')
    expect(install.installedVersion).toBe('1.0.0')

    const uninstall = await service.uninstallPlugin('plugin-1')
    expect(uninstall?.removed).toBe(true)

    expect(authHeaders).toContain('Bearer token-workflow')
  })
})
