declare module 'better-sqlite3' {
  interface BetterSqliteRunResult {
    changes: number
    lastInsertRowid?: number | bigint
  }

  interface BetterSqliteStatement {
    all(...params: any[]): any[]
    get(...params: any[]): any
    run(...params: any[]): BetterSqliteRunResult
  }

  interface BetterSqliteDatabase {
    prepare(sql: string): BetterSqliteStatement
    exec(sql: string): unknown
    close(): unknown
  }

  interface BetterSqliteOptions extends Record<string, unknown> {}

  interface BetterSqliteConstructor {
    new (path: string, options?: BetterSqliteOptions): BetterSqliteDatabase
  }

  const BetterSqlite3: BetterSqliteConstructor
  export default BetterSqlite3
}
