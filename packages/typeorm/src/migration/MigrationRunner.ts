import { Inject, Injectable } from '@sker/core'
import { DataSource } from '../data-source/DataSource.js'
import type { Migration } from './types.js'
import { QueryRunner } from './QueryRunner.js'

@Injectable()
export class MigrationRunner {
  constructor(
    @Inject(DataSource) private dataSource: DataSource,
    @Inject(QueryRunner) private queryRunner: QueryRunner
  ) {}

  async executeUp(migration: Migration): Promise<number> {
    const startTime = Date.now()

    await this.dataSource.transaction(async () => {
      await migration.up(this.queryRunner)
    })

    return Date.now() - startTime
  }

  async executeDown(migration: Migration): Promise<number> {
    const startTime = Date.now()

    await this.dataSource.transaction(async () => {
      await migration.down(this.queryRunner)
    })

    return Date.now() - startTime
  }
}
