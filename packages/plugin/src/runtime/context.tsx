import { createContext } from 'react'
import type { LoadedPlugin } from './types.js'
import type { Injector } from '@sker/core'

/**
 * 插件上下文接口
 */
export interface PluginContextValue {
  plugin: LoadedPlugin
  injector?: Injector
  data?: any
}

/**
 * 插件上下文
 */
export const PluginContext = createContext<PluginContextValue | null>(null)
