import type { Plugin } from './Plugin.js'

/**
 * 插件验证器
 * 负责验证插件的有效性和安全性
 */
export class PluginValidator {
  /**
   * 验证插件对象
   */
  validatePlugin(plugin: Plugin): void {
    // 验证必需字段
    if (!plugin.id) {
      throw new Error('Plugin must have an id')
    }

    if (!plugin.name) {
      throw new Error('Plugin must have a name')
    }

    if (!plugin.version) {
      throw new Error('Plugin must have a version')
    }

    if (!plugin.component) {
      throw new Error('Plugin must have a component')
    }

    // 验证 version 是有效的 semver
    if (!this.isValidSemver(plugin.version)) {
      throw new Error('Plugin version must be valid semver')
    }
  }

  /**
   * 验证插件源码安全性
   */
  validatePluginSource(sourceCode: string): void {
    // 检测危险模式
    const dangerousPatterns = [
      { pattern: /\beval\s*\(/, message: 'eval' },
      { pattern: /\bFunction\s*\(/, message: 'Function constructor' },
      { pattern: /require\s*\(\s*['"]child_process['"]/, message: 'child_process' },
      { pattern: /import\s+.*\s+from\s+['"]child_process['"]/, message: 'child_process' },
      { pattern: /\bprocess\.exit\s*\(/, message: 'process.exit' },
      { pattern: /\bfs\.rmSync\b/, message: 'fs.rmSync' },
      { pattern: /\bfs\.unlinkSync\b/, message: 'fs.unlinkSync' }
    ]

    for (const { pattern, message } of dangerousPatterns) {
      if (pattern.test(sourceCode)) {
        throw new Error(`Dangerous code detected: ${message}`)
      }
    }
  }

  /**
   * 验证是否为有效的 semver 版本
   */
  private isValidSemver(version: string): boolean {
    // Semver 正则表达式
    const semverRegex = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z-.]+)?(?:\+[0-9A-Za-z-.]+)?$/
    return semverRegex.test(version)
  }
}
