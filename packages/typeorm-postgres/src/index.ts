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
import type { PoolConfig, QueryResult } from 'pg'

export const postgresDialect: SqlDialect = {
  buildUpsert({ table, columns, primaryColumn }) {
    const placeholders = columns.map(() => '?').join(', ')
    const updateClauses = columns
      .filter(column => column !== primaryColumn)
      .map(column => `${column} = EXCLUDED.${column}`)
      .join(', ')

    return `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders}) ON CONFLICT (${primaryColumn}) DO UPDATE SET ${updateClauses}`
  },
  beginTransaction() {
    return 'BEGIN'
  }
}

export interface PostgresPoolLike {
  query(sql: string, params?: any[]): Promise<QueryResult>
  end(): Promise<void>
}

export type PostgresConnectOptions = string | PoolConfig

function convertPlaceholders(sql: string): string {
  let index = 1
  return sql.replace(/\?/g, () => `$${index++}`)
}

class PostgresPreparedStatement implements PreparedStatement {
  constructor(
    private pool: PostgresPoolLike,
    private sql: string
  ) {}

  bind(...params: any[]): BoundStatement {
    return new PostgresBoundStatement(this.pool, this.sql, params)
  }
}

class PostgresBoundStatement implements BoundStatement {
  constructor(
    private pool: PostgresPoolLike,
    private sql: string,
    private params: any[]
  ) {}

  async all<T = any>(): Promise<QueryRows<T>> {
    const result = await this.pool.query(this.sql, this.params)
    return result.rows as T[]
  }

  async run(): Promise<QueryRunResult> {
    const result = await this.pool.query(this.sql, this.params)
    return {
      changes: result.rowCount ?? undefined,
      lastInsertId: undefined
    }
  }

  async first<T = any>(): Promise<T | null> {
    const result = await this.pool.query(this.sql, this.params)
    return result.rows.length > 0 ? (result.rows[0] as T) : null
  }
}

export class PostgresDriver implements DatabaseDriver {
  dialect = postgresDialect

  constructor(private pool: PostgresPoolLike) {}

  prepare(sql: string): PreparedStatement {
    const convertedSql = convertPlaceholders(sql)
    return new PostgresPreparedStatement(this.pool, convertedSql)
  }

  async batch(statements: BoundStatement[]): Promise<void> {
    for (const statement of statements) {
      await statement.run()
    }
  }

  async exec(sql: string): Promise<void> {
    await this.pool.query(sql)
  }

  async close(): Promise<void> {
    await this.pool.end()
  }
}

export function createPostgresDriver(pool: PostgresPoolLike): PostgresDriver {
  return new PostgresDriver(pool)
}

export interface TypeOrmPostgresModuleOptions {
  connection: PostgresPoolLike | PostgresConnectOptions
  entities?: Type<any>[]
}

function isPostgresPoolLike(input: unknown): input is PostgresPoolLike {
  return Boolean(
    input &&
    typeof input === 'object' &&
    typeof (input as PostgresPoolLike).query === 'function' &&
    typeof (input as PostgresPoolLike).end === 'function'
  )
}

async function resolvePostgresPool(source: TypeOrmPostgresModuleOptions['connection']): Promise<PostgresPoolLike> {
  if (isPostgresPoolLike(source)) {
    return source
  }

  const { Pool } = await import('pg')

  if (typeof source === 'string') {
    return new Pool({ connectionString: source })
  }

  return new Pool(source)
}

@Module({})
export class TypeOrmPostgresModule {
  static async forRoot(options: TypeOrmPostgresModuleOptions): Promise<DynamicModule> {
    const pool = await resolvePostgresPool(options.connection)
    const driver = new PostgresDriver(pool)

    return TypeOrmModule.forRoot({
      driver,
      dialect: postgresDialect,
      entities: options.entities
    })
  }

  static forFeature(entities: Type<any>[]): DynamicModule {
    return TypeOrmModule.forFeature(entities)
  }
}
