import { Inject, Injectable } from '@sker/core'
import { STORAGE_TOKEN } from '../storage/storage.interface'
import type { Storage } from '../storage/storage.interface'

export interface AuthSession {
  token: string
  user?: {
    id: string
    email: string
    displayName?: string | null
  }
  updatedAt: number
}

@Injectable({ providedIn: 'auto' })
export class AuthSessionService {
  private readonly STORAGE_KEY = 'auth/session'

  constructor(@Inject(STORAGE_TOKEN) private storage: Storage) {}

  async getSession(): Promise<AuthSession | null> {
    const session = await this.storage.read<AuthSession>(this.STORAGE_KEY)
    if (!session?.token) {
      return null
    }
    return session
  }

  async getToken(): Promise<string | null> {
    const session = await this.getSession()
    return session?.token ?? null
  }

  async setSession(token: string, user?: AuthSession['user']): Promise<void> {
    await this.storage.write<AuthSession>(this.STORAGE_KEY, {
      token,
      user,
      updatedAt: Date.now()
    })
  }

  async clearSession(): Promise<void> {
    await this.storage.delete(this.STORAGE_KEY)
  }
}

