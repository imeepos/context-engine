import {
  mysqlDialect,
  type BoundStatement,
  type DatabaseDriver,
  type PreparedStatement,
  type QueryRows,
  type QueryRunResult
} from '@sker/typeorm'

export interface MysqlExecuteHeaderLike {
  affectedRows?: number
  insertId?: number
}

export interface MysqlExecutorLike {
  execute(sql: string, params?: any[]): Promise<[unknown, unknown]>
  query(sql: string, params?: any[]): Promise<[unknown, unknown]>
  end?(): Promise<unknown>
}

class MysqlPreparedStatement implements PreparedStatement {
  constructor(
    private executor: MysqlExecutorLike,
    private sql: string
  ) {}

  bind(...params: any[]): BoundStatement {
    return new MysqlBoundStatement(this.executor, this.sql, params)
  }
}

class MysqlBoundStatement implements BoundStatement {
  constructor(
    private executor: MysqlExecutorLike,
    private sql: string,
    private params: any[]
  ) {}

  async all<T = any>(): Promise<QueryRows<T>> {
    const [rows] = await this.executor.execute(this.sql, this.params)
    if (Array.isArray(rows)) {
      return rows as T[]
    }

    return []
  }

  async run(): Promise<QueryRunResult> {
    const [result] = await this.executor.execute(this.sql, this.params)
    if (!result || Array.isArray(result)) {
      return {}
    }

    const header = result as MysqlExecuteHeaderLike
    return {
      changes: header.affectedRows,
      lastInsertId: header.insertId
    }
  }

  async first<T = any>(): Promise<T | null> {
    const rows = await this.all<T>()
    return Array.isArray(rows) && rows.length > 0 ? rows[0]! : null
  }
}

export class MysqlDriver implements DatabaseDriver {
  dialect = mysqlDialect

  constructor(private executor: MysqlExecutorLike) {}

  prepare(sql: string): PreparedStatement {
    return new MysqlPreparedStatement(this.executor, sql)
  }

  async batch(statements: BoundStatement[]): Promise<void> {
    for (const statement of statements) {
      await statement.run()
    }
  }

  async exec(sql: string): Promise<void> {
    await this.executor.query(sql)
  }

  async close(): Promise<void> {
    if (this.executor.end) {
      await this.executor.end()
    }
  }
}

export function createMysqlDriver(executor: MysqlExecutorLike): MysqlDriver {
  return new MysqlDriver(executor)
}
