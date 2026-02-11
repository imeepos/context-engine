import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PostgresDriver, createPostgresDriver, type PostgresPoolLike } from './index'
import type { QueryResult } from 'pg'

describe('PostgresDriver', () => {
  let mockPool: PostgresPoolLike
  let driver: PostgresDriver

  beforeEach(() => {
    mockPool = {
      query: vi.fn(),
      end: vi.fn()
    }
    driver = new PostgresDriver(mockPool)
  })

  describe('prepare and execute', () => {
    it('converts ? placeholders to $1, $2, $3', async () => {
      const mockResult: QueryResult = {
        rows: [{ id: 1, name: 'test' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      }
      vi.mocked(mockPool.query).mockResolvedValue(mockResult)

      const stmt = driver.prepare('SELECT * FROM users WHERE id = ? AND name = ?')
      await stmt.bind(1, 'test').all()

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE id = $1 AND name = $2',
        [1, 'test']
      )
    })

    it('returns all rows', async () => {
      const mockResult: QueryResult = {
        rows: [{ id: 1 }, { id: 2 }],
        rowCount: 2,
        command: 'SELECT',
        oid: 0,
        fields: []
      }
      vi.mocked(mockPool.query).mockResolvedValue(mockResult)

      const stmt = driver.prepare('SELECT * FROM users')
      const result = await stmt.bind().all()

      expect(result).toEqual([{ id: 1 }, { id: 2 }])
    })

    it('returns first row', async () => {
      const mockResult: QueryResult = {
        rows: [{ id: 1 }, { id: 2 }],
        rowCount: 2,
        command: 'SELECT',
        oid: 0,
        fields: []
      }
      vi.mocked(mockPool.query).mockResolvedValue(mockResult)

      const stmt = driver.prepare('SELECT * FROM users')
      const result = await stmt.bind().first()

      expect(result).toEqual({ id: 1 })
    })

    it('returns null when no rows', async () => {
      const mockResult: QueryResult = {
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: []
      }
      vi.mocked(mockPool.query).mockResolvedValue(mockResult)

      const stmt = driver.prepare('SELECT * FROM users WHERE id = ?')
      const result = await stmt.bind(999).first()

      expect(result).toBeNull()
    })

    it('returns run result with rowCount', async () => {
      const mockResult: QueryResult = {
        rows: [],
        rowCount: 3,
        command: 'UPDATE',
        oid: 0,
        fields: []
      }
      vi.mocked(mockPool.query).mockResolvedValue(mockResult)

      const stmt = driver.prepare('UPDATE users SET name = ? WHERE id = ?')
      const result = await stmt.bind('updated', 1).run()

      expect(result).toEqual({
        changes: 3,
        lastInsertId: undefined
      })
    })
  })

  describe('batch', () => {
    it('executes multiple statements', async () => {
      const mockResult: QueryResult = {
        rows: [],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: []
      }
      vi.mocked(mockPool.query).mockResolvedValue(mockResult)

      const stmt1 = driver.prepare('INSERT INTO users (name) VALUES (?)').bind('user1')
      const stmt2 = driver.prepare('INSERT INTO users (name) VALUES (?)').bind('user2')

      await driver.batch([stmt1, stmt2])

      expect(mockPool.query).toHaveBeenCalledTimes(2)
    })
  })

  describe('exec', () => {
    it('executes raw SQL', async () => {
      const mockResult: QueryResult = {
        rows: [],
        rowCount: 0,
        command: 'CREATE',
        oid: 0,
        fields: []
      }
      vi.mocked(mockPool.query).mockResolvedValue(mockResult)

      await driver.exec('CREATE TABLE users (id SERIAL PRIMARY KEY)')

      expect(mockPool.query).toHaveBeenCalledWith('CREATE TABLE users (id SERIAL PRIMARY KEY)')
    })
  })

  describe('close', () => {
    it('closes the pool', async () => {
      await driver.close()

      expect(mockPool.end).toHaveBeenCalled()
    })
  })

  describe('dialect', () => {
    it('has postgres dialect', () => {
      expect(driver.dialect.name).toBe('postgres')
    })
  })
})

describe('createPostgresDriver', () => {
  it('creates a driver instance', () => {
    const mockPool: PostgresPoolLike = {
      query: vi.fn(),
      end: vi.fn()
    }

    const driver = createPostgresDriver(mockPool)

    expect(driver).toBeInstanceOf(PostgresDriver)
  })
})
