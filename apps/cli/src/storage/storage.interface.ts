import { InjectionToken } from '@sker/core'

export interface Storage {
  init?(): Promise<void>
  close?(): Promise<void>
  read<T>(key: string): Promise<T | null>
  write<T>(key: string, data: T): Promise<void>
  writeIfVersion?<T extends { version: number }>(
    key: string,
    data: T,
    expectedVersion: number
  ): Promise<boolean>
  delete(key: string): Promise<void>
  exists(key: string): Promise<boolean>
  list(pattern: string): Promise<string[]>
  watch(key: string, callback: (data: any) => void): () => void
  getBaseDir?(): string
}

export const STORAGE_TOKEN = new InjectionToken<Storage>('Storage')
