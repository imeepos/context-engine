import { Type } from '@sker/core'
import { MetadataStorage } from '../metadata/MetadataStorage.js'
import { TransactionIsolationLevel } from '../metadata/types.js'
import { Repository } from '../repository/Repository.js'

interface D1Executable {
  prepare(sql: string): D1PreparedStatement
  exec?(query: string): Promise<D1ExecResult>
}

export class TransactionManager {
  private repositories = new Map<Function, Repository<any>>()
  private active = false

  constructor(
    private db: D1Executable,
    private isolationLevel?: TransactionIsolationLevel,
    private parent?: TransactionManager,
    private savepointName?: string
  ) {}

  async begin(): Promise<void> {
    if (this.active) {
      return
    }

    if (this.parent) {
      await this.exec(`SAVEPOINT ${this.savepointName}`)
    } else {
      await this.applyIsolationLevel()
      await this.exec('BEGIN TRANSACTION')
    }

    this.active = true
  }

  async commit(): Promise<void> {
    if (!this.active) {
      return
    }

    if (this.parent) {
      await this.exec(`RELEASE SAVEPOINT ${this.savepointName}`)
    } else {
      await this.exec('COMMIT')
    }

    this.active = false
  }

  async rollback(): Promise<void> {
    if (!this.active) {
      return
    }

    if (this.parent) {
      await this.exec(`ROLLBACK TO SAVEPOINT ${this.savepointName}`)
      await this.exec(`RELEASE SAVEPOINT ${this.savepointName}`)
    } else {
      await this.exec('ROLLBACK')
    }

    this.active = false
  }

  async transaction<T>(callback: (manager: TransactionManager) => Promise<T>): Promise<T> {
    const nested = this.createNestedManager()
    await nested.begin()

    try {
      const result = await callback(nested)
      await nested.commit()
      return result
    } catch (error) {
      await nested.rollback()
      throw error
    }
  }

  createNestedManager(): TransactionManager {
    const savepointName = `sp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    return new TransactionManager(this.db, this.isolationLevel, this, savepointName)
  }

  getRepository<T>(entity: Type<T>): Repository<T> {
    if (this.repositories.has(entity)) {
      return this.repositories.get(entity)!
    }

    const metadata = MetadataStorage.getInstance().getTable(entity)
    if (!metadata) {
      throw new Error(`Entity ${entity.name} is not registered. Did you use @Entity() decorator?`)
    }

    const repository = new Repository<T>(this.db as any, metadata)
    this.repositories.set(entity, repository)
    return repository
  }

  private async applyIsolationLevel(): Promise<void> {
    if (!this.isolationLevel) {
      return
    }

    if (this.isolationLevel === 'READ_UNCOMMITTED') {
      await this.exec('PRAGMA read_uncommitted = 1')
    }
  }

  private async exec(sql: string): Promise<void> {
    if (this.db.exec) {
      await this.db.exec(sql)
      return
    }

    await this.db.prepare(sql).run()
  }
}
