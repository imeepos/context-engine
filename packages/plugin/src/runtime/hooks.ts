import { useContext } from 'react'
import { PluginContext } from './context.js'

/**
 * 获取插件数据
 */
export function usePluginData<T = any>(): T {
  const context = useContext(PluginContext)

  if (!context) {
    throw new Error('usePluginData must be used within PluginContextProvider')
  }

  return context.data as T
}

/**
 * 获取插件服务
 */
export function usePluginService<T>(serviceType: new (...args: any[]) => T): T {
  const context = useContext(PluginContext)

  if (!context) {
    throw new Error('usePluginService must be used within PluginContextProvider')
  }

  if (!context.injector) {
    throw new Error('Injector not available in plugin context')
  }

  return context.injector.get(serviceType)
}
