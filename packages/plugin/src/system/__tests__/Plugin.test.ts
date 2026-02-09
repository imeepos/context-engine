import { describe, it, expect } from 'vitest'
import type { Plugin, PluginContext } from '../Plugin'
import React from 'react'

describe('Plugin', () => {
  describe('基本插件实现', () => {
    it('应该能够创建一个最小的插件', () => {
      // 定义一个最小的插件
      const minimalPlugin: Plugin = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        component: () => React.createElement('div', null, 'Hello Plugin')
      }

      // 验证插件属性
      expect(minimalPlugin.id).toBe('test-plugin')
      expect(minimalPlugin.name).toBe('Test Plugin')
      expect(minimalPlugin.version).toBe('1.0.0')
      expect(minimalPlugin.component).toBeDefined()
    })

    it('应该支持可选的描述字段', () => {
      const pluginWithDescription: Plugin = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        description: 'A test plugin',
        component: () => React.createElement('div', null, 'Hello')
      }

      expect(pluginWithDescription.description).toBe('A test plugin')
    })

    it('应该支持可选的路由字段', () => {
      const pluginWithRoutes: Plugin = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        component: () => React.createElement('div', null, 'Main'),
        routes: [
          {
            path: '/settings',
            component: () => React.createElement('div', null, 'Settings')
          }
        ]
      }

      expect(pluginWithRoutes.routes).toHaveLength(1)
      expect(pluginWithRoutes.routes![0].path).toBe('/settings')
    })
  })

  describe('生命周期钩子', () => {
    it('应该支持 onInstall 钩子', async () => {
      let installed = false

      const plugin: Plugin = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        component: () => React.createElement('div', null, 'Hello'),
        onInstall: async (context: PluginContext) => {
          installed = true
        }
      }

      const mockContext: PluginContext = {
        agentId: 'agent-1',
        userId: 'user-1',
        storage: {
          read: async () => null,
          write: async () => {},
          delete: async () => {},
          exists: async () => false
        },
        injector: {} as any
      }

      await plugin.onInstall!(mockContext)
      expect(installed).toBe(true)
    })

    it('应该支持 onActivate 钩子', async () => {
      let activated = false

      const plugin: Plugin = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        component: () => React.createElement('div', null, 'Hello'),
        onActivate: async (context: PluginContext) => {
          activated = true
        }
      }

      const mockContext: PluginContext = {
        agentId: 'agent-1',
        userId: 'user-1',
        storage: {
          read: async () => null,
          write: async () => {},
          delete: async () => {},
          exists: async () => false
        },
        injector: {} as any
      }

      await plugin.onActivate!(mockContext)
      expect(activated).toBe(true)
    })
  })
})
