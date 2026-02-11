import { describe, it, expect, vi } from 'vitest'
import { TypeOrmPostgresModule } from './index'

describe('TypeOrmPostgresModule', () => {
  describe('forRoot', () => {
    it('returns a dynamic module', async () => {
      const mockPool = {
        query: vi.fn(),
        end: vi.fn()
      }

      const module = await TypeOrmPostgresModule.forRoot({
        connection: mockPool,
        entities: []
      })

      expect(module).toBeDefined()
    })
  })

  describe('forFeature', () => {
    it('returns a dynamic module', () => {
      class TestEntity {}

      const module = TypeOrmPostgresModule.forFeature([TestEntity])

      expect(module).toBeDefined()
    })
  })
})
