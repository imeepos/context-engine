import { InjectionToken, Type } from '@sker/core'
import type { Plugin } from './Plugin.js'

/**
 * 插件注入 Token
 * 使用 multi: true 允许注册多个插件
 */
export const PLUGINS = new InjectionToken<Type<Plugin>>('PLUGINS')
