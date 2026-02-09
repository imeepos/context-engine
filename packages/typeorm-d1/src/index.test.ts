import { describe, expect, it, vi } from 'vitest'
import { D1Driver } from './index.js'

describe('D1Driver', () => {
  it('delegates prepare to underlying db', () => {
    const db = {
      prepare: vi.fn()
    } as any

    const driver = new D1Driver(db)
    driver.prepare('SELECT 1')

    expect(db.prepare).toHaveBeenCalledWith('SELECT 1')
  })
})
