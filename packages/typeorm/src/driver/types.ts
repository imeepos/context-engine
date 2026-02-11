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

export type DialectName = 'sqlite' | 'd1' | 'mysql'

export interface SqlDialect {
  name?: DialectName
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
}
