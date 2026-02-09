import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { PluginContextProvider } from './PluginContextProvider'
import { usePluginData } from './hooks'
import { PluginContext } from './context'
import type { LoadedPlugin } from './types'
import { EnvironmentInjector } from '@sker/core'

describe('PluginContextProvider', () => {
  it('should provide plugin context to children', () => {
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

    function TestComponent() {
      const data = usePluginData<{ message: string }>()
      return <div>{data.message}</div>
    }

    render(
      <PluginContextProvider plugin={mockPlugin} data={{ message: 'Hello Plugin' }}>
        <TestComponent />
      </PluginContextProvider>
    )

    expect(screen.getByText('Hello Plugin')).toBeDefined()
  })

  it('should provide injector to children', () => {
    class TestService {
      getValue() {
        return 'service-value'
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

    function TestComponent() {
      const context = React.useContext(PluginContext)
      const service = context?.injector?.get(TestService)
      return <div>{service?.getValue()}</div>
    }

    render(
      <PluginContextProvider plugin={mockPlugin} injector={injector}>
        <TestComponent />
      </PluginContextProvider>
    )

    expect(screen.getByText('service-value')).toBeDefined()
  })

  it('should render children', () => {
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

    render(
      <PluginContextProvider plugin={mockPlugin}>
        <div>Child Content</div>
      </PluginContextProvider>
    )

    expect(screen.getByText('Child Content')).toBeDefined()
  })
})
