import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DatabaseDriver } from '../driver/types.js'
import { between, eq, inArray } from '../operators/index.js'
import type { ColumnTransformer, TableMetadata } from '../metadata/types.js'
import { QueryBuilder } from './QueryBuilder.js'

describe('QueryBuilder transformer', () => {
  let mockDb: DatabaseDriver
  let metadata: TableMetadata

  beforeEach(() => {
    const dateTransformer: ColumnTransformer<Date, number> = {
      to: (value) => value.getTime(),
      from: (value) => new Date(value)
    }

    const jsonTransformer: ColumnTransformer<Record<string, unknown>, string> = {
      to: (value) => JSON.stringify(value),
      from: (value) => JSON.parse(value)
    }

    mockDb = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({
            results: [
              { id: 1, createdAt: 1700000000000, payload: '{"ok":true}' }
            ]
          }),
          first: vi.fn().mockResolvedValue({ count: 0 }),
          run: vi.fn().mockResolvedValue({ success: true })
        })
      })
    } as any

    metadata = {
      name: 'events',
      columns: [
        { name: 'id', type: 'INTEGER', primary: true },
        { name: 'createdAt', type: 'INTEGER', transformer: dateTransformer },
        { name: 'payload', type: 'TEXT', transformer: jsonTransformer }
      ],
      relations: []
    }
  })

  it('applies from-transformer when reading rows', async () => {
    const qb = new QueryBuilder<any>(mockDb, metadata)
    const rows = await qb.execute()

    expect(rows[0]?.createdAt).toBeInstanceOf(Date)
    expect((rows[0]?.createdAt as Date).getTime()).toBe(1700000000000)
    expect(rows[0]?.payload).toEqual({ ok: true })
  })

  it('applies to-transformer for where object', async () => {
    const qb = new QueryBuilder<any>(mockDb, metadata)
    const target = new Date(1700000000123)
    await qb.where({ createdAt: target }).execute()

    const prepare = mockDb.prepare as any
    expect(prepare).toHaveBeenCalledWith('SELECT * FROM events WHERE createdAt = ?')
    expect(prepare().bind).toHaveBeenCalledWith(1700000000123)
  })

  it('applies to-transformer for operator bindings', async () => {
    const qb = new QueryBuilder<any>(mockDb, metadata)
    const a = new Date(1700000000001)
    const b = new Date(1700000000002)
    const c = new Date(1700000000003)

    await qb.where(inArray<any>('createdAt', [a, b])).execute()
    await qb.where(between<any>('createdAt', a, c)).execute()
    await qb.where(eq<any>('createdAt', c)).execute()

    const bindCalls = ((mockDb.prepare as any).mock.results as any[])
      .map((result) => result.value.bind)
      .flatMap((bindMock: any) => bindMock.mock.calls)

    expect(bindCalls).toContainEqual([1700000000001, 1700000000002])
    expect(bindCalls).toContainEqual([1700000000001, 1700000000003])
    expect(bindCalls).toContainEqual([1700000000003])
  })

  it('applies to-transformer for batch insert and update', async () => {
    const qb = new QueryBuilder<any>(mockDb, metadata)
    const createdAt = new Date(1700000000456)
    const payload = { key: 'value' }

    await qb.batchInsert([{ id: 1, createdAt, payload }])
    await qb.batchUpdate([
      {
        where: { id: 1 },
        values: { createdAt, payload }
      }
    ])

    const bindCalls = ((mockDb.prepare as any).mock.results as any[])
      .map((result) => result.value.bind)
      .flatMap((bindMock: any) => bindMock.mock.calls)

    expect(bindCalls).toContainEqual([1, 1700000000456, JSON.stringify(payload)])
    expect(bindCalls).toContainEqual([1700000000456, JSON.stringify(payload), 1])
  })
})

