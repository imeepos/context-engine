import { describe, it, expect, beforeEach } from 'vitest'
import { Module, Injectable, Inject, createPlatform } from '@sker/core'
import { PLUGINS } from '../tokens'
import type { Plugin } from '../Plugin'
import React from 'react'

describe('PluginModule', () => {
  describe('插件注册', () => {
    it('应该能够通过 multi 注入注册多个插件', async () => {
      // 定义两个测试插件
      @Injectable({ providedIn: 'root' })
      class TestPlugin1 implements Plugin {
        readonly id = 'plugin-1'
        readonly name = 'Plugin 1'
        readonly version = '1.0.0'
        readonly component = () => React.createElement('div', null, 'Plugin 1')
      }

      @Injectable({ providedIn: 'root' })
      class TestPlugin2 implements Plugin {
        readonly id = 'plugin-2'
        readonly name = 'Plugin 2'
        readonly version = '1.0.0'
        readonly component = () => React.createElement('div', null, 'Plugin 2')
      }

      // 创建测试模块
      @Module({
        providers: [
          { provide: PLUGINS, useClass: TestPlugin1, multi: true },
          { provide: PLUGINS, useClass: TestPlugin2, multi: true }
        ]
      })
      class TestModule {}

      // 创建平台并引导应用
      const platform = createPlatform()
      const app = platform.bootstrapApplication()
      await app.bootstrap(TestModule)

      // 获取所有注册的插件
      const plugins = app.injector.get(PLUGINS)

      // 验证
      expect(plugins).toHaveLength(2)
      expect(plugins[0].id).toBe('plugin-1')
      expect(plugins[1].id).toBe('plugin-2')
    })

    it('应该能够获取单个插件实例', async () => {
      @Injectable({ providedIn: 'root' })
      class TestPlugin implements Plugin {
        readonly id = 'test-plugin'
        readonly name = 'Test Plugin'
        readonly version = '1.0.0'
        readonly component = () => React.createElement('div', null, 'Test')
      }

      @Module({
        providers: [
          { provide: PLUGINS, useClass: TestPlugin, multi: true }
        ]
      })
      class TestModule {}

      const platform = createPlatform()
      const app = platform.bootstrapApplication()
      await app.bootstrap(TestModule)

      const plugins = app.injector.get(PLUGINS)
      const plugin = plugins[0]

      expect(plugin).toBeInstanceOf(TestPlugin)
      expect(plugin.id).toBe('test-plugin')
    })
  })
})
