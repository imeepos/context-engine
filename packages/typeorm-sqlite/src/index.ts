import {
  sqliteDialect,
  type BoundStatement,
  type DatabaseDriver,
  type PreparedStatement,
  type QueryRows,
  type QueryRunResult
} from '@sker/typeorm'

export interface SqliteStatementLike {
  all(...params: any[]): any[]
  get(...params: any[]): any
  run(...params: any[]): { changes: number; lastInsertRowid?: number | bigint }
}

export interface SqliteDatabaseLike {
  prepare(sql: string): SqliteStatementLike
  exec(sql: string): unknown
  close(): unknown
}

class SqlitePreparedStatement implements PreparedStatement {
  constructor(private statement: SqliteStatementLike) {}

  bind(...params: any[]): BoundStatement {
    return new SqliteBoundStatement(this.statement, params)
  }
}

class SqliteBoundStatement implements BoundStatement {
  constructor(
    private statement: SqliteStatementLike,
    private params: any[]
  ) {}

  async all<T = any>(): Promise<QueryRows<T>> {
    return this.statement.all(...this.params) as T[]
  }

  async run(): Promise<QueryRunResult> {
    const result = this.statement.run(...this.params)
    return {
      changes: result.changes,
      lastInsertId: typeof result.lastInsertRowid === 'bigint'
        ? Number(result.lastInsertRowid)
        : result.lastInsertRowid
    }
  }

  async first<T = any>(): Promise<T | null> {
    return (this.statement.get(...this.params) as T | undefined) ?? null
  }
}

export class SqliteDriver implements DatabaseDriver {
  dialect = sqliteDialect

  constructor(private db: SqliteDatabaseLike) {}

  prepare(sql: string): PreparedStatement {
    return new SqlitePreparedStatement(this.db.prepare(sql))
  }

  async batch(statements: BoundStatement[]): Promise<void> {
    for (const statement of statements) {
      await statement.run()
    }
  }

  async exec(sql: string): Promise<void> {
    this.db.exec(sql)
  }

  async close(): Promise<void> {
    this.db.close()
  }
}

export function createSqliteDriver(db: SqliteDatabaseLike): SqliteDriver {
  return new SqliteDriver(db)
}
