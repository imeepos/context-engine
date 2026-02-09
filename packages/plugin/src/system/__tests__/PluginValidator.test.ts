import { describe, it, expect, vi } from 'vitest'
import { PluginValidator } from '../PluginValidator.js'
import type { Plugin } from '../Plugin.js'
import React from 'react'

describe('PluginValidator', () => {
  describe('validatePlugin', () => {
    it('应该验证插件的基本字段', () => {
      const validator = new PluginValidator()

      const validPlugin: Plugin = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        component: () => React.createElement('div', null, 'Test')
      }

      // 不应该抛出错误
      expect(() => validator.validatePlugin(validPlugin)).not.toThrow()
    })

    it('应该拒绝缺少 id 的插件', () => {
      const validator = new PluginValidator()

      const invalidPlugin = {
        name: 'Test Plugin',
        version: '1.0.0',
        component: () => React.createElement('div', null, 'Test')
      } as Plugin

      expect(() => validator.validatePlugin(invalidPlugin)).toThrow('Plugin must have an id')
    })

    it('应该拒绝缺少 name 的插件', () => {
      const validator = new PluginValidator()

      const invalidPlugin = {
        id: 'test-plugin',
        version: '1.0.0',
        component: () => React.createElement('div', null, 'Test')
      } as Plugin

      expect(() => validator.validatePlugin(invalidPlugin)).toThrow('Plugin must have a name')
    })

    it('应该拒绝缺少 version 的插件', () => {
      const validator = new PluginValidator()

      const invalidPlugin = {
        id: 'test-plugin',
        name: 'Test Plugin',
        component: () => React.createElement('div', null, 'Test')
      } as Plugin

      expect(() => validator.validatePlugin(invalidPlugin)).toThrow('Plugin must have a version')
    })

    it('应该拒绝缺少 component 的插件', () => {
      const validator = new PluginValidator()

      const invalidPlugin = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0'
      } as Plugin

      expect(() => validator.validatePlugin(invalidPlugin)).toThrow('Plugin must have a component')
    })

    it('应该验证 version 是有效的 semver', () => {
      const validator = new PluginValidator()

      const invalidPlugin: Plugin = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: 'invalid-version',
        component: () => React.createElement('div', null, 'Test')
      }

      expect(() => validator.validatePlugin(invalidPlugin)).toThrow('Plugin version must be valid semver')
    })

    it('应该接受有效的 semver 版本', () => {
      const validator = new PluginValidator()

      const validVersions = ['1.0.0', '1.2.3', '0.0.1', '1.0.0-alpha', '1.0.0+build']

      validVersions.forEach(version => {
        const plugin: Plugin = {
          id: 'test-plugin',
          name: 'Test Plugin',
          version,
          component: () => React.createElement('div', null, 'Test')
        }

        expect(() => validator.validatePlugin(plugin)).not.toThrow()
      })
    })
  })

  describe('validatePluginSource', () => {
    it('应该检测危险的 eval 函数', () => {
      const validator = new PluginValidator()

      const dangerousCode = `
        export default class MyPlugin {
          execute() {
            eval('console.log("dangerous")')
          }
        }
      `

      expect(() => validator.validatePluginSource(dangerousCode)).toThrow('Dangerous code detected: eval')
    })

    it('应该检测危险的 Function 构造函数', () => {
      const validator = new PluginValidator()

      const dangerousCode = `
        export default class MyPlugin {
          execute() {
            new Function('return 1')()
          }
        }
      `

      expect(() => validator.validatePluginSource(dangerousCode)).toThrow('Dangerous code detected: Function constructor')
    })

    it('应该检测 child_process 导入', () => {
      const validator = new PluginValidator()

      const dangerousCode = `
        import { exec } from 'child_process'
        export default class MyPlugin {}
      `

      expect(() => validator.validatePluginSource(dangerousCode)).toThrow('Dangerous code detected: child_process')
    })

    it('应该检测 process.exit 调用', () => {
      const validator = new PluginValidator()

      const dangerousCode = `
        export default class MyPlugin {
          execute() {
            process.exit(1)
          }
        }
      `

      expect(() => validator.validatePluginSource(dangerousCode)).toThrow('Dangerous code detected: process.exit')
    })

    it('应该允许安全的代码', () => {
      const validator = new PluginValidator()

      const safeCode = `
        export default class MyPlugin {
          execute() {
            console.log('Hello, World!')
            return { success: true }
          }
        }
      `

      expect(() => validator.validatePluginSource(safeCode)).not.toThrow()
    })
  })
})
