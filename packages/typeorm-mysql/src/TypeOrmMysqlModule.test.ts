import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPlatform } from '@sker/core'
import { DataSource, ENTITIES, Entity, Column, PrimaryColumn } from '@sker/typeorm'
import { TypeOrmMysqlModule, type MysqlExecutorLike } from './index.js'

describe('TypeOrmMysqlModule', () => {
  let mockExecutor: MysqlExecutorLike

  beforeEach(() => {
    mockExecutor = {
      execute: vi.fn().mockResolvedValue([[], []]),
      query: vi.fn().mockResolvedValue([[], []]),
      end: vi.fn().mockResolvedValue(undefined)
    }
  })

  describe('forRoot()', () => {
    it('creates a dynamic module', () => {
      const module = TypeOrmMysqlModule.forRoot({
        connection: mockExecutor
      })

      expect(module.module).toBeDefined()
      expect(module.providers).toBeDefined()
      expect(module.providers?.length).toBeGreaterThan(0)
    })

    it('registers DataSource in app container', async () => {
      @Entity('users')
      class User {
        @PrimaryColumn()
        id!: number

        @Column()
        name!: string
      }

      const platform = createPlatform()
      const app = platform.bootstrapApplication()

      await app.bootstrap(TypeOrmMysqlModule.forRoot({
        connection: mockExecutor,
        entities: [User]
      }))

      const dataSource = app.injector.get(DataSource)
      expect(dataSource).toBeInstanceOf(DataSource)
      expect(dataSource.getRepository(User)).toBeDefined()

      await app.destroy()
      await platform.destroy()
    })

    it('registers entities with multi provider', async () => {
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

      await app.bootstrap(TypeOrmMysqlModule.forRoot({
        connection: mockExecutor,
        entities: [User, Post]
      }))

      const entities = app.injector.get(ENTITIES)
      expect(Array.isArray(entities)).toBe(true)
      expect(entities.length).toBe(2)

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

      const module = TypeOrmMysqlModule.forFeature([User])
      expect(module.providers?.length).toBe(1)
    })
  })
})
