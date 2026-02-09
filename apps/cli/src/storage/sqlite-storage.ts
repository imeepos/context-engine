import { Injectable } from '@sker/core'
import type { DatabaseDriver } from '@sker/typeorm'
import { createSqliteDriver, Sqlite } from '@sker/typeorm-sqlite'
import * as fs from 'fs/promises'
import * as os from 'os'
import * as path from 'path'
import { FSWatcher, watch } from 'chokidar'
import type { Storage } from './storage.interface'

@Injectable({ providedIn: 'root' })
export class SqliteStorage implements Storage {
  private readonly baseDir: string
  private readonly dbPath: string
  private readonly sqlite: Sqlite
  private readonly driver: DatabaseDriver
  private readonly pollIntervals = new Map<string, NodeJS.Timeout>()
  private readonly fileWatchers = new Map<string, FSWatcher>()

  constructor(baseDir?: string, dbFileName = 'sker.db') {
    this.baseDir = baseDir || path.join(os.homedir(), '.sker')
    this.dbPath = path.join(this.baseDir, dbFileName)
    this.sqlite = new Sqlite(this.dbPath)
    this.driver = createSqliteDriver(this.sqlite.database)
  }

  async init(): Promise<void> {
    await fs.mkdir(this.baseDir, { recursive: true })
    await fs.mkdir(path.join(this.baseDir, 'messages'), { recursive: true })
    await fs.mkdir(path.join(this.baseDir, 'sessions'), { recursive: true })
    await fs.mkdir(path.join(this.baseDir, 'plugins'), { recursive: true })
    await this.exec(`
      CREATE TABLE IF NOT EXISTS kv_store (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 0,
        updated_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_kv_store_updated_at ON kv_store(updated_at);
    `)
  }

  getBaseDir(): string {
    return this.baseDir
  }

  async read<T>(key: string): Promise<T | null> {
    if (this.isFileBackedKey(key)) {
      return this.readFileBackedKey<T>(key)
    }

    const row = await this.driver
      .prepare('SELECT value FROM kv_store WHERE key = ?')
      .bind(key)
      .first<{ value: string }>()

    if (!row) {
      return null
    }

    try {
      return JSON.parse(row.value) as T
    } catch {
      return null
    }
  }

  async write<T>(key: string, data: T): Promise<void> {
    if (this.isFileBackedKey(key)) {
      await this.writeFileBackedKey(key, data)
      return
    }

    const value = JSON.stringify(data, null, 2)
    const version = this.extractVersion(data)
    const now = Date.now()
    await this.driver
      .prepare(`
        INSERT INTO kv_store (key, value, version, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET
          value = excluded.value,
          version = excluded.version,
          updated_at = excluded.updated_at
      `)
      .bind(key, value, version, now)
      .run()
  }

  async writeIfVersion<T extends { version: number }>(
    key: string,
    data: T,
    expectedVersion: number
  ): Promise<boolean> {
    await this.exec('BEGIN IMMEDIATE')

    try {
      const current = await this.driver
        .prepare('SELECT version FROM kv_store WHERE key = ?')
        .bind(key)
        .first<{ version: number }>()

      if (!current && expectedVersion !== 0) {
        await this.exec('ROLLBACK')
        return false
      }

      if (current && current.version !== expectedVersion) {
        await this.exec('ROLLBACK')
        return false
      }

      const now = Date.now()
      await this.driver
        .prepare(`
          INSERT INTO kv_store (key, value, version, updated_at)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(key) DO UPDATE SET
            value = excluded.value,
            version = excluded.version,
            updated_at = excluded.updated_at
        `)
        .bind(key, JSON.stringify(data, null, 2), data.version, now)
        .run()

      await this.exec('COMMIT')
      return true
    } catch (error) {
      await this.exec('ROLLBACK')
      throw error
    }
  }

