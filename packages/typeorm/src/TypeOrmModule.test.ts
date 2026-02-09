import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPlatform } from '@sker/core'
import { TypeOrmModule } from './TypeOrmModule.js'
import { DataSource } from './data-source/DataSource.js'
import { Entity, Column, PrimaryColumn } from './decorators/index.js'
import { ENTITIES } from './tokens.js'
import type { DatabaseDriver } from './driver/types.js'

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
    it('应该创建 DynamicModule 配置', () => {
      const module = TypeOrmModule.forRoot({
        driver: mockDb
      })

      expect(module.module).toBe(TypeOrmModule)
      expect(module.providers).toBeDefined()
      expect(module.providers?.length).toBeGreaterThan(0)
    })

    it('应该在应用中注册 DataSource', async () => {
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
        entities: [User]
      }))

      const dataSource = app.injector.get(DataSource)
      expect(dataSource).toBeDefined()
      expect(dataSource).toBeInstanceOf(DataSource)

      await app.destroy()
      await platform.destroy()
    })

    it('应该使用 multi: true 注册实体', async () => {
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
        entities: [User, Post]
      }))

      const entities = app.injector.get(ENTITIES)
      expect(entities).toBeDefined()
      expect(Array.isArray(entities)).toBe(true)
      expect(entities.length).toBe(2)
      expect(entities).toContain(User)
      expect(entities).toContain(Post)

      await app.destroy()
      await platform.destroy()
    })
  })

  describe('forFeature()', () => {
    it('应该只注册实体，不注册 DataSource', () => {
      @Entity('users')
      class User {
        @PrimaryColumn()
        id!: number
      }

      const module = TypeOrmModule.forFeature([User])

      expect(module.module).toBe(TypeOrmModule)
      expect(module.providers).toBeDefined()
      expect(module.providers?.length).toBe(1)
    })

    it('应该使用 multi: true 注册多个实体', async () => {
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

      await app.bootstrap(TypeOrmModule.forFeature([User, Post]))

      const entities = app.injector.get(ENTITIES)
      expect(entities).toBeDefined()
      expect(Array.isArray(entities)).toBe(true)
      expect(entities.length).toBe(2)

      await app.destroy()
      await platform.destroy()
    })
  })
})
