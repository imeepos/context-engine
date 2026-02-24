import { Inject, Injectable } from '@sker/core'
import { AuthSessionService } from './auth-session.service'
import { MARKETPLACE_API_CONFIG } from '../tokens'
import type { MarketplaceApiConfig } from '../tokens'

interface ApiSuccess<T> {
  success: true
  data: T
}

interface ApiFailure {
  success: false
  error?: {
    code?: string
    message?: string
  }
}

type ApiResponse<T> = ApiSuccess<T> | ApiFailure

export class MarketplaceApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string
  ) {
    super(message)
  }
}

@Injectable({ providedIn: 'auto' })
export class MarketplaceApiService {
  constructor(
    @Inject(MARKETPLACE_API_CONFIG) private config: MarketplaceApiConfig,
    private authSessionService: AuthSessionService
  ) {}

  getBaseUrl() {
    return this.config.baseUrl
  }

  async register(input: { email: string; password: string; displayName?: string }) {
    return this.request<{ token: string; user: { id: string; email: string; displayName?: string | null } }>(
      '/auth/register',
      {
        method: 'POST',
        body: JSON.stringify(input)
      }
    )
  }

  async login(input: { email: string; password: string }) {
    const result = await this.request<{ token: string; user: { id: string; email: string; displayName?: string | null } }>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify(input)
      }
    )
    await this.authSessionService.setSession(result.token, result.user)
    return result
  }

  async logout() {
    const result = await this.request<{ loggedOut: boolean }>(
      '/auth/logout',
      {
        method: 'POST'
      },
      true
    )
    await this.authSessionService.clearSession()
    return result
  }

  async listPlugins(query?: Record<string, string | number | boolean>) {
    const qs = query ? this.toQueryString(query) : ''
    const path = qs ? `/plugins?${qs}` : '/plugins'
    return this.request<Record<string, unknown>>(path)
  }

  async listInstalledPlugins() {
    return this.request<Record<string, unknown>[]>('/plugins/installed', undefined, true)
  }

  async listPublishedPlugins() {
    return this.request<Record<string, unknown>[]>('/plugins/published', undefined, true)
  }

  async getPluginDetail(id: string) {
    return this.request<Record<string, unknown>>(`/plugins/${encodeURIComponent(id)}`)
  }

  async installPlugin(id: string, version?: string) {
    const qs = version ? `?version=${encodeURIComponent(version)}` : ''
    return this.request<Record<string, unknown>>(`/plugins/${encodeURIComponent(id)}/install${qs}`, { method: 'POST' }, true)
  }

  async uninstallPlugin(id: string) {
    return this.request<Record<string, unknown> | null>(`/plugins/${encodeURIComponent(id)}/install`, { method: 'DELETE' }, true)
  }

  async updatePlugin(id: string, input: {
    name?: string
    description?: string
    category?: string
    tags?: string[]
    status?: 'active' | 'archived'
  }) {
    return this.request<Record<string, unknown>>(`/plugins/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(input)
    }, true)
  }

  async publishPlugin(input: {
    slug: string
    name: string
    description?: string
    category?: string
    tags?: string[]
    version: string
    sourceCode: string
    schema?: string
    changelog?: string
  }) {
    return this.request<Record<string, unknown>>('/plugins', {
      method: 'POST',
      body: JSON.stringify(input)
    }, true)
  }

  async publishVersion(id: string, input: {
    version: string
    sourceCode: string
    schema?: string
    changelog?: string
  }) {
    return this.request<Record<string, unknown>>(`/plugins/${encodeURIComponent(id)}/versions`, {
      method: 'POST',
      body: JSON.stringify(input)
    }, true)
  }

  private toQueryString(query: Record<string, string | number | boolean>) {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(query)) {
      params.set(key, String(value))
    }
    return params.toString()
  }

  private async request<T>(path: string, init?: RequestInit, requiresAuth = false): Promise<T> {
    const headers = new Headers(init?.headers || {})
    headers.set('content-type', 'application/json')

    if (requiresAuth) {
      const token = await this.authSessionService.getToken()
      if (!token) {
        throw new MarketplaceApiError(401, 'auth.missing_token', 'Authentication required. Please login first.')
      }
      headers.set('authorization', `Bearer ${token}`)
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.config.timeout ?? 30000)

    try {
      const response = await fetch(this.buildUrl(path), {
        ...init,
        headers,
        signal: controller.signal
      })

      const payload = (response.status === 204
        ? ({ success: true, data: null } as ApiSuccess<T>)
        : (await response.json()) as ApiResponse<T>)

      if (!response.ok || payload.success === false) {
        const code = payload.success === false ? (payload.error?.code ?? 'marketplace.request_failed') : 'marketplace.request_failed'
        const message =
          payload.success === false ? (payload.error?.message ?? `Request failed with status ${response.status}`) : `Request failed with status ${response.status}`
        if (response.status === 401 || response.status === 403) {
          await this.authSessionService.clearSession()
        }
        throw new MarketplaceApiError(response.status, code, message)
      }

      return payload.data
    } catch (error) {
      if (error instanceof MarketplaceApiError) {
        throw error
      }
      throw new MarketplaceApiError(500, 'marketplace.network_error', error instanceof Error ? error.message : 'Network request failed')
    } finally {
      clearTimeout(timeout)
    }
  }

  private buildUrl(path: string) {
    return new URL(path, this.ensureSlash(this.config.baseUrl)).toString()
  }

  private ensureSlash(value: string) {
    return value.endsWith('/') ? value : `${value}/`
  }
}