  async delete(key: string): Promise<void> {
    if (this.isFileBackedKey(key)) {
      const filePath = this.getFilePath(key)
      try {
        await fs.unlink(filePath)
      } catch (error: any) {
        if (error.code !== 'ENOENT') {
          throw error
        }
      }
      return
    }

    await this.driver.prepare('DELETE FROM kv_store WHERE key = ?').bind(key).run()
  }

  async exists(key: string): Promise<boolean> {
    if (this.isFileBackedKey(key)) {
      try {
        await fs.access(this.getFilePath(key))
        return true
      } catch {
        return false
      }
    }

    const row = await this.driver
      .prepare('SELECT 1 as found FROM kv_store WHERE key = ?')
      .bind(key)
      .first<{ found: number }>()

    return Boolean(row?.found)
  }

  async list(pattern: string): Promise<string[]> {
    const prefix = pattern.replace('*', '')
    const rows = await this.driver
      .prepare('SELECT key FROM kv_store WHERE key LIKE ? ORDER BY key ASC')
      .bind(`${prefix}%`)
      .all<{ key: string }>()
    const normalizedRows = Array.isArray(rows) ? rows : (rows.results || [])
    return normalizedRows.map(item => item.key)
  }

  watch(key: string, callback: (data: any) => void): () => void {
    if (this.isFileBackedKey(key)) {
      return this.watchFileBackedKey(key, callback)
    }

    let lastUpdatedAt = -1
    const interval = setInterval(async () => {
      const row = await this.driver
        .prepare('SELECT updated_at FROM kv_store WHERE key = ?')
        .bind(key)
        .first<{ updated_at: number }>()

      if (!row) {
        if (lastUpdatedAt !== -1) {
          lastUpdatedAt = -1
          callback(null)
        }
        return
      }

      if (row.updated_at !== lastUpdatedAt) {
        lastUpdatedAt = row.updated_at
        const data = await this.read(key)
        callback(data)
      }
    }, 250)

    this.pollIntervals.set(key, interval)

    return () => {
      clearInterval(interval)
      this.pollIntervals.delete(key)
    }
  }

  private watchFileBackedKey(key: string, callback: (data: any) => void): () => void {
    const filePath = this.getFilePath(key)
    const watcher = watch(filePath, {
      persistent: true,
      ignoreInitial: true
    })

    watcher.on('change', async () => {
      callback(await this.readFileBackedKey(key))
    })
    watcher.on('error', () => undefined)
    this.fileWatchers.set(key, watcher)

    return () => {
      watcher.close()
      this.fileWatchers.delete(key)
    }
  }

  private async readFileBackedKey<T>(key: string): Promise<T | null> {
    const filePath = this.getFilePath(key)
    try {
      const content = await fs.readFile(filePath, 'utf-8')
      if (this.isJsonFileKey(key)) {
        return JSON.parse(content) as T
      }
      return content as T
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return null
      }
      if (error instanceof SyntaxError) {
        return null
      }
      throw error
    }
  }

  private async writeFileBackedKey<T>(key: string, data: T): Promise<void> {
    const filePath = this.getFilePath(key)
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    const content = typeof data === 'string'
      ? data
      : JSON.stringify(data, null, 2)
    await fs.writeFile(filePath, content, 'utf-8')
  }

  private getFilePath(key: string): string {
    return path.join(this.baseDir, key)
  }

  private isJsonFileKey(key: string): boolean {
    return key.endsWith('.json')
  }

  private isFileBackedKey(key: string): boolean {
    return /\.[a-zA-Z0-9]+$/.test(path.basename(key))
  }

  private extractVersion<T>(data: T): number {
    if (typeof data === 'object' && data !== null && 'version' in (data as any)) {
      const version = Number((data as any).version)
      if (Number.isFinite(version)) {
        return version
      }
    }
    return 0
  }

  private async exec(sql: string): Promise<void> {
    if (!this.driver.exec) {
      throw new Error('SQLite driver does not support exec()')
    }
    await this.driver.exec(sql)
  }
}
