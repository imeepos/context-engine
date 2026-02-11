import { describe, expect, it, vi } from 'vitest'
import { MigrationExecutor } from './MigrationExecutor.js'
import type { MigrationRecord } from './types.js'

class CreateUsers1700000000000 {
  readonly timestamp = 1700000000000
  readonly name = 'CreateUsers'
  async up(): Promise<void> {}
  async down(): Promise<void> {}
}

class AddEmail1700000001000 {
  readonly timestamp = 1700000001000
  readonly name = 'AddEmail'
  async up(): Promise<void> {}
  async down(): Promise<void> {}
}

describe('MigrationExecutor', () => {
  it('executes pending migrations in timestamp order', async () => {
    const storage = {
      ensureTable: vi.fn().mockResolvedValue(undefined),
      getExecuted: vi.fn().mockResolvedValue([]),
      insert: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined)
    } as any

    const runner = {
      executeUp: vi
        .fn()
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(7),
      executeDown: vi.fn().mockResolvedValue(3)
    } as any

    const executor = new MigrationExecutor(storage, runner, [
      AddEmail1700000001000 as any,
      CreateUsers1700000000000 as any
    ])

    await executor.executePending()

    expect(storage.ensureTable).toHaveBeenCalledTimes(1)
    expect(runner.executeUp).toHaveBeenCalledTimes(2)
    expect(runner.executeUp.mock.calls[0][0].name).toBe('CreateUsers')
    expect(runner.executeUp.mock.calls[1][0].name).toBe('AddEmail')
    expect(storage.insert).toHaveBeenCalledTimes(2)
  })

  it('reverts latest executed migrations', async () => {
    const executed: MigrationRecord[] = [
      {
        id: 1,
        timestamp: 1700000000000,
        name: 'CreateUsers',
        executed_at: '2026-01-01T00:00:00.000Z',
        execution_time: 5
      },
      {
        id: 2,
        timestamp: 1700000001000,
        name: 'AddEmail',
        executed_at: '2026-01-01T00:01:00.000Z',
        execution_time: 7
      }
    ]

    const storage = {
      ensureTable: vi.fn().mockResolvedValue(undefined),
      getExecuted: vi.fn().mockResolvedValue(executed),
      insert: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined)
    } as any

    const runner = {
      executeUp: vi.fn().mockResolvedValue(5),
      executeDown: vi.fn().mockResolvedValue(4)
    } as any

    const executor = new MigrationExecutor(storage, runner, [
      CreateUsers1700000000000 as any,
      AddEmail1700000001000 as any
    ])

    await executor.revert(2)

    expect(runner.executeDown).toHaveBeenCalledTimes(2)
    expect(runner.executeDown.mock.calls[0][0].name).toBe('AddEmail')
    expect(runner.executeDown.mock.calls[1][0].name).toBe('CreateUsers')
    expect(storage.delete).toHaveBeenCalledWith(1700000001000)
    expect(storage.delete).toHaveBeenCalledWith(1700000000000)
  })

  it('returns status list with executed metadata', async () => {
    const executed: MigrationRecord[] = [
      {
        id: 1,
        timestamp: 1700000000000,
        name: 'CreateUsers',
        executed_at: '2026-01-01T00:00:00.000Z',
        execution_time: 5
      }
    ]

    const storage = {
      ensureTable: vi.fn().mockResolvedValue(undefined),
      getExecuted: vi.fn().mockResolvedValue(executed),
      insert: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined)
    } as any

    const runner = {
      executeUp: vi.fn().mockResolvedValue(5),
      executeDown: vi.fn().mockResolvedValue(4)
    } as any

    const executor = new MigrationExecutor(storage, runner, [
      CreateUsers1700000000000 as any,
      AddEmail1700000001000 as any
    ])

    const status = await executor.showStatus()
    expect(status).toHaveLength(2)
    expect(status[0]).toMatchObject({
      name: 'CreateUsers',
      executed: true,
      executedAt: '2026-01-01T00:00:00.000Z',
      executionTime: 5
    })
    expect(status[1]).toMatchObject({
      name: 'AddEmail',
      executed: false
    })
  })
})

