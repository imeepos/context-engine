import {
  type BoundStatement,
  type DatabaseDriver,
  type PreparedStatement,
  type QueryRows,
  type QueryRunResult,
  type SqlDialect
} from '@sker/typeorm'
import { Module, DynamicModule, Type } from '@sker/core'
import { TypeOrmModule } from '@sker/typeorm'
import { createPool, type PoolOptions } from 'mysql2/promise'

export const mysqlDialect: SqlDialect = {
  name: 'mysql',
  buildUpsert({ table, columns, primaryColumn }) {
    const placeholders = columns.map(() => '?').join(', ')
    const updateClauses = columns
      .filter(column => column !== primaryColumn)
      .map(column => `${column} = VALUES(${column})`)
      .join(', ')

    return `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updateClauses}`
  },
  beginTransaction() {
    return 'START TRANSACTION'
  }
}

export interface MysqlExecuteHeaderLike {
  affectedRows?: number
  insertId?: number
}

export interface MysqlExecutorLike {
  execute(sql: string, params?: any[]): Promise<[unknown, unknown]>
  query(sql: string, params?: any[]): Promise<[unknown, unknown]>
  end?(): Promise<unknown>
}

export type MysqlConnectOptions = string | PoolOptions

export class Mysql implements MysqlExecutorLike {
  private readonly executor: any

  constructor(options: MysqlConnectOptions) {
    this.executor = typeof options === 'string'
      ? createPool(options)
      : createPool(options)
  }

  execute(sql: string, params?: any[]): Promise<[unknown, unknown]> {
    return this.executor.execute(sql, params) as Promise<[unknown, unknown]>
  }

  query(sql: string, params?: any[]): Promise<[unknown, unknown]> {
    return this.executor.query(sql, params) as Promise<[unknown, unknown]>
  }

  end(): Promise<unknown> {
    return this.executor.end?.() ?? Promise.resolve()
  }
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

export interface TypeOrmMysqlModuleOptions {
  connection: MysqlExecutorLike | Mysql | MysqlConnectOptions
  entities?: Type<any>[]
}

function isMysqlExecutorLike(input: unknown): input is MysqlExecutorLike {
  return Boolean(
    input &&
    typeof input === 'object' &&
    typeof (input as MysqlExecutorLike).execute === 'function' &&
    typeof (input as MysqlExecutorLike).query === 'function'
  )
}

function resolveMysqlExecutor(source: TypeOrmMysqlModuleOptions['connection']): MysqlExecutorLike {
  if (source instanceof Mysql) {
    return source
  }

  if (typeof source === 'string') {
    return new Mysql(source)
  }

  if (isMysqlExecutorLike(source)) {
    return source
  }

  return new Mysql(source)
}

@Module({})
export class TypeOrmMysqlModule {
  static forRoot(options: TypeOrmMysqlModuleOptions): DynamicModule {
    const driver = new MysqlDriver(resolveMysqlExecutor(options.connection))

    return TypeOrmModule.forRoot({
      driver,
      dialect: mysqlDialect,
      entities: options.entities
    })
  }

  static forFeature(entities: Type<any>[]): DynamicModule {
    return TypeOrmModule.forFeature(entities)
  }
}
