import { Type } from '@sker/core'
import type { DatabaseDriver, SqlDialect } from '../driver/types.js'
import { MetadataStorage } from '../metadata/MetadataStorage.js'
import { TransactionIsolationLevel } from '../metadata/types.js'
import { Repository } from '../repository/Repository.js'

export class TransactionManager {
  private repositories = new Map<Function, Repository<any>>()
  private active = false

  constructor(
    private db: DatabaseDriver,
    private dialect: SqlDialect,
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
      await this.exec(this.dialect.beginTransaction())
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
    return new TransactionManager(this.db, this.dialect, this.isolationLevel, this, savepointName)
  }

  getRepository<T>(entity: Type<T>): Repository<T> {
    if (this.repositories.has(entity)) {
      return this.repositories.get(entity)!
    }

    const metadata = MetadataStorage.getInstance().getTable(entity)
    if (!metadata) {
      throw new Error(`Entity ${entity.name} is not registered. Did you use @Entity() decorator?`)
    }

    const repository = new Repository<T>(this.db, metadata, this.dialect)
    this.repositories.set(entity, repository)
    return repository
  }

  private async applyIsolationLevel(): Promise<void> {
    if (!this.isolationLevel) {
      return
    }

    if (this.isolationLevel === 'READ_UNCOMMITTED') {
      const sql = this.dialect.readUncommitted?.()
      if (sql) {
        await this.exec(sql)
      }
    }
  }

  private async exec(sql: string): Promise<void> {
    if (this.db.exec) {
      await this.db.exec(sql)
      return
    }

    await this.db.prepare(sql).bind().run()
  }
}
