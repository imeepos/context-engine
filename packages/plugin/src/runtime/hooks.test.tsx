import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import React from 'react'
import { usePluginData, usePluginService } from './hooks'
import { PluginContext } from './context'
import type { LoadedPlugin } from './types'
import { EnvironmentInjector } from '@sker/core'

describe('Plugin Hooks', () => {
  describe('usePluginData', () => {
    it('should return plugin data from context', () => {
      const mockPlugin: LoadedPlugin = {
        id: 'test-plugin',
        config: {
          metadata: {
            id: 'test-plugin',
            name: 'Test Plugin',
            version: '1.0.0',
            description: 'Test'
          },
          routes: [],
          navigation: []
        },
        module: {}
      }

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <PluginContext.Provider value={{ plugin: mockPlugin, data: { count: 42 } }}>
          {children}
        </PluginContext.Provider>
      )

      const { result } = renderHook(() => usePluginData<{ count: number }>(), { wrapper })

      expect(result.current).toEqual({ count: 42 })
    })

    it('should throw error when used outside PluginContext', () => {
      expect(() => {
        renderHook(() => usePluginData())
      }).toThrow('usePluginData must be used within PluginContextProvider')
    })
  })

  describe('usePluginService', () => {
    it('should return service from injector', () => {
      class TestService {
        getValue() {
          return 'test-value'
        }
      }

      const injector = EnvironmentInjector.createFeatureInjector([
        { provide: TestService, useClass: TestService }
      ])

      const mockPlugin: LoadedPlugin = {
        id: 'test-plugin',
        config: {
          metadata: {
            id: 'test-plugin',
            name: 'Test Plugin',
            version: '1.0.0',
            description: 'Test'
          },
          routes: [],
          navigation: []
        },
        module: {}
      }

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <PluginContext.Provider value={{ plugin: mockPlugin, injector }}>
          {children}
        </PluginContext.Provider>
      )

      const { result } = renderHook(() => usePluginService(TestService), { wrapper })

      expect(result.current.getValue()).toBe('test-value')
    })

    it('should throw error when used outside PluginContext', () => {
      class TestService {}

      expect(() => {
        renderHook(() => usePluginService(TestService))
      }).toThrow('usePluginService must be used within PluginContextProvider')
    })
  })
})
