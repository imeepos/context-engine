import 'reflect-metadata'
import { describe, it, expect, beforeEach } from 'vitest'
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

describe('AuthSessionService', () => {
  let storage: InMemoryStorage
  let service: AuthSessionService

  beforeEach(() => {
    storage = new InMemoryStorage()
    service = new AuthSessionService(storage)
  })

  it('returns null when no session exists', async () => {
    await expect(service.getToken()).resolves.toBeNull()
    await expect(service.getSession()).resolves.toBeNull()
  })

  it('stores and retrieves auth session token', async () => {
    await service.setSession('token-1', { id: 'u1', email: 'a@example.com', displayName: 'A' })

    const token = await service.getToken()
    const session = await service.getSession()

    expect(token).toBe('token-1')
    expect(session?.user?.email).toBe('a@example.com')
    expect(typeof session?.updatedAt).toBe('number')
  })

  it('clears stored session', async () => {
    await service.setSession('token-2', { id: 'u2', email: 'b@example.com' })
    await service.clearSession()

    await expect(service.getToken()).resolves.toBeNull()
  })
})

