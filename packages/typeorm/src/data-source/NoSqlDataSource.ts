import { Inject, Injectable } from '@sker/core'
import type { NoSqlDatabaseDriver, NoSqlDialect } from '../driver/types.js'
import { NOSQL_DB_DRIVER, NOSQL_DIALECT } from '../nosql-tokens.js'

@Injectable({ providedIn: 'auto' })
export class NoSqlDataSource {
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
}
