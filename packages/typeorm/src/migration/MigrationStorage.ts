import { Inject, Injectable } from '@sker/core'
import type { QueryRows } from '../driver/types.js'
import { DataSource } from '../data-source/DataSource.js'
import { MIGRATION_TABLE_NAME } from './tokens.js'
import type { MigrationRecord, NewMigrationRecord } from './types.js'

@Injectable()
export class MigrationStorage {
  private readonly tableName = MIGRATION_TABLE_NAME

  constructor(@Inject(DataSource) private dataSource: DataSource) {}

  async ensureTable(): Promise<void> {
    await this.exec(`
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp BIGINT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        execution_time INTEGER NOT NULL
      )
    `)
  }

  async getExecuted(): Promise<MigrationRecord[]> {
    const rows = await this.dataSource
      .getDriver()
      .prepare(`SELECT * FROM ${this.tableName} ORDER BY timestamp ASC`)
      .bind()
      .all<MigrationRecord>()

    return this.toArray(rows)
  }

  async insert(record: NewMigrationRecord): Promise<void> {
    await this.dataSource
      .getDriver()
      .prepare(`
        INSERT INTO ${this.tableName} (timestamp, name, executed_at, execution_time)
        VALUES (?, ?, ?, ?)
      `)
      .bind(
        record.timestamp,
        record.name,
        record.executed_at,
        record.execution_time
      )
      .run()
  }

  async delete(timestamp: number): Promise<void> {
    await this.dataSource
      .getDriver()
      .prepare(`DELETE FROM ${this.tableName} WHERE timestamp = ?`)
      .bind(timestamp)
      .run()
  }

  private async exec(sql: string): Promise<void> {
    const driver = this.dataSource.getDriver()
    if (driver.exec) {
      await driver.exec(sql)
      return
    }

    await driver.prepare(sql).bind().run()
  }

  private toArray<T>(rows: QueryRows<T>): T[] {
    if (Array.isArray(rows)) {
      return rows
    }

    return rows.results ?? []
  }
}
