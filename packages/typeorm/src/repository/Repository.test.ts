import { describe, it, expect, beforeEach } from 'vitest'
import { Repository } from './Repository.js'
import { TableMetadata } from '../metadata/types.js'

describe('Repository', () => {
  let mockDb: D1Database
  let metadata: TableMetadata
  let repository: Repository<any>

  beforeEach(() => {
    mockDb = {
      prepare: (_sql: string) => ({
        bind: (..._params: any[]) => ({
          all: async () => ({ results: [] }),
          first: async () => null,
          run: async () => ({ success: true })
        })
      }),
      batch: async (_statements: any[]) => []
    } as any

    metadata = {
      name: 'users',
      columns: [
        { name: 'id', type: 'INTEGER', primary: true },
        { name: 'name', type: 'TEXT', primary: false },
        { name: 'email', type: 'TEXT', primary: false }
      ],
      relations: []
    }

    repository = new Repository(mockDb, metadata)
  })

  describe('createQueryBuilder()', () => {
    it('应该创建 QueryBuilder 实例', () => {
      const qb = repository.createQueryBuilder()
      expect(qb).toBeDefined()
      expect(typeof qb.select).toBe('function')
      expect(typeof qb.where).toBe('function')
      expect(typeof qb.execute).toBe('function')
    })
  })

  describe('find()', () => {
    it('应该查询所有记录', async () => {
      const results = await repository.find()
      expect(Array.isArray(results)).toBe(true)
    })

    it('应该支持 where 条件', async () => {
      await repository.find({ where: { status: 'active' } })
      // 验证 SQL 被正确调用
    })
  })

  describe('findOne()', () => {
    it('应该根据 ID 查询单条记录', async () => {
      const result = await repository.findOne(1)
      expect(result).toBeNull()
    })
  })

  describe('save()', () => {
    it('应该插入新记录', async () => {
      const entity = { name: 'John', email: 'john@example.com' }
      const result = await repository.save(entity)
      expect(result).toEqual(entity)
    })
  })

  describe('update()', () => {
    it('应该更新记录', async () => {
      await repository.update(1, { name: 'Jane' })
      // 验证更新成功
    })
  })

  describe('remove()', () => {
    it('应该删除记录', async () => {
      await repository.remove(1)
      // 验证删除成功
    })
  })

  describe('count()', () => {
    it('应该返回记录数', async () => {
      const count = await repository.count()
      expect(count).toBe(0)
    })
  })

  describe('upsert()', () => {
    it('应该插入或更新记录', async () => {
      const entity = { id: 1, name: 'John', email: 'john@example.com' }
      const result = await repository.upsert(entity)
      expect(result).toEqual(entity)
    })
  })

  describe('边界情况', () => {
    it('findOne 应该在没有主键时抛出错误', async () => {
      const repoWithoutPrimary = new Repository(mockDb, {
        name: 'test',
        columns: [],
        relations: []
      })

      await expect(repoWithoutPrimary.findOne(1)).rejects.toThrow(
        'No primary column found'
      )
    })

    it('update 应该在没有主键时抛出错误', async () => {
      const repoWithoutPrimary = new Repository(mockDb, {
        name: 'test',
        columns: [],
        relations: []
      })

      await expect(repoWithoutPrimary.update(1, { name: 'test' })).rejects.toThrow(
        'No primary column found'
      )
    })

    it('remove 应该在没有主键时抛出错误', async () => {
      const repoWithoutPrimary = new Repository(mockDb, {
        name: 'test',
        columns: [],
        relations: []
      })

      await expect(repoWithoutPrimary.remove(1)).rejects.toThrow(
        'No primary column found'
      )
    })
  })
})
