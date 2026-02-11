import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPlatform } from '@sker/core'
import { TypeOrmD1Module } from './TypeOrmD1Module.js'
import { DataSource, ENTITIES } from '@sker/typeorm'
import { Entity, Column, PrimaryColumn } from '@sker/typeorm'
import type { D1DatabaseLike } from './index.js'

describe('TypeOrmD1Module', () => {
  let mockD1: D1DatabaseLike

  beforeEach(() => {
    mockD1 = {
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
      const module = TypeOrmD1Module.forRoot({
        database: mockD1
      })

      expect(module.module).toBeDefined()
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

      await app.bootstrap(TypeOrmD1Module.forRoot({
        database: mockD1,
        entities: [User]
      }))

      const dataSource = app.injector.get(DataSource)
      expect(dataSource).toBeDefined()
      expect(dataSource).toBeInstanceOf(DataSource)

      const userRepo = dataSource.getRepository(User)
      expect(userRepo).toBeDefined()

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

      await app.bootstrap(TypeOrmD1Module.forRoot({
        database: mockD1,
        entities: [User, Post]
      }))

      const entities = app.injector.get(ENTITIES)
      expect(entities).toBeDefined()
      expect(Array.isArray(entities)).toBe(true)
      expect(entities.length).toBe(2)

      await app.destroy()
      await platform.destroy()
    })
  })

  describe('forFeature()', () => {
    it('应该只注册实体', () => {
      @Entity('users')
      class User {
        @PrimaryColumn()
        id!: number
      }

      const module = TypeOrmD1Module.forFeature([User])

      expect(module.module).toBeDefined()
      expect(module.providers).toBeDefined()
      expect(module.providers?.length).toBe(1)
    })
  })
})
