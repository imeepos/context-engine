import { d1Dialect, type BoundStatement, type DatabaseDriver, type PreparedStatement } from '@sker/typeorm'

export interface D1BoundStatementLike extends BoundStatement {}

export interface D1PreparedStatementLike extends PreparedStatement {
  bind(...params: any[]): D1BoundStatementLike
}

export interface D1DatabaseLike {
  prepare(sql: string): D1PreparedStatementLike
  batch?(statements: D1BoundStatementLike[]): Promise<unknown>
  exec?(sql: string): Promise<unknown>
}

export class D1Driver implements DatabaseDriver {
  dialect = d1Dialect

  constructor(private db: D1DatabaseLike) {}

  prepare(sql: string): PreparedStatement {
    return this.db.prepare(sql)
  }

  async batch(statements: BoundStatement[]): Promise<void> {
    if (!this.db.batch) {
      for (const statement of statements) {
        await statement.run()
      }
      return
    }

    await this.db.batch(statements as D1BoundStatementLike[])
  }

  async exec(sql: string): Promise<void> {
    if (!this.db.exec) {
      await this.prepare(sql).bind().run()
      return
    }

    await this.db.exec(sql)
  }
}

export function createD1Driver(db: D1DatabaseLike): D1Driver {
  return new D1Driver(db)
}

// Module
export { TypeOrmD1Module } from './TypeOrmD1Module.js'
export type { TypeOrmD1ModuleOptions } from './TypeOrmD1Module.js'
