import { InjectionToken } from '@sker/core'

export interface Storage {
  read<T>(key: string): Promise<T | null>
  write<T>(key: string, data: T): Promise<void>
  delete(key: string): Promise<void>
  exists(key: string): Promise<boolean>
  list(pattern: string): Promise<string[]>
  watch(key: string, callback: (data: any) => void): () => void
}

export const STORAGE_TOKEN = new InjectionToken<Storage>('Storage')
