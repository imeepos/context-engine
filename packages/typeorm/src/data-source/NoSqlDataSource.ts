import { Inject, Injectable, Type } from '@sker/core'
import type { NoSqlDatabaseDriver, NoSqlDialect } from '../driver/types.js'
import { NOSQL_DB_DRIVER, NOSQL_DIALECT } from '../nosql-tokens.js'
import { MetadataStorage } from '../metadata/MetadataStorage.js'
import { NoSqlRepository } from '../repository/NoSqlRepository.js'

@Injectable({ providedIn: 'auto' })
export class NoSqlDataSource {
  private repositories = new Map<Function, NoSqlRepository<any>>()

  constructor(
    @Inject(NOSQL_DB_DRIVER) private db: NoSqlDatabaseDriver,
    @Inject(NOSQL_DIALECT) private dialect?: NoSqlDialect
  ) {}

  getDriver(): NoSqlDatabaseDriver {
    return this.db
  }

  getDialect(): NoSqlDialect | undefined {
    return this.dialect
  }

  getRepository<T>(entity: Type<T>): NoSqlRepository<T> {
    if (this.repositories.has(entity)) {
      return this.repositories.get(entity)!
    }

    const metadata = MetadataStorage.getInstance().getTable(entity)
    if (!metadata) {
      throw new Error(`Entity ${entity.name} is not registered. Did you use @Entity() decorator?`)
    }

    const repository = new NoSqlRepository<T>(this.db, metadata)
    this.repositories.set(entity, repository)
    return repository
  }
}

