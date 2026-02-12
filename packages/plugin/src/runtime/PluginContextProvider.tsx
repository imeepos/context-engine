import React from 'react'
import { PluginContext } from './context.js'
import type { LoadedPlugin } from './types.js'
import type { Injector } from '@sker/core'

export interface PluginContextProviderProps {
  plugin: LoadedPlugin
  injector?: Injector
  data?: any
  children: React.ReactNode
}

/**
 * 插件上下文提供者
 */
export function PluginContextProvider({
  plugin,
  injector,
  data,
  children
}: PluginContextProviderProps) {
  return (
    <PluginContext.Provider value={{ plugin, injector, data }}>
      {children}
    </PluginContext.Provider>
  )
}
