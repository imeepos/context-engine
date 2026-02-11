import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPlatform } from '@sker/core'
import { TypeOrmModule } from './TypeOrmModule.js'
import { DataSource } from './data-source/DataSource.js'
import { Column, Entity, PrimaryColumn } from './decorators/index.js'
import { ENTITIES } from './tokens.js'
import type { DatabaseDriver, SqlDialect } from './driver/types.js'

const mockDialect: SqlDialect = {
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
  }
}

describe('TypeOrmModule', () => {
  let mockDb: DatabaseDriver

  beforeEach(() => {
    mockDb = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({ results: [] }),
          first: vi.fn().mockResolvedValue(null),
          run: vi.fn().mockResolvedValue({ success: true })
        })
      })
    } as any
  })

  describe('forRoot()', () => {
    it('creates dynamic module config', () => {
      const module = TypeOrmModule.forRoot({ driver: mockDb, dialect: mockDialect })
      expect(module.module).toBe(TypeOrmModule)
      expect(module.providers).toBeDefined()
      expect(module.providers?.length).toBeGreaterThan(0)
    })

    it('registers DataSource in application', async () => {
      @Entity('users')
      class User {
        @PrimaryColumn()
        id!: number

        @Column()
        name!: string
      }

      const platform = createPlatform()
      const app = platform.bootstrapApplication()

      await app.bootstrap(TypeOrmModule.forRoot({
        driver: mockDb,
        dialect: mockDialect,
        entities: [User]
      }))

      const dataSource = app.injector.get(DataSource)
      expect(dataSource).toBeInstanceOf(DataSource)

      await app.destroy()
      await platform.destroy()
    })

    it('registers entities as multi providers', async () => {
      @Entity('users')
      class User {
        @PrimaryColumn()
        id!: number
      }

      @Entity('posts')
      class Post {
        @PrimaryColumn()
        id!: number
      }

      const platform = createPlatform()
      const app = platform.bootstrapApplication()

      await app.bootstrap(TypeOrmModule.forRoot({
        driver: mockDb,
        dialect: mockDialect,
        entities: [User, Post]
      }))

      const entities = app.injector.get(ENTITIES)
      expect(Array.isArray(entities)).toBe(true)
      expect(entities).toContain(User)
      expect(entities).toContain(Post)

      await app.destroy()
      await platform.destroy()
    })

    it('runs synchronize initializer when enabled', async () => {
      @Entity('users')
      class User {
        @PrimaryColumn({ type: 'int', generated: 'increment' })
        id!: number

        @Column({ type: 'json', nullable: true })
        profile!: Record<string, unknown>
      }

      const exec = vi.fn().mockResolvedValue(undefined)
      mockDb = {
        ...mockDb,
        exec
      } as any

      const platform = createPlatform()
      const app = platform.bootstrapApplication()

      await app.bootstrap(TypeOrmModule.forRoot({
        driver: mockDb,
        dialect: mockDialect,
        entities: [User],
        synchronize: true
      }))

      expect(exec).toHaveBeenCalledTimes(1)
      expect(exec.mock.calls[0]?.[0]).toContain('CREATE TABLE IF NOT EXISTS user')

      await app.destroy()
      await platform.destroy()
    })
  })

  describe('forFeature()', () => {
    it('only registers entities', () => {
      @Entity('users')
      class User {
        @PrimaryColumn()
        id!: number
      }

      const module = TypeOrmModule.forFeature([User])
      expect(module.module).toBe(TypeOrmModule)
      expect(module.providers?.length).toBe(1)
    })
  })
})
