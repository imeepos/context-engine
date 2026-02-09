import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Injectable, Inject } from '@sker/core'
import { PluginLoader } from '../PluginLoader'
import { PLUGINS } from '../tokens'
import type { Plugin, PluginStorage } from '../Plugin'
import React from 'react'

describe('PluginLoader', () => {
  let mockStorage: PluginStorage
  let mockRouter: any

  beforeEach(() => {
    // Mock storage
    mockStorage = {
      read: vi.fn(),
      write: vi.fn(),
      delete: vi.fn(),
      exists: vi.fn()
    }

    // Mock router
    mockRouter = {
      addRoute: vi.fn()
    }
  })

  describe('loadInstalledPlugins', () => {
    it('应该从存储中读取已安装的插件列表', async () => {
      const mockInstalls = [
        {
          plugin_id: 'plugin-1',
          agent_id: 'agent-1',
          user_id: 'user-1',
          installed_version: '1.0.0'
        }
      ]

      mockStorage.read = vi.fn().mockResolvedValue(mockInstalls)

      @Injectable({ providedIn: 'root' })
      class TestPlugin implements Plugin {
        readonly id = 'plugin-1'
        readonly name = 'Test Plugin'
        readonly version = '1.0.0'
        readonly component = () => React.createElement('div', null, 'Test')
      }

      const loader = new PluginLoader(
        [new TestPlugin()],
        mockStorage,
        mockRouter,
        {} as any
      )

      await loader.loadInstalledPlugins('agent-1')

      // 验证读取了正确的存储键
      expect(mockStorage.read).toHaveBeenCalledWith('plugin_installs?agent_id=agent-1')
    })

    it('应该为每个已安装的插件注册路由', async () => {
      const mockInstalls = [
        {
          plugin_id: 'plugin-1',
          agent_id: 'agent-1',
          user_id: 'user-1',
          installed_version: '1.0.0'
        }
      ]

      mockStorage.read = vi.fn().mockResolvedValue(mockInstalls)

      @Injectable({ providedIn: 'root' })
      class TestPlugin implements Plugin {
        readonly id = 'plugin-1'
        readonly name = 'Test Plugin'
        readonly version = '1.0.0'
        readonly component = () => React.createElement('div', null, 'Main')
        readonly routes = [
          {
            path: '/settings',
            component: () => React.createElement('div', null, 'Settings')
          }
        ]
      }

      const loader = new PluginLoader(
        [new TestPlugin()],
        mockStorage,
        mockRouter,
        {} as any
      )

      await loader.loadInstalledPlugins('agent-1')

      // 验证注册了路由
      expect(mockRouter.addRoute).toHaveBeenCalledWith({
        path: '/plugin/plugin-1/settings',
        component: expect.any(Function)
      })
    })

    it('应该调用插件的 onActivate 钩子', async () => {
      const mockInstalls = [
        {
          plugin_id: 'plugin-1',
          agent_id: 'agent-1',
          user_id: 'user-1',
          installed_version: '1.0.0'
        }
      ]

      mockStorage.read = vi.fn().mockResolvedValue(mockInstalls)

      const onActivateSpy = vi.fn()

      @Injectable({ providedIn: 'root' })
      class TestPlugin implements Plugin {
        readonly id = 'plugin-1'
        readonly name = 'Test Plugin'
        readonly version = '1.0.0'
        readonly component = () => React.createElement('div', null, 'Test')
        onActivate = onActivateSpy
      }

      const loader = new PluginLoader(
        [new TestPlugin()],
        mockStorage,
        mockRouter,
        {} as any
      )

      await loader.loadInstalledPlugins('agent-1')

      // 验证调用了 onActivate
      expect(onActivateSpy).toHaveBeenCalledWith({
        agentId: 'agent-1',
        userId: 'user-1',
        storage: expect.any(Object),
        injector: expect.any(Object)
      })
    })

    it('应该跳过未安装的插件', async () => {
      const mockInstalls = [
        {
          plugin_id: 'plugin-2',  // 不存在的插件
          agent_id: 'agent-1',
          user_id: 'user-1',
          installed_version: '1.0.0'
        }
      ]

      mockStorage.read = vi.fn().mockResolvedValue(mockInstalls)

      @Injectable({ providedIn: 'root' })
      class TestPlugin implements Plugin {
        readonly id = 'plugin-1'
        readonly name = 'Test Plugin'
        readonly version = '1.0.0'
        readonly component = () => React.createElement('div', null, 'Test')
      }

      const loader = new PluginLoader(
        [new TestPlugin()],
        mockStorage,
        mockRouter,
        {} as any
      )

      // 不应该抛出错误
      await expect(loader.loadInstalledPlugins('agent-1')).resolves.not.toThrow()

      // 不应该注册任何路由
      expect(mockRouter.addRoute).not.toHaveBeenCalled()
    })
  })
})
