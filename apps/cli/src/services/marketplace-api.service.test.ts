import 'reflect-metadata'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MarketplaceApiService, MarketplaceApiError } from './marketplace-api.service'
import { AuthSessionService } from './auth-session.service'
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

describe('MarketplaceApiService', () => {
  let authSessionService: AuthSessionService
  let service: MarketplaceApiService

  beforeEach(() => {
    const storage = new InMemoryStorage()
    authSessionService = new AuthSessionService(storage)
    service = new MarketplaceApiService(
      { baseUrl: 'https://mcp.sker.us', timeout: 5000 },
      authSessionService
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('uses https://mcp.sker.us as configured baseUrl', () => {
    expect(service.getBaseUrl()).toBe('https://mcp.sker.us')
  })

  it('throws auth error for protected endpoint when token is missing', async () => {
    await expect(service.listInstalledPlugins()).rejects.toMatchObject({
      status: 401,
      code: 'auth.missing_token'
    })
  })

  it('injects bearer token for protected endpoint requests', async () => {
    await authSessionService.setSession('token-abc', { id: 'u1', email: 'u1@example.com' })

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      })
    )

    await service.listInstalledPlugins()

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [, init] = fetchSpy.mock.calls[0]
    const headers = new Headers((init as RequestInit).headers)
    expect(headers.get('authorization')).toBe('Bearer token-abc')
  })

  it('persists session after login', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            token: 'token-after-login',
            user: {
              id: 'u-login',
              email: 'login@example.com',
              displayName: 'Login User'
            }
          }
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    await service.login({ email: 'login@example.com', password: 'password-123' })

    await expect(authSessionService.getToken()).resolves.toBe('token-after-login')
  })

  it('clears session on 401 response', async () => {
    await authSessionService.setSession('token-expired', { id: 'u2', email: 'u2@example.com' })

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'auth.invalid_session',
            message: 'Invalid session'
          }
        }),
        { status: 401, headers: { 'content-type': 'application/json' } }
      )
    )

    await expect(service.listInstalledPlugins()).rejects.toBeInstanceOf(MarketplaceApiError)
    await expect(authSessionService.getToken()).resolves.toBeNull()
  })
})

