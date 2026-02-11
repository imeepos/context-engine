import { InjectionToken } from '@sker/core'
import type { NoSqlDatabaseDriver, NoSqlDialect } from './driver/types.js'

export const NOSQL_DB_DRIVER = new InjectionToken<NoSqlDatabaseDriver>('NOSQL_DB_DRIVER')
export const NOSQL_DIALECT = new InjectionToken<NoSqlDialect>('NOSQL_DIALECT')
