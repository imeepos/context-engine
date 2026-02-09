import { beforeEach, describe, expect, it } from 'vitest'
import { Column, Entity, PrimaryColumn, PrimaryGeneratedColumn } from '../decorators/index.js'
import { MetadataStorage } from '../metadata/MetadataStorage.js'

describe('Decorators', () => {
  beforeEach(() => {
    const storage = MetadataStorage.getInstance()
    ;(storage as any).tables = new Map()
  })

  describe('@Entity', () => {
    it('registers entity metadata', () => {
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

    it('uses lowercase class name as default table name', () => {
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
    it('registers column metadata and supports explicit type', () => {
      @Entity('users')
      class User {
        @PrimaryColumn()
        id!: number

        @Column()
        name!: string

        @Column('BLOB')
        avatar!: Uint8Array
      }

      const storage = MetadataStorage.getInstance()
      const metadata = storage.getTable(User)

      expect(metadata?.columns).toHaveLength(3)
      expect(metadata?.columns.find(c => c.name === 'name')?.type).toBe('TEXT')
      expect(metadata?.columns.find(c => c.name === 'avatar')?.type).toBe('BLOB')
    })

    it('infers SQLite column types from reflect metadata', () => {
      class Account {}

      const column = Column()
      Reflect.defineMetadata('design:type', String, Account.prototype, 'name')
      Reflect.defineMetadata('design:type', Number, Account.prototype, 'balance')
      Reflect.defineMetadata('design:type', Boolean, Account.prototype, 'active')

      column(Account.prototype, 'name')
      column(Account.prototype, 'balance')
      column(Account.prototype, 'active')

      const storage = MetadataStorage.getInstance()
      const metadata = storage.getTable(Account)

      expect(metadata?.columns.find(c => c.name === 'name')?.type).toBe('TEXT')
      expect(metadata?.columns.find(c => c.name === 'balance')?.type).toBe('REAL')
      expect(metadata?.columns.find(c => c.name === 'active')?.type).toBe('INTEGER')
    })

    it('supports options style for int, float, json and richtext', () => {
      @Entity('articles')
      class Article {
        @PrimaryColumn()
        id!: number

        @Column({ type: 'int' })
        viewCount!: number

        @Column({ type: 'float', default: 0 })
        score!: number

        @Column({ type: 'json', nullable: true })
        metadata!: Record<string, unknown>

        @Column({ type: 'richtext' })
        content!: string
      }

      const storage = MetadataStorage.getInstance()
      const metadata = storage.getTable(Article)
      const viewCount = metadata?.columns.find(c => c.name === 'viewCount')
      const score = metadata?.columns.find(c => c.name === 'score')
      const meta = metadata?.columns.find(c => c.name === 'metadata')
      const content = metadata?.columns.find(c => c.name === 'content')

      expect(viewCount?.type).toBe('int')
      expect(viewCount?.sqliteType).toBe('INTEGER')
      expect(score?.type).toBe('float')
      expect(score?.sqliteType).toBe('REAL')
      expect(meta?.type).toBe('json')
      expect(meta?.sqliteType).toBe('TEXT')
      expect(content?.type).toBe('richtext')
      expect(content?.mysqlType).toBe('LONGTEXT')
    })

    it('stores transformer metadata', () => {
      const transformer = {
        to: (value: Date | null) => value ? value.toISOString() : null,
        from: (value: string | null) => value ? new Date(value) : null
      }

      @Entity('events')
      class Event {
        @PrimaryColumn()
        id!: number

        @Column({ type: 'TEXT', transformer })
        occurredAt!: Date | null
      }

      const storage = MetadataStorage.getInstance()
      const metadata = storage.getTable(Event)
      const column = metadata?.columns.find(c => c.name === 'occurredAt')

      expect(column?.transformer).toBe(transformer)
    })
  })

  describe('@PrimaryColumn', () => {
    it('marks primary key and defaults number to INTEGER', () => {
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
      expect(primaryColumn?.type).toBe('INTEGER')
    })

    it('infers primary key number as INTEGER from reflect metadata', () => {
      class User {}

      const primaryColumn = PrimaryColumn()
      Reflect.defineMetadata('design:type', Number, User.prototype, 'id')
      primaryColumn(User.prototype, 'id')

      const storage = MetadataStorage.getInstance()
      const metadata = storage.getTable(User)

      expect(metadata?.columns.find(c => c.name === 'id')?.type).toBe('INTEGER')
      expect(metadata?.columns.find(c => c.name === 'id')?.primary).toBe(true)
    })

    it('supports uuid primary columns and generation strategy', () => {
      @Entity('api_keys')
      class ApiKey {
        @PrimaryColumn({ type: 'uuid', generated: 'uuid' })
        id!: string
      }

      const storage = MetadataStorage.getInstance()
      const metadata = storage.getTable(ApiKey)
      const idColumn = metadata?.columns.find(c => c.name === 'id')

      expect(idColumn?.type).toBe('uuid')
      expect(idColumn?.generated).toBe('uuid')
      expect(idColumn?.sqliteType).toBe('TEXT')
      expect(idColumn?.mysqlType).toBe('CHAR')
    })
  })

  describe('@PrimaryGeneratedColumn', () => {
    it('uses increment strategy by default', () => {
      @Entity('users')
      class User {
        @PrimaryGeneratedColumn()
        id!: number
      }

      const storage = MetadataStorage.getInstance()
      const metadata = storage.getTable(User)
      const idColumn = metadata?.columns.find(c => c.name === 'id')

      expect(idColumn?.primary).toBe(true)
      expect(idColumn?.generated).toBe('increment')
      expect(idColumn?.type).toBe('INTEGER')
    })

    it('supports uuid strategy', () => {
      @Entity('sessions')
      class Session {
        @PrimaryGeneratedColumn('uuid')
        id!: string
      }

      const storage = MetadataStorage.getInstance()
      const metadata = storage.getTable(Session)
      const idColumn = metadata?.columns.find(c => c.name === 'id')

      expect(idColumn?.primary).toBe(true)
      expect(idColumn?.generated).toBe('uuid')
      expect(idColumn?.type).toBe('uuid')
      expect(idColumn?.sqliteType).toBe('TEXT')
    })
  })

})
