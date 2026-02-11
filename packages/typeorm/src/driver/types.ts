export interface QueryRunResult {
  changes?: number
  lastInsertId?: number | string
  success?: boolean
}

export type QueryRows<T = any> = T[] | { results?: T[] }

export interface BoundStatement {
  all<T = any>(): Promise<QueryRows<T>>
  run(): Promise<QueryRunResult>
  first<T = any>(): Promise<T | null | undefined>
}

export interface PreparedStatement {
  bind(...params: any[]): BoundStatement
}

export type DialectName = 'sqlite' | 'd1' | 'mysql' | 'postgres' | 'mongodb'

export interface SqlDialect {
  buildUpsert(params: {
    table: string
    columns: string[]
    primaryColumn: string
  }): string
  beginTransaction(): string
  readUncommitted?(): string
}

export interface DatabaseDriver {
  prepare(sql: string): PreparedStatement
  batch?(statements: BoundStatement[]): Promise<unknown>
  exec?(sql: string): Promise<unknown>
  close?(): Promise<void>
  dialect?: SqlDialect
  synchronizeSchema?(): Promise<void>
}

// NoSQL support
export interface NoSqlQuery {
  filter?: Record<string, any>
  projection?: Record<string, 0 | 1>
  sort?: Record<string, 1 | -1>
  limit?: number
  skip?: number
}

export interface NoSqlBoundStatement {
  all<T = any>(): Promise<T[]>
  run(): Promise<QueryRunResult>
  first<T = any>(): Promise<T | null>
}

export interface NoSqlPreparedStatement {
  bind(query: NoSqlQuery): NoSqlBoundStatement
}

export interface NoSqlDialect {
  buildUpsert?(params: { collection: string; document: Record<string, any>; primaryKey: string }): any
}

export interface NoSqlDatabaseDriver {
  prepare(collection: string): NoSqlPreparedStatement
  insertOne?(collection: string, document: Record<string, any>): Promise<QueryRunResult>
  insertMany?(collection: string, documents: Record<string, any>[]): Promise<QueryRunResult>
  updateOne?(collection: string, filter: Record<string, any>, update: Record<string, any>): Promise<QueryRunResult>
  updateMany?(collection: string, filter: Record<string, any>, update: Record<string, any>): Promise<QueryRunResult>
  deleteOne?(collection: string, filter: Record<string, any>): Promise<QueryRunResult>
  deleteMany?(collection: string, filter: Record<string, any>): Promise<QueryRunResult>
  close?(): Promise<void>
  dialect?: NoSqlDialect
}
