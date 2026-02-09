import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Repository } from './Repository.js'
import { TableMetadata } from '../metadata/types.js'

describe('Repository pagination', () => {
  let repository: Repository<any>

  beforeEach(() => {
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({ results: [{ id: 1 }, { id: 2 }] }),
          first: vi.fn().mockResolvedValue({ count: 2, value: 2 }),
          run: vi.fn().mockResolvedValue({ success: true })
        })
      })
    } as any

    const metadata: TableMetadata = {
      name: 'users',
      columns: [{ name: 'id', type: 'INTEGER', primary: true }],
      relations: []
    }

    repository = new Repository<any>(mockDb, metadata)
  })

  it('supports findAndCount', async () => {
    const [rows, total] = await repository.findAndCount({ limit: 10 })
    expect(rows.length).toBeGreaterThan(0)
    expect(total).toBe(2)
  })

  it('supports page pagination', async () => {
    const page = await repository.findPage({ page: 1, size: 2 })
    expect(page.page).toBe(1)
    expect(page.size).toBe(2)
  })

  it('supports cursor pagination', async () => {
    const page = await repository.findCursorPage({ size: 1, orderBy: 'id' })
    expect(page.data.length).toBe(1)
    expect(page.hasNext).toBe(true)
  })
})
