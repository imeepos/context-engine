import 'reflect-metadata'
import { describe, expect, it, vi } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { HybridToolExecutor } from './HybridToolExecutor'
import { DynamicToolExecutorService } from './DynamicToolExecutorService'
import { MarketplaceApiService } from '../services/marketplace-api.service'
import { AuthSessionService } from '../services/auth-session.service'
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

describe('Marketplace tools (M3 Red)', () => {
  it('should provide all marketplace tool source files', () => {
    const toolDir = path.join(__dirname)
    const expected = [
      'SearchPluginsTool.ts',
      'InstallPluginTool.ts',
      'UninstallPluginTool.ts',
      'UpdatePluginTool.ts',
      'PublishPluginTool.ts',
      'PublishVersionTool.ts'
    ]

    for (const fileName of expected) {
      const filePath = path.join(toolDir, fileName)
      expect(fs.existsSync(filePath), `${fileName} should exist`).toBe(true)
    }
  })

  it('should register marketplace tools as local tools in HybridToolExecutor', () => {
    const executor = new HybridToolExecutor(
      { get: vi.fn() } as any,
      new DynamicToolExecutorService(),
      {
        hasRemoteTool: vi.fn(),
        callRemoteTool: vi.fn()
      } as any,
      {
        isConnected: vi.fn().mockReturnValue(false)
      } as any
    )

    const localTools = (executor as any).localTools as Set<string>

    expect(localTools.has('search-plugins')).toBe(true)
    expect(localTools.has('install-plugin')).toBe(true)
    expect(localTools.has('uninstall-plugin')).toBe(true)
    expect(localTools.has('update-plugin')).toBe(true)
    expect(localTools.has('publish-plugin')).toBe(true)
    expect(localTools.has('publish-version')).toBe(true)
  })

  it('should expose marketplace mutation APIs required by tools', () => {
    const session = new AuthSessionService(new InMemoryStorage())
    const service = new MarketplaceApiService({ baseUrl: 'https://mcp.sker.us' }, session) as any

    expect(typeof service.installPlugin).toBe('function')
    expect(typeof service.uninstallPlugin).toBe('function')
    expect(typeof service.updatePlugin).toBe('function')
    expect(typeof service.publishPlugin).toBe('function')
    expect(typeof service.publishVersion).toBe('function')
  })
})

