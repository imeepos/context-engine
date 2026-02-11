import { describe, expect, it, vi } from 'vitest'
import { MongodbDriver } from './index.js'

describe('MongodbDriver', () => {
  it('returns documents from all()', async () => {
    const cursor = {
      toArray: vi.fn().mockResolvedValue([{ _id: '1', name: 'test' }])
    }
    const collection = {
      find: vi.fn().mockReturnValue(cursor),
      findOne: vi.fn(),
      insertOne: vi.fn(),
      insertMany: vi.fn(),
      updateOne: vi.fn(),
      updateMany: vi.fn(),
      deleteOne: vi.fn(),
      deleteMany: vi.fn()
    }
    const db = {
      collection: vi.fn().mockReturnValue(collection)
    }

    const driver = new MongodbDriver(db as any)
    const docs = await driver.prepare('users').bind({ filter: { name: 'test' } }).all()

    expect(docs).toEqual([{ _id: '1', name: 'test' }])
    expect(collection.find).toHaveBeenCalledWith({ name: 'test' }, {})
  })

  it('returns single document from first()', async () => {
    const collection = {
      find: vi.fn(),
      findOne: vi.fn().mockResolvedValue({ _id: '1', name: 'test' }),
      insertOne: vi.fn(),
      insertMany: vi.fn(),
      updateOne: vi.fn(),
      updateMany: vi.fn(),
      deleteOne: vi.fn(),
      deleteMany: vi.fn()
    }
    const db = {
      collection: vi.fn().mockReturnValue(collection)
    }

    const driver = new MongodbDriver(db as any)
    const doc = await driver.prepare('users').bind({ filter: { _id: '1' } }).first()

    expect(doc).toEqual({ _id: '1', name: 'test' })
    expect(collection.findOne).toHaveBeenCalledWith({ _id: '1' }, {})
  })

  it('applies query options correctly', async () => {
    const cursor = {
      toArray: vi.fn().mockResolvedValue([])
    }
    const collection = {
      find: vi.fn().mockReturnValue(cursor),
      findOne: vi.fn(),
      insertOne: vi.fn(),
      insertMany: vi.fn(),
      updateOne: vi.fn(),
      updateMany: vi.fn(),
      deleteOne: vi.fn(),
      deleteMany: vi.fn()
    }
    const db = {
      collection: vi.fn().mockReturnValue(collection)
    }

    const driver = new MongodbDriver(db as any)
    await driver.prepare('users').bind({
      filter: { active: true },
      projection: { name: 1 },
      sort: { createdAt: -1 },
      limit: 10,
      skip: 5
    }).all()

    expect(collection.find).toHaveBeenCalledWith(
      { active: true },
      {
        projection: { name: 1 },
        sort: { createdAt: -1 },
        limit: 10,
        skip: 5
      }
    )
  })

  it('inserts single document', async () => {
    const collection = {
      find: vi.fn(),
      findOne: vi.fn(),
      insertOne: vi.fn().mockResolvedValue({
        acknowledged: true,
        insertedId: { toString: () => '507f1f77bcf86cd799439011' }
      }),
      insertMany: vi.fn(),
      updateOne: vi.fn(),
      updateMany: vi.fn(),
      deleteOne: vi.fn(),
      deleteMany: vi.fn()
    }
    const db = {
      collection: vi.fn().mockReturnValue(collection)
    }

    const driver = new MongodbDriver(db as any)
    const result = await driver.insertOne('users', { name: 'test' })

    expect(result).toEqual({
      success: true,
      lastInsertId: '507f1f77bcf86cd799439011'
    })
    expect(collection.insertOne).toHaveBeenCalledWith({ name: 'test' })
  })

  it('inserts multiple documents', async () => {
    const collection = {
      find: vi.fn(),
      findOne: vi.fn(),
      insertOne: vi.fn(),
      insertMany: vi.fn().mockResolvedValue({
        acknowledged: true,
        insertedCount: 2
      }),
      updateOne: vi.fn(),
      updateMany: vi.fn(),
      deleteOne: vi.fn(),
      deleteMany: vi.fn()
    }
    const db = {
      collection: vi.fn().mockReturnValue(collection)
    }

    const driver = new MongodbDriver(db as any)
    const result = await driver.insertMany('users', [{ name: 'a' }, { name: 'b' }])

    expect(result).toEqual({
      success: true,
      changes: 2
    })
  })

  it('updates single document', async () => {
    const collection = {
      find: vi.fn(),
      findOne: vi.fn(),
      insertOne: vi.fn(),
      insertMany: vi.fn(),
      updateOne: vi.fn().mockResolvedValue({
        acknowledged: true,
        modifiedCount: 1
      }),
      updateMany: vi.fn(),
      deleteOne: vi.fn(),
      deleteMany: vi.fn()
    }
    const db = {
      collection: vi.fn().mockReturnValue(collection)
    }

    const driver = new MongodbDriver(db as any)
    const result = await driver.updateOne('users', { _id: '1' }, { name: 'updated' })

    expect(result).toEqual({
      success: true,
      changes: 1
    })
    expect(collection.updateOne).toHaveBeenCalledWith({ _id: '1' }, { $set: { name: 'updated' } })
  })

  it('deletes single document', async () => {
    const collection = {
      find: vi.fn(),
      findOne: vi.fn(),
      insertOne: vi.fn(),
      insertMany: vi.fn(),
      updateOne: vi.fn(),
      updateMany: vi.fn(),
      deleteOne: vi.fn().mockResolvedValue({
        acknowledged: true,
        deletedCount: 1
      }),
      deleteMany: vi.fn()
    }
    const db = {
      collection: vi.fn().mockReturnValue(collection)
    }

    const driver = new MongodbDriver(db as any)
    const result = await driver.deleteOne('users', { _id: '1' })

    expect(result).toEqual({
      success: true,
      changes: 1
    })
    expect(collection.deleteOne).toHaveBeenCalledWith({ _id: '1' })
  })
})
