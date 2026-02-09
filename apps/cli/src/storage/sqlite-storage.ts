import { Injectable } from '@sker/core'
import type { DatabaseDriver } from '@sker/typeorm'
import { createSqliteDriver, Sqlite } from '@sker/typeorm-sqlite'
import * as fs from 'fs/promises'
import * as os from 'os'
import * as path from 'path'
import { FSWatcher, watch } from 'chokidar'
import type { Storage } from './storage.interface'
import type { AgentRegistry } from '../types/agent'
import type { Task, TaskRegistry } from '../types/task'
import { InitStorageSchema1700000000000 } from './migrations/1700000000000-InitStorageSchemaMigration'
import { StorageMigrationExecutor } from './migrations/executor'

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
    await this.runMigrations()
  }

  async close(): Promise<void> {
    for (const interval of this.pollIntervals.values()) {
      clearInterval(interval)
    }
    this.pollIntervals.clear()

    for (const watcher of this.fileWatchers.values()) {
      await watcher.close()
    }
    this.fileWatchers.clear()

    if (this.driver.close) {
      await this.driver.close()
    }
  }

  getBaseDir(): string {
    return this.baseDir
  }

  async read<T>(key: string): Promise<T | null> {
    if (this.isFileBackedKey(key)) {
      return this.readFileBackedKey<T>(key)
    }
    if (key === 'agents') {
      return await this.readAgentsRegistry() as T
    }
    if (key === 'tasks') {
      return await this.readTaskRegistry() as T
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
    if (key === 'agents') {
      await this.writeAgentsRegistry(data as AgentRegistry)
      return
    }
    if (key === 'tasks') {
      await this.writeTaskRegistry(data as TaskRegistry)
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
    if (key === 'tasks') {
      return this.writeTaskRegistryIfVersion(data as unknown as TaskRegistry, expectedVersion)
    }

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
    if (key === 'agents') {
      await this.exec('BEGIN IMMEDIATE')
      try {
        await this.driver.prepare('DELETE FROM agents').bind().run()
        await this.driver.prepare('DELETE FROM agent_state').bind().run()
        await this.touchStructuredKey('agents')
        await this.exec('COMMIT')
        return
      } catch (error) {
        await this.exec('ROLLBACK')
        throw error
      }
    }
    if (key === 'tasks') {
      await this.exec('BEGIN IMMEDIATE')
      try {
        await this.driver.prepare('DELETE FROM task_dependencies').bind().run()
        await this.driver.prepare('DELETE FROM tasks').bind().run()
        await this.driver.prepare('DELETE FROM task_state').bind().run()
        await this.touchStructuredKey('tasks')
        await this.exec('COMMIT')
        return
      } catch (error) {
        await this.exec('ROLLBACK')
        throw error
      }
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
    if (key === 'agents') {
      const row = await this.driver
        .prepare('SELECT 1 as found FROM agents LIMIT 1')
        .bind()
        .first<{ found: number }>()
      return Boolean(row?.found)
    }
    if (key === 'tasks') {
      const row = await this.driver
        .prepare('SELECT 1 as found FROM tasks LIMIT 1')
        .bind()
        .first<{ found: number }>()
      return Boolean(row?.found)
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
    const keys = normalizedRows.map(item => item.key)
    if ('agents'.startsWith(prefix)) {
      keys.push('agents')
    }
    if ('tasks'.startsWith(prefix)) {
      keys.push('tasks')
    }
    return Array.from(new Set(keys)).sort()
  }

  watch(key: string, callback: (data: any) => void): () => void {
    if (this.isFileBackedKey(key)) {
      return this.watchFileBackedKey(key, callback)
    }
    if (key === 'agents' || key === 'tasks') {
      return this.watchStructuredKey(key, callback)
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

  private watchStructuredKey(key: 'agents' | 'tasks', callback: (data: any) => void): () => void {
    let lastUpdatedAt = -1
    const interval = setInterval(async () => {
      const row = await this.driver
        .prepare('SELECT updated_at FROM state_meta WHERE key = ?')
        .bind(key)
        .first<{ updated_at: number }>()

      const nextUpdatedAt = row?.updated_at ?? -1
      if (nextUpdatedAt === lastUpdatedAt) {
        return
      }

      lastUpdatedAt = nextUpdatedAt
      callback(await this.read(key))
    }, 250)

    this.pollIntervals.set(`structured:${key}`, interval)
    return () => {
      clearInterval(interval)
      this.pollIntervals.delete(`structured:${key}`)
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

  private async readAgentsRegistry(): Promise<AgentRegistry> {
    const rowsRaw = await this.driver
      .prepare('SELECT id, pid, start_time, last_heartbeat, status FROM agents')
      .bind()
      .all<{
        id: string
        pid: number
        start_time: number
        last_heartbeat: number
        status: 'online' | 'offline'
      }>()
    const rows = Array.isArray(rowsRaw) ? rowsRaw : (rowsRaw.results || [])

    const state = await this.driver
      .prepare('SELECT next_id FROM agent_state WHERE id = 1')
      .bind()
      .first<{ next_id: number }>()

    const registry: AgentRegistry = {
      agents: {},
      nextId: state?.next_id ?? 0
    }

    for (const row of rows) {
      registry.agents[row.id] = {
        id: row.id,
        pid: row.pid,
        startTime: row.start_time,
        lastHeartbeat: row.last_heartbeat,
        status: row.status
      }
    }

    return registry
  }

  private async readTaskRegistry(): Promise<TaskRegistry> {
    const taskRowsRaw = await this.driver
      .prepare(`
        SELECT id, parent_id, title, description, version, status, assigned_to, created_by,
               created_at, updated_at, claimed_at, completed_at, metadata
        FROM tasks
      `)
      .bind()
      .all<{
        id: string
        parent_id: string | null
        title: string
        description: string
        version: number
        status: Task['status']
        assigned_to: string | null
        created_by: string
        created_at: number
        updated_at: number
        claimed_at: number | null
        completed_at: number | null
        metadata: string
      }>()
    const taskRows = Array.isArray(taskRowsRaw) ? taskRowsRaw : (taskRowsRaw.results || [])

    const depRowsRaw = await this.driver
      .prepare('SELECT task_id, dependency_id FROM task_dependencies')
      .bind()
      .all<{ task_id: string; dependency_id: string }>()
    const depRows = Array.isArray(depRowsRaw) ? depRowsRaw : (depRowsRaw.results || [])

    const state = await this.driver
      .prepare('SELECT version FROM task_state WHERE id = 1')
      .bind()
      .first<{ version: number }>()

    const dependencyMap = new Map<string, string[]>()
    for (const row of depRows) {
      const deps = dependencyMap.get(row.task_id) || []
      deps.push(row.dependency_id)
      dependencyMap.set(row.task_id, deps)
    }

    const registry: TaskRegistry = {
      tasks: {},
      version: state?.version ?? 0
    }

    for (const row of taskRows) {
      registry.tasks[row.id] = {
        id: row.id,
        parentId: row.parent_id,
        title: row.title,
        description: row.description,
        version: row.version,
        status: row.status,
        assignedTo: row.assigned_to,
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        claimedAt: row.claimed_at,
        completedAt: row.completed_at,
        dependencies: dependencyMap.get(row.id) || [],
        metadata: this.parseJsonOrEmptyObject(row.metadata)
      }
    }

    return registry
  }

  private async writeAgentsRegistry(registry: AgentRegistry): Promise<void> {
    await this.exec('BEGIN IMMEDIATE')
    try {
      await this.writeAgentsRegistryInTransaction(registry)
      await this.exec('COMMIT')
    } catch (error) {
      await this.exec('ROLLBACK')
      throw error
    }
  }

  private async writeTaskRegistry(registry: TaskRegistry): Promise<void> {
    await this.exec('BEGIN IMMEDIATE')
    try {
      await this.writeTaskRegistryInTransaction(registry)
      await this.exec('COMMIT')
    } catch (error) {
      await this.exec('ROLLBACK')
      throw error
    }
  }

  private async writeTaskRegistryIfVersion(registry: TaskRegistry, expectedVersion: number): Promise<boolean> {
    await this.exec('BEGIN IMMEDIATE')
    try {
      const state = await this.driver
        .prepare('SELECT version FROM task_state WHERE id = 1')
        .bind()
        .first<{ version: number }>()
      const currentVersion = state?.version ?? 0

      if (currentVersion !== expectedVersion) {
        await this.exec('ROLLBACK')
        return false
      }

      await this.writeTaskRegistryInTransaction(registry)
      await this.exec('COMMIT')
      return true
    } catch (error) {
      await this.exec('ROLLBACK')
      throw error
    }
  }

  private async writeAgentsRegistryInTransaction(registry: AgentRegistry): Promise<void> {
    await this.driver.prepare('DELETE FROM agents').bind().run()
    for (const agent of Object.values(registry.agents || {})) {
      await this.driver
        .prepare(`
          INSERT INTO agents (id, pid, start_time, last_heartbeat, status)
          VALUES (?, ?, ?, ?, ?)
        `)
        .bind(agent.id, agent.pid, agent.startTime, agent.lastHeartbeat, agent.status)
        .run()
    }
    await this.driver
      .prepare(`
        INSERT INTO agent_state (id, next_id)
        VALUES (1, ?)
        ON CONFLICT(id) DO UPDATE SET next_id = excluded.next_id
      `)
      .bind(registry.nextId ?? 0)
      .run()
    await this.touchStructuredKey('agents')
  }

  private async writeTaskRegistryInTransaction(registry: TaskRegistry): Promise<void> {
    await this.driver.prepare('DELETE FROM task_dependencies').bind().run()
    await this.driver.prepare('DELETE FROM tasks').bind().run()

    for (const task of Object.values(registry.tasks || {})) {
      await this.driver
        .prepare(`
          INSERT INTO tasks (
            id, parent_id, title, description, version, status, assigned_to,
            created_by, created_at, updated_at, claimed_at, completed_at, metadata
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
          task.id,
          task.parentId,
          task.title,
          task.description,
          task.version,
          task.status,
          task.assignedTo,
          task.createdBy,
          task.createdAt,
          task.updatedAt,
          task.claimedAt,
          task.completedAt,
          JSON.stringify(task.metadata ?? {})
        )
        .run()

      for (const dependencyId of task.dependencies || []) {
        await this.driver
          .prepare('INSERT INTO task_dependencies (task_id, dependency_id) VALUES (?, ?)')
          .bind(task.id, dependencyId)
          .run()
      }
    }

    await this.driver
      .prepare(`
        INSERT INTO task_state (id, version)
        VALUES (1, ?)
        ON CONFLICT(id) DO UPDATE SET version = excluded.version
      `)
      .bind(registry.version ?? 0)
      .run()

    await this.touchStructuredKey('tasks')
  }

  private async touchStructuredKey(key: 'agents' | 'tasks'): Promise<void> {
    await this.driver
      .prepare(`
        INSERT INTO state_meta (key, updated_at)
        VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET updated_at = excluded.updated_at
      `)
      .bind(key, Date.now())
      .run()
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

  private parseJsonOrEmptyObject(raw: string): Record<string, any> {
    try {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, any>
      }
      return {}
    } catch {
      return {}
    }
  }

  private async runMigrations(): Promise<void> {
    const executor = new StorageMigrationExecutor(
      this.driver,
      [InitStorageSchema1700000000000]
    )

    await executor.executePending()
  }
}
