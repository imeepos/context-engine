import { Inject, Injectable, Type } from '@sker/core'
import { MIGRATIONS } from './tokens.js'
import { MigrationRunner } from './MigrationRunner.js'
import { MigrationStorage } from './MigrationStorage.js'
import type { Migration, MigrationStatus } from './types.js'

@Injectable()
export class MigrationExecutor {
  private readonly migrations: Migration[]

  constructor(
    @Inject(MigrationStorage) private storage: MigrationStorage,
    @Inject(MigrationRunner) private runner: MigrationRunner,
    @Inject(MIGRATIONS) migrationClasses: Type<Migration>[]
  ) {
    this.migrations = migrationClasses
      .map((MigrationClass) => new MigrationClass())
      .sort((a, b) => a.timestamp - b.timestamp)

    this.assertUniqueTimestamps()
  }

  async initialize(): Promise<void> {
    await this.storage.ensureTable()
  }

  async executePending(): Promise<void> {
    await this.initialize()

    const executed = await this.storage.getExecuted()
    const executedTimestamps = new Set(executed.map((item) => item.timestamp))
    const pending = this.migrations.filter((item) => !executedTimestamps.has(item.timestamp))

    for (const migration of pending) {
      const executionTime = await this.runner.executeUp(migration)
      await this.storage.insert({
        timestamp: migration.timestamp,
        name: migration.name,
        executed_at: new Date().toISOString(),
        execution_time: executionTime
      })
    }
  }

  async revert(steps = 1): Promise<void> {
    if (steps <= 0) {
      return
    }

    await this.initialize()

    const executed = await this.storage.getExecuted()
    const toRevert = executed.slice(-steps).reverse()

    for (const record of toRevert) {
      const migration = this.migrations.find((item) => item.timestamp === record.timestamp)
      if (!migration) {
        throw new Error(`Migration not found: ${record.name}`)
      }

      await this.runner.executeDown(migration)
      await this.storage.delete(record.timestamp)
    }
  }

  async showStatus(): Promise<MigrationStatus[]> {
    await this.initialize()

    const executed = await this.storage.getExecuted()
    const executedMap = new Map(executed.map((item) => [item.timestamp, item] as const))

    return this.migrations.map((migration) => {
      const executedItem = executedMap.get(migration.timestamp)
      return {
        timestamp: migration.timestamp,
        name: migration.name,
        executed: Boolean(executedItem),
        executedAt: executedItem?.executed_at,
        executionTime: executedItem?.execution_time
      }
    })
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
