import type { ComponentType } from 'react'
import type { EnvironmentInjector } from '@sker/core'

/**
 * 插件上下文 - 提供给插件的运行时环境
 */
export interface PluginContext {
  agentId: string
  userId: string
  storage: PluginStorage
  injector: EnvironmentInjector
}

/**
 * 插件专属存储接口
 */
export interface PluginStorage {
  read<T>(key: string): Promise<T | null>
  write<T>(key: string, data: T): Promise<void>
  delete(key: string): Promise<void>
  exists(key: string): Promise<boolean>
}

/**
 * 插件路由定义
 */
export interface PluginRoute {
  path: string
  component: ComponentType<any>
}

/**
 * 插件接口
 *
 * 插件通过 React 组件定义其能力：
 * - component: 主页面组件，可以包含 <Tool> 组件来暴露工具
 * - routes: 子路由页面
 */
export interface Plugin {
  readonly id: string
  readonly name: string
  readonly version: string
  readonly description?: string

  // 主页面组件（可以包含 <Tool> 组件）
  readonly component: ComponentType<any>

  // 子路由（可选）
  readonly routes?: PluginRoute[]

  // 生命周期钩子
  onInstall?(context: PluginContext): Promise<void>
  onUninstall?(context: PluginContext): Promise<void>
  onActivate?(context: PluginContext): Promise<void>
  onDeactivate?(context: PluginContext): Promise<void>
}
