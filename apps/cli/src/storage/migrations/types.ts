import type { DatabaseDriver, QueryRows } from '@sker/typeorm'

export interface StorageMigration {
  readonly timestamp: number
  readonly name: string
  up(queryRunner: StorageMigrationQueryRunner): Promise<void>
  down(queryRunner: StorageMigrationQueryRunner): Promise<void>
}

export interface StorageMigrationRecord {
  id: number
  timestamp: number
  name: string
  executed_at: string
  execution_time: number
}

export class StorageMigrationQueryRunner {
  constructor(private driver: DatabaseDriver) {}

  async query(sql: string, params: any[] = []): Promise<void> {
    await this.driver.prepare(sql).bind(...params).run()
  }

  async all<T>(sql: string, params: any[] = []): Promise<T[]> {
    const rows = await this.driver.prepare(sql).bind(...params).all<T>()
    return this.toArray(rows)
  }

  async first<T>(sql: string, params: any[] = []): Promise<T | null> {
    const row = await this.driver.prepare(sql).bind(...params).first<T>()
    return row ?? null
  }

  private toArray<T>(rows: QueryRows<T>): T[] {
    if (Array.isArray(rows)) {
      return rows
    }
    return rows.results ?? []
  }
}

