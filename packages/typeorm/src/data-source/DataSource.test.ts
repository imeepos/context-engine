import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DataSource } from './DataSource.js'
import { Entity, Column, PrimaryColumn } from '../decorators/index.js'
import type { DatabaseDriver } from '../driver/types.js'
import { MetadataStorage } from '../metadata/MetadataStorage.js'

describe('DataSource', () => {
  let mockDb: DatabaseDriver
  let dataSource: DataSource

  beforeEach(() => {
    // 清理元数据
    const storage = MetadataStorage.getInstance()
    ;(storage as any).tables = new Map()

    mockDb = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({ results: [] }),
          first: vi.fn().mockResolvedValue(null),
          run: vi.fn().mockResolvedValue({ success: true })
        })
      })
    } as any

    dataSource = new DataSource(mockDb)
  })

  describe('getRepository()', () => {
    it('应该返回实体的 Repository', () => {
      @Entity('users')
      class User {
        @PrimaryColumn()
        id!: number

        @Column()
        name!: string
      }

      const repo = dataSource.getRepository(User)
      expect(repo).toBeDefined()
      expect(typeof repo.find).toBe('function')
    })

    it('应该缓存 Repository 实例', () => {
      @Entity('users')
      class User {
        @PrimaryColumn()
        id!: number
      }

      const repo1 = dataSource.getRepository(User)
      const repo2 = dataSource.getRepository(User)

      expect(repo1).toBe(repo2)
    })

    it('应该在实体未注册时抛出错误', () => {
      class UnregisteredEntity {
        id!: number
      }

      expect(() => {
        dataSource.getRepository(UnregisteredEntity)
      }).toThrow('Entity UnregisteredEntity is not registered')
    })
  })
})
