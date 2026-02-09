import type { Storage } from './storage.interface'

export class DualStorage implements Storage {
  constructor(
    private readonly primary: Storage,
    private readonly secondary: Storage
  ) {}

  async init(): Promise<void> {
    if (this.primary.init) {
      await this.primary.init()
    }
    if (this.secondary.init) {
      await this.secondary.init()
    }
  }

  getBaseDir(): string {
    return this.primary.getBaseDir?.()
      || this.secondary.getBaseDir?.()
      || ''
  }

  async read<T>(key: string): Promise<T | null> {
    return this.primary.read<T>(key)
  }

  async write<T>(key: string, data: T): Promise<void> {
    await this.primary.write(key, data)
    await this.secondary.write(key, data)
  }

  async writeIfVersion<T extends { version: number }>(
    key: string,
    data: T,
    expectedVersion: number
  ): Promise<boolean> {
    if (!this.primary.writeIfVersion) {
      throw new Error('Primary storage does not support writeIfVersion')
    }

    const primarySuccess = await this.primary.writeIfVersion(key, data, expectedVersion)
    if (!primarySuccess) {
      return false
    }

    if (!this.secondary.writeIfVersion) {
      await this.secondary.write(key, data)
      return true
    }

    const secondarySuccess = await this.secondary.writeIfVersion(key, data, expectedVersion)
    if (!secondarySuccess) {
      console.warn(`[storage-dual] secondary writeIfVersion failed for key=${key}`)
    }

    return true
  }

  async delete(key: string): Promise<void> {
    await this.primary.delete(key)
    await this.secondary.delete(key)
  }

  async exists(key: string): Promise<boolean> {
    return this.primary.exists(key)
  }

  async list(pattern: string): Promise<string[]> {
    return this.primary.list(pattern)
  }

  watch(key: string, callback: (data: any) => void): () => void {
    return this.primary.watch(key, callback)
  }
}
