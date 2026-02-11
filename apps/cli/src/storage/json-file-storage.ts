import { Injectable } from '@sker/core'
import { Storage } from './storage.interface'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'
import { watch, FSWatcher } from 'chokidar'

@Injectable({ providedIn: 'root' })
export class JsonFileStorage implements Storage {
  private baseDir: string
  private watchers = new Map<string, FSWatcher>()

  constructor(baseDir?: string) {
    this.baseDir = baseDir || path.join(os.homedir(), '.sker')
  }

  async init(): Promise<void> {
    await fs.mkdir(this.baseDir, { recursive: true })
    await fs.mkdir(path.join(this.baseDir, 'messages'), { recursive: true })
    await fs.mkdir(path.join(this.baseDir, 'sessions'), { recursive: true })
  }

  getBaseDir(): string {
    return this.baseDir
  }

  async read<T>(key: string): Promise<T | null> {
    const filePath = this.getFilePath(key)
    try {
      const content = await fs.readFile(filePath, 'utf-8')
      if (!content.trim()) return null
      return JSON.parse(content)
    } catch (error: any) {
      if (error.code === 'ENOENT') return null
      if (error instanceof SyntaxError) return null
      throw error
    }
  }

  async write<T>(key: string, data: T): Promise<void> {
    const filePath = this.getFilePath(key)
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
  }

  async writeIfVersion<T extends { version: number }>(
    key: string,
    data: T,
    expectedVersion: number
  ): Promise<boolean> {
    const filePath = this.getFilePath(key)
    const lockPath = `${filePath}.lock`
    await fs.mkdir(path.dirname(filePath), { recursive: true })

    try {
      await fs.writeFile(lockPath, '', { flag: 'wx' })
    } catch (error: any) {
      if (error.code === 'EEXIST') {
        return false
      }
      throw error
    }

    try {
      const current = await this.read<T>(key)
      if (current && current.version !== expectedVersion) {
        return false
      }
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
      return true
    } catch (error: any) {
      if (error.code === 'ENOENT' && expectedVersion === 0) {
        await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
        return true
      }
      throw error
    } finally {
      try {
        await fs.unlink(lockPath)
      } catch {
        // Ignore unlock errors
      }
    }
  }

  async delete(key: string): Promise<void> {
    const filePath = this.getFilePath(key)
    try {
      await fs.unlink(filePath)
    } catch (error: any) {
      if (error.code !== 'ENOENT') throw error
    }
  }

  async exists(key: string): Promise<boolean> {
    const filePath = this.getFilePath(key)
    try {
      await fs.access(filePath)
      return true
    } catch {
      return false
    }
  }

  async list(pattern: string): Promise<string[]> {
    const dir = path.dirname(this.getFilePath(pattern))
    try {
      const files = await fs.readdir(dir)
      return files.filter(f => f.endsWith('.json'))
    } catch {
      return []
    }
  }

  watch(key: string, callback: (data: any) => void): () => void {
    const filePath = this.getFilePath(key)

    const watcher = watch(filePath, {
      persistent: true,
      ignoreInitial: true
    })

    watcher.on('change', async () => {
      const data = await this.read(key)
      callback(data)
    })

    // Ignore transient watcher errors when temporary test directories are removed.
    watcher.on('error', (_error) => undefined)

    this.watchers.set(key, watcher)

    return () => {
      watcher.close()
      this.watchers.delete(key)
    }
  }

  private getFilePath(key: string): string {
    return path.join(this.baseDir, `${key}.json`)
  }
}
