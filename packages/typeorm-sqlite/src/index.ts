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
import BetterSqlite3 from 'better-sqlite3'

export const sqliteDialect: SqlDialect = {
  name: 'sqlite',
  buildUpsert({ table, columns, primaryColumn }) {
    const placeholders = columns.map(() => '?').join(', ')
    const updateClauses = columns
      .filter(column => column !== primaryColumn)
      .map(column => `${column} = excluded.${column}`)
      .join(', ')

    return `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders}) ON CONFLICT(${primaryColumn}) DO UPDATE SET ${updateClauses}`
  },
  beginTransaction() {
    return 'BEGIN TRANSACTION'
  },
  readUncommitted() {
    return 'PRAGMA read_uncommitted = 1'
  }
}

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

export interface SqlLiteOptions extends Record<string, unknown> {}

type SqliteDatabaseCtor = new (path: string, options?: SqlLiteOptions) => SqliteDatabaseLike

export class SqlLite {
  readonly database: SqliteDatabaseLike

  constructor(path: string, options?: SqlLiteOptions) {
    const SqliteCtor = BetterSqlite3 as unknown as SqliteDatabaseCtor
    this.database = new SqliteCtor(path, options)
  }

  close(): unknown {
    return this.database.close()
  }
}

export class Sqlite extends SqlLite {}

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

export interface TypeOrmSqliteModuleOptions {
  database: SqliteDatabaseLike | SqlLite | string
  entities?: Type<any>[]
}

function resolveSqliteDatabase(source: TypeOrmSqliteModuleOptions['database']): SqliteDatabaseLike {
  if (typeof source === 'string') {
    return new SqlLite(source).database
  }

  if (source instanceof SqlLite) {
    return source.database
  }

  return source
}

@Module({})
export class TypeOrmSqliteModule {
  static forRoot(options: TypeOrmSqliteModuleOptions): DynamicModule {
    const driver = new SqliteDriver(resolveSqliteDatabase(options.database))

    return TypeOrmModule.forRoot({
      driver,
      dialect: sqliteDialect,
      entities: options.entities
    })
  }

  static forFeature(entities: Type<any>[]): DynamicModule {
    return TypeOrmModule.forFeature(entities)
  }
}
