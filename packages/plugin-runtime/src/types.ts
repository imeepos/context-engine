import type { Injector } from '@sker/core'
import type { ReactElement } from 'react'

/**
 * 插件元数据
 */
export interface PluginMetadata {
  id: string
  name: string
  version: string
  description: string
}

/**
 * 路由配置
 */
export interface RouteConfig {
  path: string
  component: (props: PageProps) => Promise<ReactElement | null>
  title: string
}

/**
 * 导航项
 */
export interface NavigationItem {
  path: string
  label: string
  icon?: string
}

/**
 * 全局工具配置
 */
export interface GlobalToolConfig {
  name: string
  handler: (params?: any) => Promise<any>
}

/**
 * 插件配置
 */
export interface PluginConfig {
  metadata: PluginMetadata
  routes: RouteConfig[]
  navigation: NavigationItem[]
  globalTools?: GlobalToolConfig[]
}

/**
 * 页面组件属性
 */
export interface PageProps {
  injector: Injector
  params: Record<string, string>
  plugin: LoadedPlugin
}

/**
 * 已加载的插件
 */
export interface LoadedPlugin {
  id: string
  config: PluginConfig
  module: any
}
