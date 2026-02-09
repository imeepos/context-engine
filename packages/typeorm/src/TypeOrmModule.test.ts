import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPlatform } from '@sker/core'
import { TypeOrmModule } from './TypeOrmModule.js'
import { DataSource } from './data-source/DataSource.js'
import { Entity, Column, PrimaryColumn } from './decorators/index.js'
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

    it('应该支持全局模块配置', () => {
      const module = TypeOrmModule.forRoot({
        driver: mockDb,
        global: true
      })

      expect(module.module).toBe(TypeOrmModule)
      expect(module.providers).toBeDefined()
    })
  })
})
