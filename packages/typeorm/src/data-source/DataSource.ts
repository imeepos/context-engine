import { Inject, Injectable, Type } from '@sker/core'
import type { DatabaseDriver, SqlDialect } from '../driver/types.js'
import { MetadataStorage } from '../metadata/MetadataStorage.js'
import { TransactionIsolationLevel } from '../metadata/types.js'
import { Repository } from '../repository/Repository.js'
import { DB_DRIVER, SQL_DIALECT } from '../tokens.js'
import { TransactionManager } from '../transaction/TransactionManager.js'

@Injectable({ providedIn: 'auto' })
export class DataSource {
  private static defaultDataSource?: DataSource
  private repositories = new Map<Function, Repository<any>>()
  private txStack: TransactionManager[] = []

  constructor(
    @Inject(DB_DRIVER) private db: DatabaseDriver,
    @Inject(SQL_DIALECT) private dialect: SqlDialect
  ) {
    if (!DataSource.defaultDataSource) {
      DataSource.defaultDataSource = this
    }
  }

  static getDefault(): DataSource | undefined {
    return DataSource.defaultDataSource
  }

  getDriver(): DatabaseDriver {
    return this.db
  }

  getDialect(): SqlDialect {
    return this.dialect
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

  async beginTransaction(isolationLevel?: TransactionIsolationLevel): Promise<TransactionManager> {
    const activeTx = this.txStack[this.txStack.length - 1]
    const manager = activeTx
      ? activeTx.createNestedManager()
      : new TransactionManager(this.db, this.dialect, isolationLevel)

    await manager.begin()
    this.txStack.push(manager)
    return manager
  }

  async transaction<T>(
    callback: (manager: TransactionManager) => Promise<T>,
    isolationLevel?: TransactionIsolationLevel
  ): Promise<T> {
    const manager = await this.beginTransaction(isolationLevel)

    try {
      const result = await callback(manager)
      await manager.commit()
      return result
    } catch (error) {
      await manager.rollback()
      throw error
    } finally {
      this.txStack.pop()
    }
  }
}
