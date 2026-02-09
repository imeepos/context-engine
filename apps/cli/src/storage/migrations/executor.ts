import type { DatabaseDriver } from '@sker/typeorm'
import {
  StorageMigration,
  StorageMigrationQueryRunner,
  type StorageMigrationRecord
} from './types'

export class StorageMigrationExecutor {
  private readonly migrations: StorageMigration[]
  private readonly queryRunner: StorageMigrationQueryRunner
  private readonly tableName = 'migrations'

  constructor(
    private driver: DatabaseDriver,
    migrationFactories: Array<new () => StorageMigration>
  ) {
    this.queryRunner = new StorageMigrationQueryRunner(driver)
    this.migrations = migrationFactories
      .map((MigrationClass) => new MigrationClass())
      .sort((a, b) => a.timestamp - b.timestamp)

    this.assertUniqueTimestamps()
  }

  async executePending(): Promise<void> {
    await this.ensureMigrationTable()

    const executed = await this.getExecutedMigrations()
    const executedTimestamps = new Set(executed.map((item) => item.timestamp))
    const pending = this.migrations.filter((item) => !executedTimestamps.has(item.timestamp))

    for (const migration of pending) {
      const start = Date.now()
      await this.beginTransaction()

      try {
        await migration.up(this.queryRunner)
        await this.queryRunner.query(
          `
            INSERT INTO ${this.tableName} (timestamp, name, executed_at, execution_time)
            VALUES (?, ?, ?, ?)
          `,
          [migration.timestamp, migration.name, new Date().toISOString(), Date.now() - start]
        )
        await this.commitTransaction()
      } catch (error) {
        await this.rollbackTransaction()
        throw error
      }
    }
  }

  private async ensureMigrationTable(): Promise<void> {
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

  private async getExecutedMigrations(): Promise<StorageMigrationRecord[]> {
    return this.queryRunner.all<StorageMigrationRecord>(
      `SELECT * FROM ${this.tableName} ORDER BY timestamp ASC`
    )
  }

  private async beginTransaction(): Promise<void> {
    await this.exec('BEGIN IMMEDIATE')
  }

  private async commitTransaction(): Promise<void> {
    await this.exec('COMMIT')
  }

  private async rollbackTransaction(): Promise<void> {
    await this.exec('ROLLBACK')
  }

  private async exec(sql: string): Promise<void> {
    if (this.driver.exec) {
      await this.driver.exec(sql)
      return
    }
    await this.driver.prepare(sql).bind().run()
  }

  private assertUniqueTimestamps(): void {
    const seen = new Set<number>()
    for (const migration of this.migrations) {
      if (seen.has(migration.timestamp)) {
        throw new Error(`Duplicate migration timestamp: ${migration.timestamp}`)
      }
      seen.add(migration.timestamp)
    }
  }
}

