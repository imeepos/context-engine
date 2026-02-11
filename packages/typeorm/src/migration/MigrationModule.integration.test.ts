import { createPlatform, Module, type DynamicModule } from '@sker/core'
import { describe, expect, it } from 'vitest'
import { TypeOrmModule } from '../TypeOrmModule.js'
import type { DatabaseDriver, SqlDialect } from '../driver/types.js'
import { MigrationExecutor } from './MigrationExecutor.js'
import { MigrationModule } from './MigrationModule.js'
import type { MigrationRecord } from './types.js'

const mockDialect: SqlDialect = {
  
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
  }
}

function createMockDriver() {
  const sqlLog: string[] = []
  let records: MigrationRecord[] = []
  let id = 1

  const driver: DatabaseDriver = {
    prepare(sql: string) {
      sqlLog.push(sql)
      return {
        bind(...params: any[]) {
          return {
            async run() {
              if (sql.includes('INSERT INTO migrations')) {
                records.push({
                  id: id++,
                  timestamp: params[0] as number,
                  name: params[1] as string,
                  executed_at: params[2] as string,
                  execution_time: params[3] as number
                })
              } else if (sql.includes('DELETE FROM migrations')) {
                records = records.filter((item) => item.timestamp !== params[0])
              }
              return { success: true }
            },
            async all<T = any>() {
              if (sql.includes('SELECT * FROM migrations')) {
                return { results: records.slice().sort((a, b) => a.timestamp - b.timestamp) } as any
              }
              return { results: [] as T[] }
            },
            async first<T = any>() {
              return null as T | null
            }
          }
        }
      }
    }
  }

  return {
    driver,
    sqlLog,
    getRecords: () => records.slice()
  }
}

class CreateUsers1700000000000 {
  readonly timestamp = 1700000000000
  readonly name = 'CreateUsers'

  async up(queryRunner: any): Promise<void> {
    await queryRunner.query('CREATE TABLE users (id INTEGER PRIMARY KEY)')
  }

  async down(queryRunner: any): Promise<void> {
    await queryRunner.query('DROP TABLE users')
  }
}

class FailSecond1700000001000 {
  readonly timestamp = 1700000001000
  readonly name = 'FailSecond'

  async up(): Promise<void> {
    throw new Error('migration failed')
  }

  async down(): Promise<void> {}
}

describe('MigrationModule integration', () => {
  it('runs pending migrations at bootstrap via APP_INITIALIZER', async () => {
    const mock = createMockDriver()
    const platform = createPlatform()
    const app = platform.bootstrapApplication()

    const imports: DynamicModule[] = [
      TypeOrmModule.forRoot({ driver: mock.driver, dialect: mockDialect }),
      MigrationModule.forRoot(),
      MigrationModule.forFeature([CreateUsers1700000000000 as any])
    ]

    @Module({ imports })
    class TestModule {}

    await app.bootstrap(TestModule)

    const executor = app.injector.get(MigrationExecutor)
    const status = await executor.showStatus()
    expect(status).toHaveLength(1)
    expect(status[0]?.executed).toBe(true)
    expect(mock.getRecords()).toHaveLength(1)

    await app.destroy()
    await platform.destroy()
  })

  it('reverts the last successful migration when bootstrap fails', async () => {
    const mock = createMockDriver()
    const platform = createPlatform()
    const app = platform.bootstrapApplication()

    await expect(
      (() => {
        const imports: DynamicModule[] = [
          TypeOrmModule.forRoot({ driver: mock.driver, dialect: mockDialect }),
          MigrationModule.forRoot(),
          MigrationModule.forFeature([
            CreateUsers1700000000000 as any,
            FailSecond1700000001000 as any
          ])
        ]

        @Module({ imports })
        class TestModule {}

        return app.bootstrap(TestModule)
      })()
    ).rejects.toThrow('migration failed')

    expect(mock.getRecords()).toHaveLength(0)
    expect(mock.sqlLog.some((sql) => sql.includes('DROP TABLE users'))).toBe(true)
    expect(mock.sqlLog.some((sql) => sql.includes('ROLLBACK'))).toBe(true)

    await platform.destroy()
  })
})
