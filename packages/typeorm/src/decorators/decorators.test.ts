import { describe, it, expect, beforeEach } from 'vitest'
import { Entity, Column, PrimaryColumn } from '../decorators/index.js'
import { MetadataStorage } from '../metadata/MetadataStorage.js'

describe('Decorators', () => {
  beforeEach(() => {
    // 清理元数据存储
    const storage = MetadataStorage.getInstance()
    ;(storage as any).tables = new Map()
  })

  describe('@Entity', () => {
    it('应该注册实体元数据', () => {
      @Entity('test_users')
      class TestUser {
        @PrimaryColumn()
        id!: number

        @Column()
        name!: string
      }

      const storage = MetadataStorage.getInstance()
      const metadata = storage.getTable(TestUser)

      expect(metadata).toBeDefined()
      expect(metadata?.name).toBe('testuser')
    })

    it('应该使用类名作为默认表名（小写）', () => {
      @Entity()
      class User {
        @PrimaryColumn()
        id!: number
      }

      const storage = MetadataStorage.getInstance()
      const metadata = storage.getTable(User)

      expect(metadata?.name).toBe('user')
    })
  })

  describe('@Column', () => {
    it('应该注册列元数据', () => {
      @Entity('users')
      class User {
        @PrimaryColumn()
        id!: number

        @Column()
        name!: string

        @Column('TEXT')
        email!: string
      }

      const storage = MetadataStorage.getInstance()
      const metadata = storage.getTable(User)

      expect(metadata?.columns).toHaveLength(3)
      expect(metadata?.columns.find(c => c.name === 'name')).toBeDefined()
      expect(metadata?.columns.find(c => c.name === 'email')?.type).toBe('TEXT')
    })

    it('应该支持默认类型', () => {
      @Entity('test')
      class Test {
        @PrimaryColumn()
        id!: number

        @Column()
        data!: string
      }

      const storage = MetadataStorage.getInstance()
      const metadata = storage.getTable(Test)
      const dataColumn = metadata?.columns.find(c => c.name === 'data')

      expect(dataColumn?.type).toBe('TEXT')
    })
  })

  describe('@PrimaryColumn', () => {
    it('应该标记主键列', () => {
      @Entity('users')
      class User {
        @PrimaryColumn()
        id!: number

        @Column()
        name!: string
      }

      const storage = MetadataStorage.getInstance()
      const metadata = storage.getTable(User)

      const primaryColumn = metadata?.columns.find(c => c.primary)
      expect(primaryColumn).toBeDefined()
      expect(primaryColumn?.name).toBe('id')
    })
  })
})
